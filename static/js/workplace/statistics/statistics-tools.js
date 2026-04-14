/**
 * 统计工作台工具函数模块
 *
 * 包含数据加载、格式化、API调用等工具方法
 */

const StatisticsTools = {
    /**
     * 获取统计数据
     * @param {Object|string} params - 参数对象或时间周期字符串 (day/week/month/year/custom)
     * @returns {Promise<Object>} 统计数据
     */
    async getStatistics(params = 'day') {
        // 处理参数：如果是字符串，转换为对象
        const options = typeof params === 'string' ? { period: params } : params;
        const period = options.period || 'day';

        let start, end;

        // 如果是自定义时间段，使用传入的日期
        if (period === 'custom' && options.startDate && options.endDate) {
            start = `${options.startDate} 00:00:00`;
            end = `${options.endDate} 23:59:59`;
        } else {
            const timeRange = this.getTimeRange(period);
            start = timeRange.start;
            end = timeRange.end;
        }

        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_statistics',
                args: {
                    start_time: start,
                    end_time: end
                }
            })
        });

        const result = await response.json();
        return result.success ? (result.data || {}) : {};
    },

    /**
     * 获取趋势数据
     * @param {string} period - 时间周期
     * @returns {Promise<Array>} 趋势数据
     */
    async getTrendData(period = 'day') {
        const timeRange = this.getTimeRange(period);

        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_trend_data',
                args: {
                    start_time: timeRange.start,
                    end_time: timeRange.end,
                    period: period
                }
            })
        });

        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 获取分类统计数据
     * @param {string} period - 时间周期
     * @returns {Promise<Array>} 分类统计数据
     */
    async getCategoryStats(period = 'day') {
        const timeRange = this.getTimeRange(period);

        const response = await fetch('/api/letter/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order: 'get_category_statistics',
                args: {
                    start_time: timeRange.start,
                    end_time: timeRange.end
                }
            })
        });

        const result = await response.json();
        return result.success ? (result.data || []) : [];
    },

    /**
     * 根据周期获取时间范围
     * @param {string} period - 时间周期 (day/week/month/year)
     * @returns {Object} 包含start和end时间字符串的对象
     */
    getTimeRange(period) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        let start = '';
        let end = '';

        switch (period) {
            case 'day':
                // 当天：00:00:00 到 23:59:59
                start = `${year}-${month}-${day} 00:00:00`;
                end = `${year}-${month}-${day} 23:59:59`;
                break;

            case 'week':
                // 本周：从周一开始
                const dayOfWeek = now.getDay() || 7; // 0是周日，转为7
                const monday = new Date(now);
                monday.setDate(now.getDate() - dayOfWeek + 1);
                const sunday = new Date(now);
                sunday.setDate(now.getDate() + (7 - dayOfWeek));

                start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')} 00:00:00`;
                end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')} 23:59:59`;
                break;

            case 'month':
                // 本月
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                start = `${year}-${month}-01 00:00:00`;
                end = `${year}-${month}-${lastDay} 23:59:59`;
                break;

            case 'year':
                // 本年
                start = `${year}-01-01 00:00:00`;
                end = `${year}-12-31 23:59:59`;
                break;

            default:
                start = `${year}-${month}-${day} 00:00:00`;
                end = `${year}-${month}-${day} 23:59:59`;
        }

        return { start, end };
    },

    /**
     * 格式化日期时间
     * @param {Date} date - 日期对象
     * @returns {Object} 包含date和time的对象
     */
    formatDateTime(date = new Date()) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = weekdays[date.getDay()];

        const dateStr = `${year}年${month}月${day}日 ${weekday}`;

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const timeStr = `${hours}:${minutes}:${seconds}`;

        return { date: dateStr, time: timeStr };
    },

    /**
     * 动画化数字增长
     * @param {HTMLElement} element - 目标元素
     * @param {number} targetValue - 目标值
     * @param {number} duration - 动画持续时间（毫秒）
     */
    animateNumber(element, targetValue, duration = 1000) {
        if (!element) return;

        const startValue = 0;
        const startTime = performance.now();

        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 使用easeOutQuart缓动函数
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);

            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        requestAnimationFrame(updateNumber);
    },

    /**
     * 动画化进度条
     * @param {HTMLElement} element - 进度条元素
     * @param {number} percentage - 百分比 (0-100)
     * @param {number} duration - 动画持续时间（毫秒）
     */
    animateProgressBar(element, percentage, duration = 1000) {
        if (!element) return;

        element.style.transition = `width ${duration}ms ease-out`;
        element.style.width = `${percentage}%`;
    }
};
