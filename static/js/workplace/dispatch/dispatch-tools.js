/**
 * 下发工作台工具函数模块
 *
 * 包含数据加载、格式化、API调用等工具方法
 */

const DispatchTools = {
    /**
     * 获取待下发信件列表
     * @returns {Promise<Array>} 信件列表
     */
    async getLetters() {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_dispatch_list',
                args: { limit: 50, page: 1 }
            })
        });
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 信件内容比对
     * @param {Object} currentLetters - 当前信件字典，以信件编号为key
     * @param {Object} newLetters - 最新请求的信件字典，以信件编号为key
     * @returns {Object} 包含三个列表的对象：deleted, added, modified
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
     * 加载可下发单位列表
     * @returns {Promise<Array>} 单位列表
     */
    async loadUnits() {
        let response = await fetch('/api/setting/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: 'get_dispatch_units', args: {} })
        });
        let result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) {
            response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_units', args: {} })
            });
            result = await response.json();
        }

        return result.success ? (result.data || []) : [];
    },

    /**
     * 下发信件
     * @param {Object} dispatchData - 下发数据对象
     * @returns {Promise<Object>} 下发结果
     */
    async dispatchLetter(dispatchData) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'dispatch',
                args: dispatchData
            })
        });
        return await response.json();
    },

    /**
     * 自行处理信件
     * @param {Object} data - 处理数据
     * @returns {Promise<Object>} 处理结果
     */
    async handleBySelf(data) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'handle_by_self',
                args: data
            })
        });
        return await response.json();
    },

    /**
     * 格式化信件分类
     * @param {Object} letter - 信件数据
     * @returns {string} 格式化后的分类字符串
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
     * @param {string|Date} time - 时间
     * @returns {string} 格式化后的时间字符串
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
     * @param {Object} letter - 信件数据
     * @param {string} selectedLetterNumber - 当前选中的信件编号
     * @returns {string} HTML字符串
     */
    renderLetterListItemHTML(letter, selectedLetterNumber) {
        const category = letter['信件三级分类']
            || letter['信件二级分类']
            || letter['信件一级分类']
            || '未分类';

        return `
            <div class="wp-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
                 data-letter-number="${letter['信件编号']}">
                <div class="dispatch-item-category">${category}</div>
                <div class="dispatch-item-number">${letter['信件编号']}</div>
                <div class="dispatch-item-meta">
                    <span class="dispatch-item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="dispatch-item-time">${this.formatTime(letter['来信时间'])}</span>
                </div>
            </div>
        `;
    },

    /**
     * 渲染信件列表HTML
     * @param {Array} letters - 信件列表
     * @param {string} selectedLetterNumber - 当前选中的信件编号
     * @returns {string} HTML字符串
     */
    renderLetterListHTML(letters, selectedLetterNumber) {
        if (letters.length === 0) {
            return `
                <div class="wp-empty-state">
                    <div class="wp-empty-icon"><i class="fas fa-inbox"></i></div>
                    <h3 class="wp-empty-title">没有预处理信件</h3>
                    <p class="wp-empty-desc">当前没有待处理的预处理信件</p>
                </div>
            `;
        }

        return letters.map((letter) => this.renderLetterListItemHTML(letter, selectedLetterNumber)).join('');
    },

    /**
     * 填充信件详情
     * @param {HTMLElement} container - 容器元素
     * @param {Object} letter - 信件数据
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
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Object>} 信件完整信息
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
     * 获取系统提示词（单位、信件分类、专项关注）
     * @returns {Promise<Array>} 提示词消息列表
     */
    async getSystemPrompts() {
        const prompts = [];

        const [workPrompt, unitsPrompt, categoryPrompt, specialFocusPrompt] = await Promise.all([
            this.fetchPrompt('下发工作提示词'),
            this.fetchPrompt('单位级别提示词'),
            this.fetchPrompt('信件分类提示词'),
            this.fetchPrompt('专项关注提示词')
        ]);

        let systemContent = '';

        if (workPrompt) systemContent += workPrompt;
        if (unitsPrompt) systemContent += '\n\n' + unitsPrompt;
        if (categoryPrompt) systemContent += '\n\n' + categoryPrompt;
        if (specialFocusPrompt) systemContent += '\n\n' + specialFocusPrompt;

        const userInfo = this.getUserInfoPrompt();
        if (userInfo) systemContent += '\n\n' + userInfo;

        prompts.push({ role: 'system', content: systemContent });

        return prompts;
    },

    /**
     * 获取用户信息提示词
     * @returns {string|null} 用户信息提示词
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
     * @param {string} promptType - 提示词类型
     * @returns {Promise<string|null>} 提示词内容
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
     * 加载信件分类数据
     * @returns {Promise<Array>} 分类数据
     */
    async loadCategories() {
        const response = await fetch('/api/setting/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: 'category_list', args: {} })
        });
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 加载专项关注数据
     * @returns {Promise<Array>} 专项关注数据
     */
    async loadSpecialFocus() {
        const response = await fetch('/api/setting/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: 'get_special_focus_list', args: {} })
        });
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 验证信件分类内容是否有效
     * @param {string} content - 需要验证的分类内容
     * @param {Array} validCategories - 有效的分类列表
     * @returns {Object} 验证结果
     */
    validateCategoryContent(content, validCategories) {
        if (!content || !validCategories || validCategories.length === 0) {
            return { valid: false, matched: null, message: '分类内容或有效分类列表为空' };
        }

        const normalizedContent = content.replace(/\s+/g, ' ').trim();

        for (const cat of validCategories) {
            const fullPath = `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}`;
            const normalizedPath = fullPath.replace(/\s+/g, ' ').trim();

            if (normalizedContent === normalizedPath) {
                return { valid: true, matched: cat, message: '分类验证通过' };
            }

            const contentNoSpace = normalizedContent.replace(/\s/g, '');
            const pathNoSpace = normalizedPath.replace(/\s/g, '');
            if (contentNoSpace === pathNoSpace) {
                return { valid: true, matched: cat, message: '分类验证通过（忽略空格）', correctedValue: fullPath };
            }
        }

        return { valid: false, matched: null, message: `分类 "${content}" 不在有效分类列表中` };
    },

    /**
     * 验证下发单位内容是否有效
     * @param {string} content - 需要验证的单位内容
     * @param {Array} validUnits - 有效的单位列表
     * @returns {Object} 验证结果
     */
    validateUnitContent(content, validUnits) {
        if (!content || !validUnits || validUnits.length === 0) {
            return { valid: false, matched: null, message: '单位内容或有效单位列表为空' };
        }

        const normalizedContent = content.replace(/\s+/g, ' ').trim();

        for (const unit of validUnits) {
            const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
            const normalizedPath = fullPath.replace(/\s+/g, ' ').trim();

            if (normalizedContent === normalizedPath) {
                return { valid: true, matched: unit, message: '单位验证通过' };
            }

            const contentNoSpace = normalizedContent.replace(/\s/g, '');
            const pathNoSpace = normalizedPath.replace(/\s/g, '');
            if (contentNoSpace === pathNoSpace) {
                return { valid: true, matched: unit, message: '单位验证通过（忽略空格）', correctedValue: fullPath };
            }

            const unitName = unit['三级'] || unit['二级'] || unit['一级'];
            if (normalizedContent === unitName || contentNoSpace === unitName.replace(/\s/g, '')) {
                return { valid: true, matched: unit, message: '单位名称验证通过', correctedValue: fullPath };
            }
        }

        return { valid: false, matched: null, message: `单位 "${content}" 不在有效单位列表中` };
    },

    /**
     * 验证专项关注内容是否有效
     * @param {string} content - 需要验证的专项关注内容
     * @param {Array} validSpecialFocus - 有效的专项关注列表
     * @returns {Object} 验证结果
     */
    validateSpecialFocusContent(content, validSpecialFocus) {
        if (!content || !validSpecialFocus || validSpecialFocus.length === 0) {
            return { valid: false, matched: [], unmatched: [], message: '专项关注内容或有效列表为空' };
        }

        const inputItems = content.split('/').map(item => item.trim()).filter(item => item);
        const matched = [];
        const unmatched = [];
        const validTitles = validSpecialFocus.map(item => item['专项关注标题']);

        inputItems.forEach(inputItem => {
            let found = validTitles.find(title => title === inputItem);

            if (!found) {
                const inputNoSpace = inputItem.replace(/\s/g, '');
                found = validTitles.find(title => title.replace(/\s/g, '') === inputNoSpace);
            }

            if (found) {
                matched.push(found);
            } else {
                unmatched.push(inputItem);
            }
        });

        const valid = matched.length > 0;
        let message;
        if (unmatched.length === 0) {
            message = `专项关注验证通过，共${matched.length}项`;
        } else if (matched.length === 0) {
            message = `专项关注验证失败："${unmatched.join('、')}" 不在有效列表中`;
        } else {
            message = `专项关注部分验证通过：${matched.length}项有效，"${unmatched.join('、')}" 无效`;
        }

        return { valid, matched, unmatched, message };
    },

    /**
     * 显示输入验证错误提示
     * @param {HTMLElement} inputElement - 输入框元素
     * @param {string} message - 错误消息
     */
    showValidationError(inputElement, message) {
        inputElement.style.transition = 'all 0.3s ease';
        inputElement.style.borderColor = '#ef4444';
        inputElement.style.borderWidth = '2px';
        inputElement.style.backgroundColor = '#fef2f2';

        if (window.workplaceController && window.workplaceController.showNotification) {
            window.workplaceController.showNotification(
                `<div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>
                    <span style="color: #dc2626; font-weight: 500;">${message}</span>
                </div>`,
                'bottom',
                3000
            );
        }

        setTimeout(() => {
            this.clearValidationError(inputElement);
        }, 3000);
    },

    /**
     * 清除输入验证错误提示
     * @param {HTMLElement} inputElement - 输入框元素
     */
    clearValidationError(inputElement) {
        inputElement.style.borderColor = '';
        inputElement.style.borderWidth = '';
        inputElement.style.backgroundColor = '';
    },

    /**
     * 自动勾选专项关注下拉框选项
     * @param {HTMLElement} container - 专项关注下拉框容器
     * @param {Array} selectedValues - 需要勾选的值列表
     * @param {Function} onChange - 变更回调函数
     */
    autoSelectSpecialFocusOptions(container, selectedValues, onChange) {
        const optionsContainer = container.querySelector('#focus-select-options');
        const input = container.querySelector('#focus-select-input');
        if (!optionsContainer || !input) return;

        optionsContainer.querySelectorAll('.dispatch-select-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        const allOptions = optionsContainer.querySelectorAll('.dispatch-select-option');
        const matchedValues = [];

        selectedValues.forEach(value => {
            allOptions.forEach(option => {
                const optionValue = option.dataset.value;
                if (optionValue === value) {
                    option.classList.add('selected');
                    matchedValues.push(value);
                }
            });
        });

        if (matchedValues.length > 0) {
            input.value = matchedValues.join(' / ');
        } else {
            input.value = '';
        }

        if (onChange) {
            onChange(matchedValues);
        }
    },

    /**
     * 格式化命令内容
     * @param {string} content - 原始内容
     * @returns {string} 格式化后的内容
     */
    formatCommandContent(content) {
        if (!content) return '';
        let formatted = content.replace(/\s/g, '');
        formatted = formatted.replace(/\//g, ' / ');
        return formatted;
    },

    /**
     * 格式化专项关注内容
     * @param {string} content - 原始内容
     * @returns {string} 格式化后的内容
     */
    formatSpecialFocusContent(content) {
        if (!content) return '';

        try {
            let items = [];
            content = content.trim();

            if (content.startsWith('[') && content.endsWith(']')) {
                items = JSON.parse(content);
            } else if (content.includes('","')) {
                items = content.split('","').map(item => item.replace(/^"|"$/g, ''));
            } else {
                items = [content.replace(/^"|"$/g, '')];
            }

            if (!Array.isArray(items)) {
                items = [items];
            }

            return items.join(' / ');
        } catch (e) {
            return content.replace(/^\["?|"?\]$/g, '');
        }
    },

    /**
     * 构建AI消息列表
     * @param {Object} options - 配置选项
     * @returns {Array} 组装好的消息列表
     */
    buildMessages(options) {
        const {
            userMessage,
            messageHistory = [],
            prompt = [],
            letterInfo = null,
            sameIdLetter = [],
            autoDispatchChecked = false,
            units = [],
            notes = ''
        } = options;

        const userInfoPrompt = this.getUserInfoPrompt();

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
            letterInfoPrompt += `手机号：${info['手机号'] || '未知'}\n`;
            letterInfoPrompt += `身份证号：${info['身份证号'] || '未知'}\n`;
            letterInfoPrompt += `来信时间：${info['来信时间'] || '未知'}\n`;
            letterInfoPrompt += `来信渠道：${info['来信渠道'] || '未知'}\n`;
            letterInfoPrompt += `信件分类：${info['信件一级分类'] || ''} / ${info['信件二级分类'] || ''} / ${info['信件三级分类'] || ''}\n`;
            letterInfoPrompt += `诉求内容：${info['诉求内容'] || '无'}\n`;
            letterInfoPrompt += `信件状态：${info['当前信件状态'] || '未知'}\n`;
            if (info['专项关注标签']) {
                letterInfoPrompt += `专项关注标签：${info['专项关注标签']}\n`;
            }
            if (notes) {
                letterInfoPrompt += `下发备注：${notes}\n`;
            }

            const flowRecords = info['流转记录'];
            if (Array.isArray(flowRecords) && flowRecords.length > 0) {
                letterInfoPrompt += '\n流转记录：\n';
                flowRecords.forEach((record, index) => {
                    letterInfoPrompt += `[${index + 1}] 操作类型：${record['操作类型'] || '未知'}\n`;
                    letterInfoPrompt += `    操作时间：${record['操作时间'] || '未知'}\n`;
                    letterInfoPrompt += `    操作人警号：${record['操作人警号'] || '未知'}\n`;
                    letterInfoPrompt += `    操作前状态：${record['操作前状态'] || '无'}\n`;
                    letterInfoPrompt += `    操作后状态：${record['操作后状态'] || '无'}\n`;
                    if (record['备注']) {
                        const remark = record['备注'];
                        letterInfoPrompt += `    备注：${JSON.stringify(remark)}\n`;
                    }
                });
            }
        }

        let historyLettersPrompt = '';
        if (sameIdLetter && sameIdLetter.length > 0) {
            historyLettersPrompt = '\n\n该群众的历史来信情况：\n';
            sameIdLetter.forEach((letter, index) => {
                historyLettersPrompt += `\n[历史来信 ${index + 1}]\n`;
                historyLettersPrompt += `信件编号：${letter['信件编号'] || '未知'}\n`;
                historyLettersPrompt += `来信时间：${letter['来信时间'] || '未知'}\n`;
                historyLettersPrompt += `信件状态：${letter['当前信件状态'] || '未知'}\n`;
                historyLettersPrompt += `信件分类：${letter['信件一级分类'] || ''} / ${letter['信件二级分类'] || ''} / ${letter['信件三级分类'] || ''}\n`;
                historyLettersPrompt += `诉求内容：${letter['诉求内容'] || '无'}\n`;

                const historyFlowRecords = letter['流转记录'];
                if (Array.isArray(historyFlowRecords) && historyFlowRecords.length > 0) {
                    historyLettersPrompt += '流转记录：\n';
                    historyFlowRecords.forEach((record, idx) => {
                        historyLettersPrompt += `  [${idx + 1}] 操作类型：${record['操作类型'] || '未知'}`;
                        historyLettersPrompt += `，操作时间：${record['操作时间'] || '未知'}`;
                        historyLettersPrompt += `，操作后状态：${record['操作后状态'] || '无'}\n`;
                    });
                }
            });
        }

        const autoDispatchPrompt = `自动下发模式：${autoDispatchChecked ? '已开启' : '未开启'}`;

        const messages = [
            ...(userInfoPrompt ? [{ role: 'system', content: userInfoPrompt }] : []),
            ...prompt,
            ...(letterInfoPrompt ? [{ role: 'system', content: letterInfoPrompt }] : []),
            ...(historyLettersPrompt ? [{ role: 'system', content: historyLettersPrompt }] : []),
            { role: 'system', content: autoDispatchPrompt, type: 'auto_dispatch' },
            ...messageHistory.slice(-10),
            { role: 'user', content: userMessage }
        ];

        return messages;
    },

    /**
     * 根据身份证号查询其他信件
     * @param {string} idCard - 身份证号
     * @param {string} excludeLetterNumber - 需要排除的信件编号
     * @returns {Promise<Array>} 其他信件列表
     */
    async getLettersByIdCard(idCard, excludeLetterNumber) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_by_idcard',
                args: { '身份证号': idCard }
            })
        });
        const result = await response.json();

        if (result.success && result.data) {
            return result.data.filter(letter => letter['信件编号'] !== excludeLetterNumber);
        }
        return [];
    }
};
