/**
 * 核查工作台控制器
 *
 * 负责核查工作台的初始化、主要逻辑控制和事件绑定
 * 使用通用动画WpAnimation和通用样式
 */

class AuditController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.letters = {};
        this.selectedLetter = null;
        this.letterInfo = {};
        this.pollingInterval = null;
        this.isPolling = false;
        this.prompt = [];
        this.historyMessages = [];
        this.aiController = null;
        this.isRenderingMessages = false;
        this.renderAbortController = null;
    }

    setDetailPanelDisabled(disabled) {
        const detailPanel = this.container.querySelector('#letter-detail-panel');
        if (!detailPanel) return;

        if (disabled) {
            detailPanel.classList.add('disabled');
            detailPanel.style.pointerEvents = 'none';
            detailPanel.style.userSelect = 'none';
            detailPanel.style.opacity = '0.6';
        } else {
            detailPanel.classList.remove('disabled');
            detailPanel.style.pointerEvents = '';
            detailPanel.style.userSelect = '';
            detailPanel.style.opacity = '1';

            const textElements = detailPanel.querySelectorAll('.wp-text-animate');
            textElements.forEach(el => {
                el.classList.remove('fading-out', 'fading-in');
                el.classList.add('visible');
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });
        }
    }

    async init(container) {
        this.container = container;
        await this.renderHTML();
        this.prompt = await AuditTools.getSystemPrompts();
        this.bindEvents();
        this.initAIController();

        const isFirstEnter = !this.animationPlayed;
        if (isFirstEnter) {
            const header = this.container.querySelector('#audit-header');
            const leftPanel = this.container.querySelector('#letter-list-panel');
            const rightPanel = this.container.querySelector('#letter-detail-panel');

            await this.playInitAnimation(header, leftPanel, rightPanel);
            this.animationPlayed = true;
        }

        await this.loadData(true);
        this.isInitialized = true;
        this.startPolling();
    }

    async playInitAnimation(header, leftPanel, rightPanel) {
        header.style.opacity = '0';
        leftPanel.style.opacity = '0';
        rightPanel.style.opacity = '0';

        await WpAnimation.moveAndFadeIn(header, 'left', 30, 500, 0);
        await WpAnimation.moveAndFadeIn(leftPanel, 'left', 30, 500, 0);
        await WpAnimation.moveAndFadeIn(rightPanel, 'left', 30, 500, 0);
    }

    async renderHTML() {
        this.container.innerHTML = AuditHtml.getFullPageHtml();
    }

    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;
        this.pollLetters();
        this.pollingInterval = setInterval(() => this.pollLetters(), 5000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
    }

    async pollLetters() {
        const newLetters = await AuditTools.getLetters();
        newLetters.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        const newLettersDict = {};
        newLetters.forEach(letter => {
            newLettersDict[letter['信件编号']] = letter;
        });

        await this.handleLetterChanges(newLetters, newLettersDict);
    }

    async handleLetterChanges(newLetters, newLettersDict) {
        const { deleted, added, modified } = AuditTools.compareLetters(this.letters, newLettersDict);
        if (deleted.length === 0 && added.length === 0 && modified.length === 0) return;

        this.letters = newLettersDict;
        const letterCount = this.container.querySelector('#letter-count');
        if (letterCount) letterCount.textContent = Object.keys(this.letters).length;

        const listPanel = this.container.querySelector('#letter-list-panel');
        if (!listPanel) return;

        if (added.length > 0 || deleted.length > 0) {
            listPanel.innerHTML = AuditHtml.getLetterListHtml(newLetters, this.selectedLetter);
        } else {
            modified.forEach(letterNumber => {
                const itemElement = listPanel.querySelector(`[data-letter-number="${letterNumber}"]`);
                if (itemElement) {
                    const newHtml = AuditHtml.getLetterItemHtml(newLettersDict[letterNumber], this.selectedLetter);
                    itemElement.outerHTML = newHtml;
                }
            });
        }

        if (deleted.includes(this.selectedLetter)) {
            this.selectedLetter = null;
            this.setDetailPanelDisabled(true);
            this.clearDetailPanel();
            if (window.workplaceController) {
                window.workplaceController.showNotification('当前选中的信件已被处理或移除', 'top', 3000);
            }
        }
    }

    async loadData(isInit = false) {
        const lettersList = await AuditTools.getLetters();
        lettersList.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        this.letters = {};
        lettersList.forEach(letter => {
            this.letters[letter['信件编号']] = letter;
        });

        const letterCount = this.container.querySelector('#letter-count');
        if (letterCount) letterCount.textContent = lettersList.length;

        const listPanel = this.container.querySelector('#letter-list-panel');
        if (listPanel) {
            listPanel.innerHTML = AuditHtml.getLetterListHtml(lettersList, this.selectedLetter);
        }

        if (isInit) {
            if (lettersList.length > 0) {
                const firstLetter = lettersList[0];
                this.selectLetter(firstLetter['信件编号'], false);
            } else {
                this.setDetailPanelDisabled(true);
            }
        }
    }

    async selectLetter(letterNumber, playAnimation = true) {
        if (this.selectedLetter === letterNumber) return;

        this.selectedLetter = letterNumber;

        const listItems = this.container.querySelectorAll('.wp-list-item');
        listItems.forEach(item => item.classList.remove('active'));

        const selectedItem = this.container.querySelector(`.wp-list-item[data-letter-number="${letterNumber}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        const letter = this.letters[letterNumber];
        if (!letter) return;

        this.setDetailPanelDisabled(true);

        const fullLetterInfo = await AuditTools.getLetterFullDetail(letterNumber);
        this.letterInfo = fullLetterInfo || letter;

        AuditTools.fillLetterDetail(this.container, this.letterInfo);

        this.historyMessages = [];
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        
        this.renderTabsData(this.letterInfo);

        this.setDetailPanelDisabled(false);

        if (playAnimation) {
            const detailPanel = this.container.querySelector('#letter-detail-panel');
            WpAnimation.popIn(detailPanel);
        }
    }

    renderTabsData(info) {
        // Flow Records - 使用与所有信件页面相同的渲染方式
        const flowContainer = this.container.querySelector('#flow-records-container');
        if (flowContainer) {
            const flowRecords = info['流转记录'] || [];
            if (flowRecords.length > 0) {
                flowContainer.innerHTML = LettersTools.generateFlowRecordsHTML(flowRecords);
            } else {
                flowContainer.innerHTML = `<div class="wp-empty-state" style="margin-top:2rem;"><p>暂无流转记录</p></div>`;
            }
        }

        // Feedbacks
        const fbContainer = this.container.querySelector('#feedback-container');
        if (fbContainer) {
            const feedbacks = info['反馈信息'] || [];
            if (feedbacks.length > 0) {
                fbContainer.innerHTML = feedbacks.map(fb => `
                    <div style="background:#f9fafb;padding:12px;border-radius:8px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <strong>反馈情况：${fb['诉求情况'] || '未知'}</strong>
                            <span style="color:#6b7280;font-size:0.875rem;">${fb['反馈时间'] || ''}</span>
                        </div>
                        <div style="color:#4b5563;">${fb['反馈内容'] || '无详细内容'}</div>
                    </div>
                `).join('');
            } else {
                fbContainer.innerHTML = `<div class="wp-empty-state" style="margin-top:2rem;"><p>暂无反馈内容</p></div>`;
            }
        }

        // Files
        const fileContainer = this.container.querySelector('#files-container');
        if (fileContainer) {
            const files = info['文件列表'] || [];
            if (files.length > 0) {
                fileContainer.innerHTML = files.map(file => `
                    <div style="display:flex;align-items:center;padding:10px;background:#f3f4f6;border-radius:6px;margin-bottom:8px;">
                        <i class="fas fa-file text-blue-500" style="margin-right:12px;font-size:1.25rem;"></i>
                        <div style="flex:1;">
                            <div style="font-weight:500;">${file.name}</div>
                            <div style="font-size:0.75rem;color:#6b7280;">类型: ${file.type || '未知'}</div>
                        </div>
                        <a href="${file.url}" target="_blank" style="color:#3b82f6;text-decoration:none;"><i class="fas fa-download"></i></a>
                    </div>
                `).join('');
            } else {
                fileContainer.innerHTML = `<div class="wp-empty-state" style="margin-top:2rem;"><p>暂无文件</p></div>`;
            }
        }
    }

    clearDetailPanel() {
        const textElements = this.container.querySelectorAll('.wp-text-animate');
        textElements.forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = '';
            } else {
                el.textContent = '-';
            }
        });

        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        this.historyMessages = [];
        
        this.container.querySelector('#flow-records-container').innerHTML = '';
        this.container.querySelector('#feedback-container').innerHTML = '';
        this.container.querySelector('#files-container').innerHTML = '';
    }

    bindEvents() {
        const listPanel = this.container.querySelector('#letter-list-panel');
        if (listPanel) {
            listPanel.addEventListener('click', (e) => {
                const listItem = e.target.closest('.wp-list-item');
                if (listItem) {
                    const letterNumber = listItem.dataset.letterNumber;
                    this.selectLetter(letterNumber);
                }
            });
        }

        const rejectBtn = this.container.querySelector('#btn-reject');
        if (rejectBtn) rejectBtn.addEventListener('click', () => this.showRejectModal());

        const approveBtn = this.container.querySelector('#btn-approve');
        if (approveBtn) approveBtn.addEventListener('click', () => this.showApproveModal());

        const aiChatInput = this.container.querySelector('#ai-chat-input');
        const aiChatSend = this.container.querySelector('#btn-send-message');

        if (aiChatInput && aiChatSend) {
            aiChatSend.addEventListener('click', () => {
                const message = aiChatInput.value.trim();
                if (message) {
                    this.sendChatMessage(message);
                    aiChatInput.value = '';
                }
            });

            aiChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const message = aiChatInput.value.trim();
                    if (message) {
                        this.sendChatMessage(message);
                        aiChatInput.value = '';
                    }
                }
            });
        }

        // Tabs logic
        const tabs = this.container.querySelectorAll('.audit-tab');
        const contents = this.container.querySelectorAll('.audit-tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                this.container.querySelector(`#tab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        this.bindModalEvents();
    }

    bindModalEvents() {
        const rejectModal = this.container.querySelector('#reject-modal');
        const rejectClose = this.container.querySelector('#reject-modal-close');
        const rejectCancel = this.container.querySelector('#btn-reject-cancel');
        const rejectConfirm = this.container.querySelector('#btn-reject-confirm');
        const rejectOverlay = this.container.querySelector('#reject-modal');

        const approveModal = this.container.querySelector('#approve-modal');
        const approveClose = this.container.querySelector('#approve-modal-close');
        const approveCancel = this.container.querySelector('#btn-approve-cancel');
        const approveConfirm = this.container.querySelector('#btn-approve-confirm');
        const approveOverlay = this.container.querySelector('#approve-modal');

        const closeRejectModal = () => WpAnimation.fadeOut(rejectModal, 200, () => rejectModal.style.display = 'none');
        const closeApproveModal = () => WpAnimation.fadeOut(approveModal, 200, () => approveModal.style.display = 'none');

        if (rejectClose) rejectClose.addEventListener('click', closeRejectModal);
        if (rejectCancel) rejectCancel.addEventListener('click', closeRejectModal);
        if (rejectOverlay) {
            rejectOverlay.addEventListener('click', (e) => {
                if (e.target === rejectOverlay) closeRejectModal();
            });
        }

        if (approveClose) approveClose.addEventListener('click', closeApproveModal);
        if (approveCancel) approveCancel.addEventListener('click', closeApproveModal);
        if (approveOverlay) {
            approveOverlay.addEventListener('click', (e) => {
                if (e.target === approveOverlay) closeApproveModal();
            });
        }

        if (rejectConfirm) {
            rejectConfirm.addEventListener('click', async () => {
                const textarea = this.container.querySelector('#reject-textarea');
                const reason = textarea.value.trim();
                if (!reason) {
                    window.workplaceController?.showNotification('请填写退回原因', 'top', 3000);
                    textarea.focus();
                    return;
                }
                
                rejectConfirm.disabled = true;
                rejectConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
                
                try {
                    const result = await AuditTools.rejectLetter(this.selectedLetter, reason);
                    if (result.success) {
                        window.workplaceController?.showNotification('信件已退回', 'top', 3000);
                        closeRejectModal();
                        textarea.value = '';
                        this.selectedLetter = null;
                        await this.loadData();
                    } else {
                        window.workplaceController?.showNotification(`退回失败: ${result.error}`, 'top', 3000);
                    }
                } catch (e) {
                    window.workplaceController?.showNotification('网络错误', 'top', 3000);
                } finally {
                    rejectConfirm.disabled = false;
                    rejectConfirm.innerHTML = '<i class="fas fa-reply"></i> 确认退回';
                }
            });
        }

        if (approveConfirm) {
            approveConfirm.addEventListener('click', async () => {
                const textarea = this.container.querySelector('#approve-textarea');
                const remark = textarea.value.trim();
                
                approveConfirm.disabled = true;
                approveConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
                
                try {
                    const result = await AuditTools.approveLetter(this.selectedLetter, remark);
                    if (result.success) {
                        window.workplaceController?.showNotification('审核已通过', 'top', 3000);
                        closeApproveModal();
                        textarea.value = '';
                        this.selectedLetter = null;
                        await this.loadData();
                    } else {
                        window.workplaceController?.showNotification(`审核失败: ${result.error}`, 'top', 3000);
                    }
                } catch (e) {
                    window.workplaceController?.showNotification('网络错误', 'top', 3000);
                } finally {
                    approveConfirm.disabled = false;
                    approveConfirm.innerHTML = '<i class="fas fa-check"></i> 确认通过';
                }
            });
        }
    }

    showRejectModal() {
        if (!this.selectedLetter) return;
        const modal = this.container.querySelector('#reject-modal');
        const textarea = this.container.querySelector('#reject-textarea');
        if (modal) {
            modal.style.display = 'flex';
            WpAnimation.fadeIn(modal, 200);
            if (textarea) {
                textarea.value = '';
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }

    showApproveModal() {
        if (!this.selectedLetter) return;
        const modal = this.container.querySelector('#approve-modal');
        const textarea = this.container.querySelector('#approve-textarea');
        if (modal) {
            modal.style.display = 'flex';
            WpAnimation.fadeIn(modal, 200);
            if (textarea) {
                textarea.value = '';
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }

    initAIController() {
        this.aiController = new AbortController();
    }

    async sendChatMessage(message) {
        if (!message || !this.selectedLetter) return;

        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages) return;

        if (this.isRenderingMessages) {
            if (this.renderAbortController) {
                this.renderAbortController.abort();
                this.renderAbortController = null;
            }
            this.isRenderingMessages = false;
            
            const aiMessages = chatMessages.querySelectorAll('.dispatch-chat-message.ai');
            if (aiMessages.length > 0) {
                const lastAiMessage = aiMessages[aiMessages.length - 1];
                const contentDiv = lastAiMessage.querySelector('.dispatch-chat-content');
                if (contentDiv && contentDiv.dataset.fullContent) {
                    contentDiv.innerHTML = marked.parse(contentDiv.dataset.fullContent);
                }
            }
        }

        const userMsgHtml = `
            <div class="dispatch-chat-message user">
                <div class="dispatch-chat-avatar"><i class="fas fa-user"></i></div>
                <div class="dispatch-chat-bubble">
                    <div class="dispatch-chat-content">${message.replace(/\\n/g, '<br>')}</div>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', userMsgHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const typingId = 'typing-' + Date.now();
        const typingHtml = `
            <div class="dispatch-chat-message ai" id="${typingId}">
                <div class="dispatch-chat-avatar"><i class="fas fa-robot"></i></div>
                <div class="dispatch-chat-bubble">
                    <div class="dispatch-chat-content dispatch-chat-typing">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', typingHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const messages = AuditTools.buildMessages({
                userMessage: message,
                messageHistory: this.historyMessages,
                prompt: this.prompt,
                letterInfo: this.letterInfo,
            });

            this.historyMessages.push({ role: 'user', content: message });

            const response = await fetch('/api/llm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'chat',
                    args: {
                        messages: messages,
                        model: 'deepseek-chat',
                        temperature: 0.7
                    }
                }),
                signal: this.aiController.signal
            });

            const result = await response.json();
            
            const typingElement = document.getElementById(typingId);
            if (typingElement) {
                typingElement.remove();
            }

            if (result.success) {
                const aiResponse = result.data.content;
                this.historyMessages.push({ role: 'assistant', content: aiResponse });

                const aiMsgId = 'ai-msg-' + Date.now();
                const aiMsgHtml = `
                    <div class="dispatch-chat-message ai" id="${aiMsgId}">
                        <div class="dispatch-chat-avatar"><i class="fas fa-robot"></i></div>
                        <div class="dispatch-chat-bubble">
                            <div class="dispatch-chat-content markdown-body" data-full-content="${aiResponse.replace(/"/g, '&quot;')}"></div>
                        </div>
                    </div>
                `;
                chatMessages.insertAdjacentHTML('beforeend', aiMsgHtml);
                
                const contentDiv = document.getElementById(aiMsgId).querySelector('.dispatch-chat-content');
                await this.renderMarkdownWithTyping(contentDiv, aiResponse, chatMessages);
            } else {
                throw new Error(result.error || '请求失败');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('AI请求被取消');
                return;
            }
            
            const typingElement = document.getElementById(typingId);
            if (typingElement) {
                typingElement.remove();
            }
            
            const errorHtml = `
                <div class="dispatch-chat-message ai error">
                    <div class="dispatch-chat-avatar"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="dispatch-chat-bubble">
                        <div class="dispatch-chat-content">抱歉，发生错误：${error.message}</div>
                    </div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', errorHtml);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    async renderMarkdownWithTyping(element, text, scrollContainer) {
        this.isRenderingMessages = true;
        this.renderAbortController = new AbortController();
        const signal = this.renderAbortController.signal;
        
        try {
            const html = marked.parse(text);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            element.innerHTML = '';
            
            const childNodes = Array.from(tempDiv.childNodes);
            
            for (let i = 0; i < childNodes.length; i++) {
                if (signal.aborted) throw new Error('Render aborted');
                
                const node = childNodes[i];
                if (node.nodeType === Node.TEXT_NODE) {
                    const chars = node.textContent.split('');
                    const textNode = document.createTextNode('');
                    element.appendChild(textNode);
                    
                    for (let char of chars) {
                        if (signal.aborted) throw new Error('Render aborted');
                        textNode.textContent += char;
                        scrollContainer.scrollTop = scrollContainer.scrollHeight;
                        await new Promise(resolve => setTimeout(resolve, 5));
                    }
                } else {
                    const clone = node.cloneNode(false);
                    element.appendChild(clone);
                    
                    if (node.childNodes.length > 0) {
                        await this.renderNodeWithTyping(clone, node, scrollContainer, signal);
                    }
                }
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
            
            element.querySelectorAll('pre code').forEach((block) => {
                if (window.hljs) {
                    hljs.highlightElement(block);
                }
            });
        } catch (e) {
            if (e.message !== 'Render aborted') {
                element.innerHTML = marked.parse(text);
            }
        } finally {
            this.isRenderingMessages = false;
            this.renderAbortController = null;
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }

    async renderNodeWithTyping(targetNode, sourceNode, scrollContainer, signal) {
        const childNodes = Array.from(sourceNode.childNodes);
        
        for (let i = 0; i < childNodes.length; i++) {
            if (signal.aborted) throw new Error('Render aborted');
            
            const node = childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
                const chars = node.textContent.split('');
                const textNode = document.createTextNode('');
                targetNode.appendChild(textNode);
                
                for (let char of chars) {
                    if (signal.aborted) throw new Error('Render aborted');
                    textNode.textContent += char;
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            } else {
                const clone = node.cloneNode(false);
                targetNode.appendChild(clone);
                
                if (node.childNodes.length > 0) {
                    await this.renderNodeWithTyping(clone, node, scrollContainer, signal);
                }
            }
        }
    }

    /**
     * 停止所有动画
     * 当页面切换时立即调用，确保动画不会阻塞页面切换
     */
    stopAnimation() {
        console.log('[AuditController] 停止动画');
        // 确保重置所有元素到可见状态
        this.ensureElementsVisible();
    }

    hide() {
        this.stopPolling();
        if (this.aiController) {
            this.aiController.abort();
            this.initAIController();
        }
        if (this.renderAbortController) {
            this.renderAbortController.abort();
            this.renderAbortController = null;
        }
        this.isRenderingMessages = false;
    }

    show() {
        this.startPolling();
    }
}