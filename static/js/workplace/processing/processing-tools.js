/**
 * 处理工作台工具函数模块
 *
 * 提供API调用、数据格式化、HTML渲染辅助等工具函数
 */

const ProcessingTools = {
    /**
     * 获取待处理信件列表
     * @returns {Promise<Array>} 信件列表
     */
    async fetchLetterList() {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_processing_list',
                args: {}
            })
        });
        const result = await response.json();
        if (result.success) {
            return result.data || [];
        }
        throw new Error(result.message || '获取信件列表失败');
    },

    /**
     * 获取信件详情
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Object>} 信件详情
     */
    async fetchLetterDetail(letterNumber) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_detail',
                args: { '信件编号': letterNumber }
            })
        });
        const result = await response.json();
        if (result.success) {
            return result.data || {};
        }
        throw new Error(result.message || '获取信件详情失败');
    },

    /**
     * 获取信件流转记录
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Array>} 流转记录列表
     */
    async fetchFlowRecords(letterNumber) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_detail',
                args: { '信件编号': letterNumber }
            })
        });
        const result = await response.json();
        if (result.success && result.data) {
            return result.data['流转记录'] || [];
        }
        return [];
    },

    /**
     * 获取历史来信
     * @param {string} idCard - 身份证号
     * @returns {Promise<Array>} 历史来信列表
     */
    async fetchHistoryLetters(idCard) {
        if (!idCard) return [];

        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_by_idcard',
                args: { '身份证号': idCard }
            })
        });
        const result = await response.json();
        if (result.success) {
            return result.data || [];
        }
        return [];
    },

    /**
     * 获取信件反馈列表
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Array>} 反馈列表
     */
    async fetchFeedbacks(letterNumber) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_detail',
                args: { '信件编号': letterNumber }
            })
        });
        const result = await response.json();
        if (result.success && result.data) {
            return result.data['反馈信息'] || [];
        }
        return [];
    },

    /**
     * 添加反馈
     * @param {string} letterNumber - 信件编号
     * @param {string} content - 反馈内容
     * @returns {Promise<Object>} 添加结果
     */
    async addFeedback(letterNumber, content) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'add_feedback',
                args: {
                    '信件编号': letterNumber,
                    '反馈内容': content
                }
            })
        });
        const result = await response.json();
        if (result.success) {
            return result;
        }
        throw new Error(result.message || '添加反馈失败');
    },

    /**
     * 获取信件分类列表
     * @returns {Promise<Array>} 分类列表
     */
    async fetchCategories() {
        const response = await fetch('/api/setting/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'category_list',
                args: {}
            })
        });
        const result = await response.json();
        if (result.success) {
            return result.data || [];
        }
        return [];
    },

    /**
     * 退回信件
     * @param {string} letterNumber - 信件编号
     * @param {string} reason - 退回原因
     * @returns {Promise<Object>} 退回结果
     */
    async returnLetter(letterNumber, reason) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'return_letter',
                args: {
                    '信件编号': letterNumber,
                    '退回原因': reason
                }
            })
        });
        const result = await response.json();
        if (result.success) {
            return result;
        }
        throw new Error(result.message || '退回信件失败');
    },

    /**
     * 标记信件不属实
     * @param {string} letterNumber - 信件编号
     * @param {Object} data - 提交数据
     * @returns {Promise<Object>} 操作结果
     */
    async markInvalid(letterNumber, data) {
        const formData = new FormData();
        formData.append('order', 'mark_invalid');
        
        const args = {
            letter_number: letterNumber,
            reason: data.remark || '',
            letterData: data.letterData || {}
        };
        formData.append('args', JSON.stringify(args));
        
        if (data.recordings && data.recordings.length > 0) {
            data.recordings.forEach((rec, index) => {
                formData.append(`recordings[${index}]`, rec.file);
            });
        }
        
        if (data.resultFiles && data.resultFiles.length > 0) {
            data.resultFiles.forEach((res, index) => {
                formData.append(`resultFiles[${index}]`, res.file);
            });
        }

        const response = await fetch('/api/letter/', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            return result;
        }
        throw new Error(result.message || '标记不属实失败');
    },

    /**
     * 提交信件处理结果
     * @param {string} letterNumber - 信件编号
     * @param {Object} data - 提交数据
     * @returns {Promise<Object>} 提交结果
     */
    async submitLetter(letterNumber, data) {
        const formData = new FormData();
        formData.append('order', 'submit_processing');
        
        const args = {
            '信件编号': letterNumber,
            'category': data.category || '',
            'remark': data.remark || '',
            'letterData': data.letterData || {}
        };
        formData.append('args', JSON.stringify(args));
        
        if (data.recordings && data.recordings.length > 0) {
            data.recordings.forEach((rec, index) => {
                formData.append(`recordings[${index}]`, rec.file);
            });
        }
        
        if (data.resultFiles && data.resultFiles.length > 0) {
            data.resultFiles.forEach((res, index) => {
                formData.append(`resultFiles[${index}]`, res.file);
            });
        }

        const response = await fetch('/api/letter/', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            return result;
        }
        throw new Error(result.message || '提交失败');
    },

    /**
     * 更新信件字段
     * @param {string} letterNumber - 信件编号
     * @param {string} field - 字段名
     * @param {string} value - 字段值
     * @returns {Promise<Object>} 更新结果
     */
    async updateLetterField(letterNumber, field, value) {
        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'update',
                args: {
                    '信件编号': letterNumber,
                    [field]: value
                }
            })
        });
        const result = await response.json();
        if (result.success) {
            return result;
        }
        throw new Error(result.message || '更新字段失败');
    },

    /**
     * 格式化时间显示
     * @param {string|Date} time - 时间
     * @param {boolean} showTime - 是否显示时分秒
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(time, showTime = true) {
        if (!time) return '-';

        const date = new Date(time);
        if (isNaN(date.getTime())) return '-';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        if (showTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        return `${year}-${month}-${day}`;
    },

    /**
     * 格式化倒计时显示
     * @param {number} seconds - 剩余秒数
     * @returns {string} 格式化后的时间字符串
     */
    formatCountdown(seconds) {
        if (seconds <= 0) return '00:00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    /**
     * 计算剩余时间（秒）
     * @param {string} deadline - 截止时间
     * @returns {number} 剩余秒数
     */
    calculateRemainingTime(deadline) {
        if (!deadline) return 0;

        const deadlineDate = new Date(deadline);
        const now = new Date();
        const diff = Math.floor((deadlineDate - now) / 1000);

        return Math.max(0, diff);
    },

    /**
     * 获取信件分类显示名称
     * @param {Object} letter - 信件数据
     * @returns {string} 分类名称（完整路径）
     */
    getCategoryName(letter) {
        const c1 = letter['信件一级分类'];
        const c2 = letter['信件二级分类'];
        const c3 = letter['信件三级分类'];

        if (c1 && c2 && c3) {
            return `${c1} / ${c2} / ${c3}`;
        } else if (c1 && c2) {
            return `${c1} / ${c2}`;
        } else if (c1) {
            return c1;
        }
        return '未分类';
    },

    /**
     * 构建分类选项列表（用于下拉框）
     * @param {Array} categories - 原始分类数据
     * @returns {Array} 格式化后的选项列表
     */
    buildCategoryOptions(categories) {
        const options = [];

        if (!Array.isArray(categories)) {
            return options;
        }

        const level1Set = new Set();
        const level2Set = new Set();

        categories.forEach(cat => {
            const level1 = cat['一级分类'];
            const level2 = cat['二级分类'];
            const level3 = cat['三级分类'];

            if (level1 && !level1Set.has(level1)) {
                level1Set.add(level1);
                options.push({
                    type: 'group',
                    label: level1
                });
            }

            if (level1 && level2 && !level2Set.has(`${level1}/${level2}`)) {
                level2Set.add(`${level1}/${level2}`);
            }

            if (level1 && level2 && level3) {
                options.push({
                    value: cat['序号'],
                    label: `${level1} > ${level2} > ${level3}`,
                    path: `${level1}/${level2}/${level3}`
                });
            } else if (level1 && level2) {
                options.push({
                    value: cat['序号'],
                    label: `${level1} > ${level2}`,
                    path: `${level1}/${level2}`
                });
            } else if (level1) {
                options.push({
                    value: cat['序号'],
                    label: level1,
                    path: level1
                });
            }
        });

        return options;
    },

    /**
     * 过滤分类选项
     * @param {Array} options - 选项列表
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 过滤后的选项列表
     */
    filterCategoryOptions(options, keyword) {
        if (!keyword) return options;

        const lowerKeyword = keyword.toLowerCase();
        return options.filter(opt => {
            if (opt.type === 'group') return false;
            return opt.label.toLowerCase().includes(lowerKeyword);
        });
    },

    /**
     * 验证手机号格式
     * @param {string} phone - 手机号
     * @returns {boolean} 是否有效
     */
    validatePhone(phone) {
        if (!phone) return true;
        return /^1[3-9]\d{9}$/.test(phone);
    },

    /**
     * 验证身份证号格式
     * @param {string} idCard - 身份证号
     * @returns {boolean} 是否有效
     */
    validateIdCard(idCard) {
        if (!idCard) return true;
        return /^\d{17}[\dXx]$/.test(idCard);
    },

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     */
    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container') || document.body;

        const messageEl = document.createElement('div');
        messageEl.className = `wp-message wp-message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(messageEl);

        setTimeout(() => {
            messageEl.classList.add('show');
        }, 10);

        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }, 3000);
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 时间限制（毫秒）
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};
