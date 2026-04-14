/**
 * 核查工作台工具函数模块
 *
 * 包含数据加载、格式化、API调用等工具方法
 */

const AuditTools = {
    /**
     * 获取待核查信件列表
     * @returns {Promise<Array>} 信件列表
     */
    async getLetters() {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_audit_list',
                args: { limit: 50, page: 1 }
            })
        });
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 信件内容比对
     */
    compareLetters(currentLetters, newLetters) {
        const currentKeys = Object.keys(currentLetters);
        const newKeys = Object.keys(newLetters);

        const deleted = currentKeys.filter(key => !newKeys.includes(key));
        const added = newKeys.filter(key => !currentKeys.includes(key));
        const modified = newKeys.filter(key => {
            if (currentKeys.includes(key)) {
                return JSON.stringify(currentLetters[key]) !== JSON.stringify(newLetters[key]);
            }
            return false;
        });

        return { deleted, added, modified };
    },

    /**
     * 审核通过信件
     */
    async approveLetter(letterNumber, remark) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'audit_approve',
                args: { '信件编号': letterNumber, '备注': remark }
            })
        });
        return await response.json();
    },

    /**
     * 审核退回信件
     */
    async rejectLetter(letterNumber, reason) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'audit_reject',
                args: { '信件编号': letterNumber, '退回原因': reason }
            })
        });
        return await response.json();
    },

    /**
     * 格式化信件分类
     */
    formatCategory(letter) {
        const c1 = letter['信件一级分类'] || '未分类';
        const c2 = letter['信件二级分类'];
        const c3 = letter['信件三级分类'];
        if (c3) return `${c1} / ${c2} / ${c3}`;
        if (c2) return `${c1} / ${c2}`;
        return c1;
    },

    /**
     * 格式化时间
     */
    formatTime(time) {
        if (!time) return '-';

        const date = new Date(time);
        if (isNaN(date.getTime())) return '-';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * 渲染单个信件列表项HTML
     */
    renderLetterListItemHTML(letter, selectedLetterNumber) {
        const category = letter['信件三级分类']
            || letter['信件二级分类']
            || letter['信件一级分类']
            || '未分类';

        return `
            <div class="wp-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
                 data-letter-number="${letter['信件编号']}">
                <div class="audit-item-category">${category}</div>
                <div class="audit-item-number">${letter['信件编号']}</div>
                <div class="audit-item-meta">
                    <span class="audit-item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="audit-item-time">${this.formatTime(letter['来信时间'])}</span>
                </div>
            </div>
        `;
    },

    /**
     * 填充信件详情
     */
    fillLetterDetail(container, letter) {
        const categoryEl = container.querySelector('#detail-category');
        if (categoryEl) categoryEl.textContent = this.formatCategory(letter);

        const spanElements = {
            '#detail-letter-number': letter['信件编号'] || '-',
            '#detail-source': letter['来信渠道'] || '-'
        };

        for (const [selector, value] of Object.entries(spanElements)) {
            const el = container.querySelector(selector);
            if (el) el.textContent = value;
        }

        const inputElements = {
            '#detail-time': this.formatTime(letter['来信时间']),
            '#detail-citizen': letter['群众姓名'] || '',
            '#detail-phone': letter['手机号'] || '',
            '#detail-idcard': letter['身份证号'] || ''
        };

        for (const [selector, value] of Object.entries(inputElements)) {
            const el = container.querySelector(selector);
            if (el) el.value = value;
        }

        const appealContentEl = container.querySelector('#detail-appeal-content');
        if (appealContentEl) {
            appealContentEl.value = letter['诉求内容'] || '';
        }
    },

    /**
     * 获取信件完整详情（包含信件表、流转表、文件表）
     */
    async getLetterFullDetail(letterNumber) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_detail',
                args: { '信件编号': letterNumber }
            })
        });
        const result = await response.json();
        return result.success ? (result.data || null) : null;
    },

    /**
     * 获取系统提示词
     */
    async getSystemPrompts() {
        const prompts = [];
        const workPrompt = await this.fetchPrompt('核查工作提示词');
        let systemContent = '';
        if (workPrompt) systemContent += workPrompt;

        const userInfo = this.getUserInfoPrompt();
        if (userInfo) systemContent += '\n\n' + userInfo;

        prompts.push({ role: 'system', content: systemContent });
        return prompts;
    },

    /**
     * 获取用户信息提示词
     */
    getUserInfoPrompt() {
        const workplaceController = window.workplaceController;
        if (!workplaceController || !workplaceController.currentUser) {
            return null;
        }

        const user = workplaceController.currentUser;
        let userInfo = '当前用户信息：\n';
        userInfo += `姓名：${user.name || '未知'}\n`;
        userInfo += `警号：${user.police_number || '未知'}\n`;
        userInfo += `单位：${user.unit_name || '未知'}\n`;

        return userInfo;
    },

    /**
     * 获取指定类型的提示词
     */
    async fetchPrompt(promptType) {
        const response = await fetch('/api/llm/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_prompt',
                args: { type: promptType }
            })
        });
        const result = await response.json();
        return result.success ? (result.data?.content || null) : null;
    },

    /**
     * 构建AI消息列表
     */
    buildMessages(options) {
        const {
            userMessage,
            messageHistory = [],
            prompt = [],
            letterInfo = null,
        } = options;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const timeMessageIndex = messageHistory.findIndex(msg => msg.type === 'time');

        if (timeMessageIndex !== -1) {
            messageHistory[timeMessageIndex].content = `当前时间：${timeString}`;
        } else {
            messageHistory.unshift({
                role: 'system',
                content: `当前时间：${timeString}`,
                type: 'time'
            });
        }

        let letterInfoPrompt = '';
        if (letterInfo && letterInfo['信件编号']) {
            const info = letterInfo;
            letterInfoPrompt = '当前信件详细信息：\n';
            letterInfoPrompt += `信件编号：${info['信件编号'] || '未知'}\n`;
            letterInfoPrompt += `群众姓名：${info['群众姓名'] || '未知'}\n`;
            letterInfoPrompt += `来信时间：${info['来信时间'] || '未知'}\n`;
            letterInfoPrompt += `信件分类：${info['信件一级分类'] || ''} / ${info['信件二级分类'] || ''} / ${info['信件三级分类'] || ''}\n`;
            letterInfoPrompt += `诉求内容：${info['诉求内容'] || '无'}\n`;

            const feedbacks = info['反馈信息'];
            if (Array.isArray(feedbacks) && feedbacks.length > 0) {
                letterInfoPrompt += '\n办案单位反馈：\n';
                feedbacks.forEach((fb, index) => {
                    letterInfoPrompt += `[${index + 1}] 反馈时间：${fb['反馈时间'] || '未知'}\n`;
                    letterInfoPrompt += `    诉求情况：${fb['诉求情况'] || '未知'}\n`;
                    letterInfoPrompt += `    反馈内容：${fb['反馈内容'] || '无'}\n`;
                });
            }
        }

        const messages = [
            ...prompt,
            ...(letterInfoPrompt ? [{ role: 'system', content: letterInfoPrompt }] : []),
            ...messageHistory.slice(-10),
            { role: 'user', content: userMessage }
        ];

        return messages;
    }
};
