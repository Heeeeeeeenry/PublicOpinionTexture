/**
 * 下发工作台工具函数
 *
 * 包含数据加载、格式化、API调用等工具方法
 * 动画效果已移至 animation.js
 */

export const DispatchTools = {
    /**
     * 信件项的生成
     * @param {string} letterNumber - 信件编号
     * @returns {string} 信件列表项的HTML代码
     */
    creatLetterItem(letterNumber) {
        const dispatchController = window.workplaceController?.controllers?.dispatch;
        if (!dispatchController || !dispatchController.letters) {
            return '';
        }

        const letter = dispatchController.letters[letterNumber];
        if (!letter) {
            return '';
        }

        const selectedLetterNumber = dispatchController.selectedLetter?.['信件编号'];

        // 获取三级分类作为主标题
        const category = letter['信件三级分类']
            || letter['信件二级分类']
            || letter['信件一级分类']
            || '未分类';

        const formatTime = (time) => {
            if (!time) return '-';
            return new Date(time).toLocaleString('zh-CN');
        };

        return `
            <div class="letter-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
                 data-letter-number="${letter['信件编号']}">
                <div class="item-category">${category}</div>
                <div class="item-number">${letter['信件编号']}</div>
                <div class="item-meta">
                    <span class="item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="item-time">${formatTime(letter['来信时间'])}</span>
                </div>
            </div>
        `;
    },

    /**
     * 信件的获取
     * @returns {Promise<Array>} 信件列表
     */
    async getLetters() {
        try {
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
        } catch (error) {
            console.error('加载信件列表失败:', error);
            return [];
        }
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

        // 被删除的信件编号
        const deleted = currentKeys.filter(key => !newKeys.includes(key));

        // 增加的信件编号
        const added = newKeys.filter(key => !currentKeys.includes(key));

        // 内容有变化的信件编号
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
     */
    async loadUnits() {
        try {
            // 首先尝试获取可下发单位
            let response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_dispatch_units', args: {} })
            });
            let result = await response.json();

            // 如果可下发单位为空，尝试获取所有单位
            if (!result.success || !result.data || result.data.length === 0) {
                response = await fetch('/api/setting/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: 'get_units', args: {} })
                });
                result = await response.json();
            }

            return result.success ? (result.data || []) : [];
        } catch (error) {
            console.error('加载单位列表失败:', error);
            return [];
        }
    },

    /**
     * 下发信件
     * @param {Object} dispatchData - 下发数据对象
     */
    async dispatchLetter(dispatchData) {
        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'dispatch',
                    args: dispatchData
                })
            });
            return await response.json();
        } catch (error) {
            console.error('下发失败:', error);
            return { success: false, error: '网络错误' };
        }
    },

    

    /**
     * 自行处理信件
     */
    async handleBySelf(letterNumber) {
        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'handle_by_self',
                    args: { letter_number: letterNumber }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('自行处理失败:', error);
            return { success: false, error: '网络错误' };
        }
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
        return new Date(time).toLocaleString('zh-CN');
    },

    /**
     * 渲染单个信件列表项HTML
     * @param {Object} letter - 信件数据
     * @param {string} selectedLetterNumber - 当前选中的信件编号
     * @returns {string} HTML字符串
     */
    renderLetterListItemHTML(letter, selectedLetterNumber) {
        // 获取三级分类作为主标题
        const category = letter['信件三级分类']
            || letter['信件二级分类']
            || letter['信件一级分类']
            || '未分类';

        return `
            <div class="letter-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
                 data-letter-number="${letter['信件编号']}">
                <div class="item-category">${category}</div>
                <div class="item-number">${letter['信件编号']}</div>
                <div class="item-meta">
                    <span class="item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="item-time">${this.formatTime(letter['来信时间'])}</span>
                </div>
            </div>
        `;
    },

    /**
     * 渲染信件列表HTML
     */
    renderLetterListHTML(letters, selectedLetterNumber) {
        if (letters.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-inbox"></i></div>
                    <h3 class="empty-title">暂无待下发信件</h3>
                    <p class="empty-desc">所有预处理信件已处理完毕</p>
                </div>
            `;
        }

        return letters.map((letter) => this.renderLetterListItemHTML(letter, selectedLetterNumber)).join('');
    },

    /**
     * 渲染单位选择器HTML
     */
    renderUnitSelectorHTML(units) {
        if (units.length === 0) {
            return '<p style="color: #9ca3af; text-align: center;">暂无可下发单位</p>';
        }

        return units.map((unit, index) => {
            const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
            return `
            <label class="unit-option ${index === 0 ? 'selected' : ''}" data-unit-full-name="${fullPath}">
                <input type="radio" name="unit" value="${fullPath}" ${index === 0 ? 'checked' : ''}>
                <div class="unit-info">
                    <span class="unit-name">${unit['三级'] || unit['二级'] || unit['一级']}</span>
                    <span class="unit-path">${unit['一级']}${unit['二级'] ? ' / ' + unit['二级'] : ''}${unit['三级'] ? ' / ' + unit['三级'] : ''}</span>
                </div>
            </label>
        `;
        }).join('');
    },

    /**
     * 填充信件详情
     */
    fillLetterDetail(container, letter) {
        // span文本元素（分类）
        const categoryEl = container.querySelector('#detail-category');
        if (categoryEl) categoryEl.textContent = this.formatCategory(letter);

        // span文本元素（不可编辑字段）
        const spanElements = {
            '#detail-letter-number': letter['信件编号'] || '-',
            '#detail-source': letter['来信渠道'] || '-'
        };

        for (const [selector, value] of Object.entries(spanElements)) {
            const el = container.querySelector(selector);
            if (el) el.textContent = value;
        }

        // input元素（可编辑字段）
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

        // 诉求内容使用textarea
        const appealContentEl = container.querySelector('#detail-appeal-content');
        if (appealContentEl) {
            appealContentEl.value = letter['诉求内容'] || '';
        }
    },

    /**
     * 填充弹窗信息
     */
    fillModalInfo(container, letter) {
        container.querySelector('#modal-letter-number').textContent = letter['信件编号'];
        container.querySelector('#modal-citizen-name').textContent = letter['群众姓名'] || '匿名';
        container.querySelector('#modal-category').textContent = this.formatCategory(letter);
    },

    /**
     * 获取信件完整详情（包含信件表、流转表、文件表）
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Object>} 信件完整信息
     */
    async getLetterFullDetail(letterNumber) {
        try {
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
        } catch (error) {
            console.error('获取信件详情失败:', error);
            return null;
        }
    },

    /**
     * 获取系统提示词（单位、信件分类、专项关注）
     * @returns {Promise<Array>} 提示词消息列表
     */
    async getSystemPrompts() {
        const prompts = [];

        try {
            // 并行获取所有提示词
            const [workPrompt, unitsPrompt, categoryPrompt, specialFocusPrompt] = await Promise.all([
                this.fetchPrompt('下发工作提示词'),
                this.fetchPrompt('单位级别提示词'),
                this.fetchPrompt('信件分类提示词'),
                this.fetchPrompt('专项关注提示词')
            ]);

            // 构建系统提示词内容
            let systemContent = '';

            // 基础工作提示词
            if (workPrompt) {
                systemContent += workPrompt;
            }

            // 单位级别提示词
            if (unitsPrompt) {
                systemContent += '\n\n' + unitsPrompt;
            }

            // 信件分类提示词
            if (categoryPrompt) {
                systemContent += '\n\n' + categoryPrompt;
            }

            // 专项关注提示词
            if (specialFocusPrompt) {
                systemContent += '\n\n' + specialFocusPrompt;
            }

            // 添加用户信息
            const userInfo = this.getUserInfoPrompt();
            if (userInfo) {
                systemContent += '\n\n' + userInfo;
            }

            prompts.push({ role: 'system', content: systemContent });
        } catch (error) {
            console.error('获取系统提示词失败:', error);
            // 使用默认提示词
            prompts.push({
                role: 'system',
                content: '你是民意质感系统的AI助手，专门帮助民警分析信件内容、提供处理建议。请用简洁专业的语言回答。'
            });
        }

        return prompts;
    },

    /**
     * 获取用户信息提示词
     * @returns {string|null} 用户信息提示词
     */
    getUserInfoPrompt() {
        try {
            // 从 window.workplaceController 获取当前用户信息
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
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    },

    /**
     * 获取指定类型的提示词
     * @param {string} promptType - 提示词类型
     * @returns {Promise<string|null>} 提示词内容
     */
    async fetchPrompt(promptType) {
        try {
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
        } catch (error) {
            console.error(`[DispatchTools] 获取提示词 ${promptType} 失败:`, error);
            return null;
        }
    },

    /**
     * 加载信件分类数据
     * @returns {Promise<Array>} 分类数据
     */
    async loadCategories() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'category_list', args: {} })
            });
            const result = await response.json();
            return result.success ? (result.data || []) : [];
        } catch (error) {
            console.error('加载分类数据失败:', error);
            return [];
        }
    },

    /**
     * 加载专项关注数据
     * @returns {Promise<Array>} 专项关注数据
     */
    async loadSpecialFocus() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_special_focus_list', args: {} })
            });
            const result = await response.json();
            return result.success ? (result.data || []) : [];
        } catch (error) {
            console.error('加载专项关注数据失败:', error);
            return [];
        }
    },

    /**
     * 验证信件分类内容是否有效
     * @param {string} content - 需要验证的分类内容
     * @param {Array} validCategories - 有效的分类列表
     * @returns {Object} 验证结果 { valid: boolean, matched: Object|null, message: string }
     */
    validateCategoryContent(content, validCategories) {
        if (!content || !validCategories || validCategories.length === 0) {
            return { valid: false, matched: null, message: '分类内容或有效分类列表为空' };
        }

        // 标准化输入内容：去除多余空格
        const normalizedContent = content.replace(/\s+/g, ' ').trim();

        // 遍历所有有效分类进行匹配
        for (const cat of validCategories) {
            const fullPath = `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}`;
            const normalizedPath = fullPath.replace(/\s+/g, ' ').trim();

            // 完全匹配
            if (normalizedContent === normalizedPath) {
                return { valid: true, matched: cat, message: '分类验证通过' };
            }

            // 忽略空格的匹配
            const contentNoSpace = normalizedContent.replace(/\s/g, '');
            const pathNoSpace = normalizedPath.replace(/\s/g, '');
            if (contentNoSpace === pathNoSpace) {
                return { valid: true, matched: cat, message: '分类验证通过（忽略空格）', correctedValue: fullPath };
            }
        }

        // 未找到匹配
        return { valid: false, matched: null, message: `分类 "${content}" 不在有效分类列表中` };
    },

    /**
     * 验证下发单位内容是否有效
     * @param {string} content - 需要验证的单位内容
     * @param {Array} validUnits - 有效的单位列表
     * @returns {Object} 验证结果 { valid: boolean, matched: Object|null, message: string }
     */
    validateUnitContent(content, validUnits) {
        if (!content || !validUnits || validUnits.length === 0) {
            return { valid: false, matched: null, message: '单位内容或有效单位列表为空' };
        }

        // 标准化输入内容：去除多余空格
        const normalizedContent = content.replace(/\s+/g, ' ').trim();

        // 遍历所有有效单位进行匹配
        for (const unit of validUnits) {
            const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
            const normalizedPath = fullPath.replace(/\s+/g, ' ').trim();

            // 完全匹配
            if (normalizedContent === normalizedPath) {
                return { valid: true, matched: unit, message: '单位验证通过' };
            }

            // 忽略空格的匹配
            const contentNoSpace = normalizedContent.replace(/\s/g, '');
            const pathNoSpace = normalizedPath.replace(/\s/g, '');
            if (contentNoSpace === pathNoSpace) {
                return { valid: true, matched: unit, message: '单位验证通过（忽略空格）', correctedValue: fullPath };
            }

            // 匹配单位名称（三级或二级）
            const unitName = unit['三级'] || unit['二级'] || unit['一级'];
            if (normalizedContent === unitName || contentNoSpace === unitName.replace(/\s/g, '')) {
                return { valid: true, matched: unit, message: '单位名称验证通过', correctedValue: fullPath };
            }
        }

        // 未找到匹配
        return { valid: false, matched: null, message: `单位 "${content}" 不在有效单位列表中` };
    },

    /**
     * 显示输入验证错误提示
     * @param {HTMLElement} inputElement - 输入框元素
     * @param {string} message - 错误消息
     */
    showValidationError(inputElement, message) {
        // 添加红色边框
        inputElement.style.transition = 'all 0.3s ease';
        inputElement.style.borderColor = '#ef4444';
        inputElement.style.borderWidth = '2px';
        inputElement.style.backgroundColor = '#fef2f2';

        // 使用workplaceController.showNotification显示错误提示
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

        // 3秒后清除错误样式
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
     * 验证专项关注内容是否有效
     * @param {string} content - 需要验证的专项关注内容，用"/"分隔多个选项
     * @param {Array} validSpecialFocus - 有效的专项关注列表
     * @returns {Object} 验证结果 { valid: boolean, matched: Array, unmatched: Array, message: string }
     */
    validateSpecialFocusContent(content, validSpecialFocus) {
        if (!content || !validSpecialFocus || validSpecialFocus.length === 0) {
            return { valid: false, matched: [], unmatched: [], message: '专项关注内容或有效列表为空' };
        }

        console.log('[validateSpecialFocusContent] 输入内容:', content);
        console.log('[validateSpecialFocusContent] 有效列表:', validSpecialFocus.map(item => item['专项关注标题']));

        // 解析输入内容，按"/"分隔并去除空格
        const inputItems = content.split('/').map(item => item.trim()).filter(item => item);
        console.log('[validateSpecialFocusContent] 解析后的输入项:', inputItems);

        const matched = [];
        const unmatched = [];
        const validTitles = validSpecialFocus.map(item => item['专项关注标题']);

        inputItems.forEach(inputItem => {
            // 尝试精确匹配
            let found = validTitles.find(title => title === inputItem);

            // 如果没有精确匹配，尝试忽略空格匹配
            if (!found) {
                const inputNoSpace = inputItem.replace(/\s/g, '');
                found = validTitles.find(title => title.replace(/\s/g, '') === inputNoSpace);
            }

            if (found) {
                matched.push(found);
                console.log('[validateSpecialFocusContent] 匹配成功:', inputItem, '->', found);
            } else {
                unmatched.push(inputItem);
                console.log('[validateSpecialFocusContent] 匹配失败:', inputItem);
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

        console.log('[validateSpecialFocusContent] 验证结果:', { valid, matched, unmatched, message });
        return { valid, matched, unmatched, message };
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
        if (!optionsContainer || !input) {
            console.warn('[autoSelectSpecialFocusOptions] 未找到容器或输入框');
            return;
        }

        console.log('[autoSelectSpecialFocusOptions] 开始勾选，目标值:', selectedValues);

        // 清除所有选中状态
        optionsContainer.querySelectorAll('.select-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // 获取所有可用选项
        const allOptions = optionsContainer.querySelectorAll('.select-option');
        console.log('[autoSelectSpecialFocusOptions] 可用选项数量:', allOptions.length);

        // 设置新的选中状态 - 使用遍历方式避免CSS选择器特殊字符问题
        const matchedValues = [];
        selectedValues.forEach(value => {
            let found = false;
            allOptions.forEach(option => {
                const optionValue = option.dataset.value;
                if (optionValue === value) {
                    option.classList.add('selected');
                    matchedValues.push(value);
                    found = true;
                    console.log('[autoSelectSpecialFocusOptions] 已勾选:', value);
                }
            });
            if (!found) {
                console.warn('[autoSelectSpecialFocusOptions] 未找到选项:', value);
            }
        });

        // 更新输入框显示
        if (matchedValues.length > 0) {
            input.value = matchedValues.join(' / ');
        } else {
            input.value = '';
        }

        // 触发回调
        if (onChange) {
            onChange(matchedValues);
        }
    },

    /**
     * 格式化命令内容
     * 去除空格，然后在"/"两侧加入空格
     * @param {string} content - 原始内容
     * @returns {string} 格式化后的内容
     */
    formatCommandContent(content) {
        if (!content) return '';

        // 去除所有空格
        let formatted = content.replace(/\s/g, '');

        // 在"/"两侧加入空格
        formatted = formatted.replace(/\//g, ' / ');

        return formatted;
    },

    /**
     * 格式化专项关注内容
     * 处理列表格式，用"/"分割各个专项关注事件
     * @param {string} content - 原始内容，如：["涉黑、涉恶信件","社会舆情信件"]
     * @returns {string} 格式化后的内容，如：涉黑、涉恶信件 / 社会舆情信件
     */
    formatSpecialFocusContent(content) {
        if (!content) return '';

        try {
            // 尝试解析JSON列表
            let items = [];

            // 去除首尾空格
            content = content.trim();

            // 检查是否是JSON数组格式
            if (content.startsWith('[') && content.endsWith(']')) {
                // 解析JSON数组
                items = JSON.parse(content);
            } else if (content.includes('","')) {
                // 处理类似 "item1","item2" 的格式
                items = content.split('","').map(item => item.replace(/^"|"$/g, ''));
            } else {
                // 单个项目
                items = [content.replace(/^"|"$/g, '')];
            }

            // 确保items是数组
            if (!Array.isArray(items)) {
                items = [items];
            }

            // 用"/"连接各个专项关注事件
            return items.join(' / ');
        } catch (e) {
            // 解析失败，返回原始内容（去除引号）
            return content.replace(/^\["?|"?\]$/g, '');
        }
    },

    /**
     * 构建AI消息列表
     * @param {Object} options - 配置选项
     * @param {string} options.userMessage - 用户消息
     * @param {Array} options.messageHistory - 消息历史
     * @param {Array} options.prompt - 系统提示词
     * @param {Object} options.letterInfo - 信件详细信息
     * @param {Array} options.sameIdLetter - 同身份证其他信件
     * @param {boolean} options.autoDispatchChecked - 自动下发状态
     * @param {Array} options.units - 单位列表，用于转换单位编码为单位名称
     * @param {string} options.notes - 下发备注
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

        // 获取当前用户信息，放在提示词最开始
        const userInfoPrompt = this.getUserInfoPrompt();

        // 获取当前时间（精确到秒）
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // 检查消息历史中是否已存在时间消息
        const timeMessageIndex = messageHistory.findIndex(
            msg => msg.type === 'time'
        );

        if (timeMessageIndex !== -1) {
            // 更新时间消息的内容
            messageHistory[timeMessageIndex].content = `当前时间：${timeString}`;
        } else {
            // 添加新的时间消息到历史记录开头
            messageHistory.unshift({
                role: 'system',
                content: `当前时间：${timeString}`,
                type: 'time'
            });
        }

        // 构建信件详细信息提示词
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

            // 添加下发备注
            if (notes) {
                letterInfoPrompt += `下发备注：${notes}\n`;
            }

            // 添加流转记录（后台已解析为列表格式）
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
                        // 备注已经是JSON对象，直接使用
                        const remark = record['备注'];
                        letterInfoPrompt += `    备注：${JSON.stringify(remark)}\n`;
                    }
                });
            }
        }

        // 构建历史来信提示词
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

                // 添加历史信件的流转记录
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

        // 构建自动下发状态提示词
        const autoDispatchPrompt = `自动下发模式：${autoDispatchChecked ? '已开启' : '未开启'}`;

        // 构建消息列表：用户信息 + 系统提示词 + 信件信息 + 历史来信 + 自动下发状态 + 历史消息 + 当前用户消息
        const messages = [
            ...(userInfoPrompt ? [{ role: 'system', content: userInfoPrompt }] : []),
            ...prompt,
            ...(letterInfoPrompt ? [{ role: 'system', content: letterInfoPrompt }] : []),
            ...(historyLettersPrompt ? [{ role: 'system', content: historyLettersPrompt }] : []),
            { role: 'system', content: autoDispatchPrompt, type: 'auto_dispatch' },
            ...messageHistory.slice(-10),
            { role: 'user', content: userMessage }
        ];

        // 在控制台打印组装的消息（每个消息取前500个字符）
        console.log('========== 组装的消息列表 ==========');
        messages.forEach((msg, index) => {
            const content = msg.content ? msg.content.substring(0, 500) : '';
            const suffix = msg.content && msg.content.length > 500 ? '...' : '';
            console.log(`[${index}] role: ${msg.role}, type: ${msg.type || 'none'}`);
            console.log(`    content: ${content}${suffix}`);
        });
        console.log('====================================');

        return messages;
    },

    /**
     * 根据身份证号查询其他信件
     * @param {string} idCard - 身份证号
     * @param {string} excludeLetterNumber - 需要排除的信件编号（当前信件）
     * @returns {Promise<Array>} 其他信件列表
     */
    async getLettersByIdCard(idCard, excludeLetterNumber) {
        try {
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
                // 排除当前信件，只返回其他信件
                return result.data.filter(letter => letter['信件编号'] !== excludeLetterNumber);
            }
            return [];
        } catch (error) {
            console.error('根据身份证号查询信件失败:', error);
            return [];
        }
    }
};
