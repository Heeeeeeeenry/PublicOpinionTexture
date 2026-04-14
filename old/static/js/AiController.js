/**
 * AI聊天控制器
 *
 * 提供可复用的AI聊天核心功能，包括：
 * - 后端流式请求
 * - 流式渲染回调
 * - 解析大模型命令
 * - 立即中断流式传输
 *
 * 注意：此类只负责接收和解析chunk，渲染由调用方处理
 *
 * 使用示例：
 * const aiController = new AIController();
 * await aiController.sendMessage(messages, {
 *     onChunk: (char) => { ... },  // 每次接收到一个字符
 *     onStreamComplete: (fullResponse) => { ... },
 *     onCommandReceived: (commands) => { ... }
 * });
 */

class AIController {
    /**
     * 构造函数
     */
    constructor() {
        this.isProcessing = false;
        this.abortController = null;
        this.lastAIResponse = '';
        this.lastAICommand = null;
    }

    /**
     * 发送消息到AI
     * @param {Array} messages - 消息列表（已包含用户消息）
     * @param {Object} callbacks - 回调函数
     * @param {Function} callbacks.onChunk - 接收到字符时的回调 (char) => {}
     * @param {Function} callbacks.onStreamComplete - 流式接收完成时的回调 (fullResponse) => {}
     * @param {Function} callbacks.onCommandReceived - 接收到AI命令时的回调 (commands) => {}
     * @param {Function} callbacks.onError - 发生错误时的回调 (error) => {}
     * @returns {Promise<string>} 完整的AI回复（原始文本）
     */
    async sendMessage(messages, callbacks = {}) {
        if (this.isProcessing) {
            console.warn('[AIController] 正在处理中，请稍后再试');
            return null;
        }

        this.isProcessing = true;
        this.abortController = new AbortController();

        const { onChunk, onStreamComplete, onCommandReceived, onError } = callbacks;

        try {
            const fullResponse = await this.callAIStream(
                messages,
                (char) => {
                    // 将解析后的字符传递给调用者
                    if (onChunk) {
                        onChunk(char);
                    }
                },
                (fullResponse) => {
                    // 流式接收完成后的回调
                    console.log('[AIController] AI回复完成');
                    if (onStreamComplete) {
                        onStreamComplete(fullResponse);
                    }
                },
                onCommandReceived
            );

            return fullResponse;
        } catch (error) {
            // 如果是中断错误，不调用错误回调
            if (error.name === 'AbortError') {
                console.log('[AIController] 流式传输已中断');
                return null;
            }

            // 忽略 ERR_ABORTED 错误（通常是流式响应正常结束时的浏览器行为）
            if (error.message && error.message.includes('ERR_ABORTED')) {
                console.log('[AIController] 流式响应已结束');
                return null;
            }

            console.error('[AIController] AI调用失败:', error);

            if (onError) {
                onError(error);
            }

            return null;
        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    /**
     * 调用AI流式接口
     * @param {Array} messages - 消息列表
     * @param {Function} onChar - 接收到字符时的回调 (char) => {}
     * @param {Function} onComplete - 接收完成时的回调 (fullResponse) => {}
     * @param {Function} onCommandReceived - 接收到AI命令时的回调 (commands) => {}
     * @returns {Promise<string>} 完整的AI回复
     */
    async callAIStream(messages, onChar, onComplete, onCommandReceived) {
        // 保存当前的abortController引用，防止在请求过程中被清空
        const currentAbortController = this.abortController;

        try {
            const response = await fetch('/api/llm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: currentAbortController?.signal,
                body: JSON.stringify({
                    order: 'chat_stream',
                    args: {
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 2000
                    }
                })
            });

            if (!response.ok) {
                throw new Error('AI调用失败');
            }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let isInCommand = false;  // 是否处于JSON命令区域内

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            let content = '';
                            if (parsed.chunk) {
                                content = parsed.chunk;
                            } else if (parsed.choices?.[0]?.delta?.content) {
                                content = parsed.choices[0].delta.content;
                            }
                            if (content) {
                                // 处理content中可能包含的^字符
                                let remainingContent = content;

                                while (remainingContent.length > 0) {
                                    // 查找^字符的位置
                                    const caretIndex = remainingContent.indexOf('^');

                                    if (caretIndex === -1) {
                                        // 没有^字符，全部内容根据当前状态处理
                                        if (!isInCommand && onChar) {
                                            for (const char of remainingContent) {
                                                onChar(char);
                                            }
                                        }
                                        fullContent += remainingContent;
                                        break;
                                    } else {
                                        // 有^字符，先处理^之前的部分
                                        const beforeCaret = remainingContent.substring(0, caretIndex);
                                        if (!isInCommand && onChar) {
                                            for (const char of beforeCaret) {
                                                onChar(char);
                                            }
                                        }
                                        fullContent += beforeCaret;

                                        // 处理^字符本身（不传递给调用者，只切换状态）
                                        fullContent += '^';
                                        isInCommand = !isInCommand;

                                        // 继续处理^之后的部分
                                        remainingContent = remainingContent.substring(caretIndex + 1);
                                    }
                                }
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        // 处理完整回复，提取json命令
        this.processAIResponse(fullContent);

        // 处理AI命令
        if (this.lastAICommand && onCommandReceived) {
            onCommandReceived(this.lastAICommand);
        }

        // 传递给调用者的完整回复（已过滤掉JSON命令）
        const displayContent = fullContent.replace(/\^json:.*?\^/g, '');
        if (onComplete) {
            onComplete(displayContent);
        }

        return fullContent;
        } catch (error) {
            // 如果是手动中断，不抛出错误
            if (error.name === 'AbortError') {
                console.log('[AIController] 请求被中断');
                throw error;
            }
            // 其他错误直接抛出
            throw error;
        }
    }

    /**
     * 立即中断流式传输
     */
    abortStream() {
        if (this.abortController) {
            this.abortController.abort();
            console.log('[AIController] 流式传输已手动中断');
        }
    }

    /**
     * 处理AI回复，提取json命令
     * @param {string} fullResponse - 完整的AI回复
     */
    processAIResponse(fullResponse) {
        // 保存完整回复
        this.lastAIResponse = fullResponse;

        // 清除空格、回车、制表符
        const cleanedResponse = fullResponse.replace(/\s/g, '');

        // 使用正则表达式匹配^json:和^中的内容
        const jsonRegex = /\^json:(.*?)\^/;
        const match = cleanedResponse.match(jsonRegex);

        if (match && match[1]) {
            try {
                // 尝试解析json命令
                this.lastAICommand = JSON.parse(match[1]);
                console.log('[AIController] 提取到AI命令:', this.lastAICommand);
            } catch (e) {
                console.error('[AIController] 解析AI命令失败:', e);
                this.lastAICommand = null;
            }
        } else {
            this.lastAICommand = null;
        }
    }

    /**
     * 获取最后一次AI回复
     * @returns {string} 完整回复内容
     */
    getLastResponse() {
        return this.lastAIResponse;
    }

    /**
     * 获取最后一次AI命令
     * @returns {Object|null} AI命令对象
     */
    getLastCommand() {
        return this.lastAICommand;
    }

    /**
     * 检查是否正在处理中
     * @returns {boolean} 是否正在处理
     */
    isBusy() {
        return this.isProcessing;
    }
}

// 挂载到全局
window.AIController = AIController;
