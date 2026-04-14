/**
 * 首页辅助工具模块
 *
 * 负责首页的HTML生成、数据获取、时间处理等辅助功能
 * 控制器负责执行逻辑，具体实现放在此文件中
 */

const HomeTools = {
    /**
     * 生成首页HTML结构
     * @returns {string} HTML字符串
     */
    generateHTML() {
        return `
            <!-- 背景装饰元素 -->
            <div class="home-bg-decoration">
                <div class="home-floating-shape shape-1"></div>
                <div class="home-floating-shape shape-2"></div>
                <div class="home-floating-shape shape-3"></div>
                <div class="home-floating-shape shape-4"></div>
            </div>

            <!-- 顶部欢迎区域 -->
            <div class="wp-panel-gradient-top mb-6" id="welcome-banner">
                <div class="flex items-center justify-between">
                    <div class="welcome-text">
                        <div class="greeting-line flex items-center gap-2 mb-2">
                            <span class="greeting-emoji text-xl wp-wave">👋</span>
                            <span class="greeting-text text-sm text-gray-500 font-medium" id="greeting-text">早上好</span>
                        </div>
                        <h1 class="welcome-title text-2xl font-bold text-gray-900 mb-1">
                            欢迎回来，<span id="user-display-name" class="wp-text-gradient">未知用户</span>
                        </h1>
                        <p class="welcome-subtitle text-sm text-gray-400">今天是美好的一天，让我们一起高效工作</p>
                    </div>
                    <div class="quick-stats">
                        <div class="wp-panel flex items-center gap-3 px-5 py-4">
                            <div class="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="time-date text-xs text-gray-400 font-medium" id="header-date">2024年1月1日</span>
                                <span class="time-realtime text-lg font-bold text-gray-700 font-mono tracking-wider" id="header-realtime">00:00:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 时间范围筛选面板 -->
            <div class="wp-panel mb-8" id="time-filter-panel">
                <div class="wp-panel-body flex items-center gap-4 flex-wrap">
                    <div class="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                        <i class="fas fa-calendar-alt text-sm"></i>
                    </div>
                    <div class="text-sm font-semibold text-gray-700">时间范围</div>
                    <div class="flex gap-2 flex-wrap ml-auto">
                        <button class="wp-filter-chip active" data-period="day">
                            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            <span>当天</span>
                        </button>
                        <button class="wp-filter-chip" data-period="week">
                            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            <span>本周</span>
                        </button>
                        <button class="wp-filter-chip" data-period="month">
                            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            <span>本月</span>
                        </button>
                        <button class="wp-filter-chip" data-period="year">
                            <span class="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            <span>本年</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 统计卡片区域 -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="stats-container">
                <!-- 信件总量 -->
                <div class="wp-stat-card" data-index="0">
                    <div class="wp-stat-card-glow"></div>
                    <div class="wp-stat-header">
                        <div class="wp-stat-icon blue">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="wp-stat-trend up">
                            <i class="fas fa-arrow-trend-up text-xs"></i>
                            <span>实时</span>
                        </div>
                    </div>
                    <div class="wp-stat-body">
                        <p class="wp-stat-label">信件总量</p>
                        <h3 class="wp-stat-value" id="home-total-count">0</h3>
                    </div>
                    <div class="wp-stat-progress">
                        <div class="wp-stat-progress-bar blue" id="progress-total" style="width: 0%"></div>
                    </div>
                </div>

                <!-- 预处理 -->
                <div class="wp-stat-card" data-index="1">
                    <div class="wp-stat-card-glow"></div>
                    <div class="wp-stat-header">
                        <div class="wp-stat-icon gray">
                            <i class="fas fa-cog"></i>
                        </div>
                        <div class="wp-stat-trend info">
                            <i class="fas fa-robot text-xs"></i>
                            <span>AI</span>
                        </div>
                    </div>
                    <div class="wp-stat-body">
                        <p class="wp-stat-label">预处理</p>
                        <h3 class="wp-stat-value" id="home-preprocessing-count">0</h3>
                    </div>
                    <div class="wp-stat-progress">
                        <div class="wp-stat-progress-bar gray" id="progress-preprocessing" style="width: 0%"></div>
                    </div>
                </div>

                <!-- 正在处理 -->
                <div class="wp-stat-card" data-index="2">
                    <div class="wp-stat-card-glow"></div>
                    <div class="wp-stat-header">
                        <div class="wp-stat-icon yellow">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <div class="wp-stat-trend yellow">
                            <i class="fas fa-spinner text-xs"></i>
                            <span>处理</span>
                        </div>
                    </div>
                    <div class="wp-stat-body">
                        <p class="wp-stat-label">正在处理</p>
                        <h3 class="wp-stat-value" id="home-processing-count">0</h3>
                    </div>
                    <div class="wp-stat-progress">
                        <div class="wp-stat-progress-bar yellow" id="progress-processing" style="width: 0%"></div>
                    </div>
                </div>

                <!-- 正在反馈 -->
                <div class="wp-stat-card" data-index="3">
                    <div class="wp-stat-card-glow"></div>
                    <div class="wp-stat-header">
                        <div class="wp-stat-icon green">
                            <i class="fas fa-reply"></i>
                        </div>
                        <div class="wp-stat-trend success">
                            <i class="fas fa-comments text-xs"></i>
                            <span>反馈</span>
                        </div>
                    </div>
                    <div class="wp-stat-body">
                        <p class="wp-stat-label">正在反馈</p>
                        <h3 class="wp-stat-value" id="home-feedbacking-count">0</h3>
                    </div>
                    <div class="wp-stat-progress">
                        <div class="wp-stat-progress-bar green" id="progress-feedbacking" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 获取问候语和表情
     * @returns {Object} 包含greeting和emoji的对象
     */
    getGreeting() {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return { greeting: '早上好', emoji: '🌅' };
        } else if (hour >= 12 && hour < 14) {
            return { greeting: '中午好', emoji: '☀️' };
        } else if (hour >= 14 && hour < 18) {
            return { greeting: '下午好', emoji: '🌤️' };
        } else {
            return { greeting: '晚上好', emoji: '🌙' };
        }
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
     * 格式化本地日期时间为字符串
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的字符串
     */
    formatLocalDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * 根据时间范围获取开始和结束时间
     * @param {string} period - 时间范围：day|week|month|year
     * @returns {Object} 包含startTime和endTime的对象
     */
    getTimeRange(period) {
        const now = new Date();
        let startTime, endTime;

        switch (period) {
            case 'day':
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'week': {
                const dayOfWeek = now.getDay();
                const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            }
            case 'month':
                startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'year':
                startTime = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                endTime = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            default:
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        }

        return { startTime, endTime };
    },

    /**
     * 加载用户信息
     * @returns {Promise<Object>} 用户信息
     */
    async loadUserInfo() {
        try {
            const response = await fetch('/api/auth/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'check',
                    args: {}
                })
            });
            const data = await response.json();

            if (data.is_authenticated && data.data) {
                return {
                    name: data.data.nickname || data.data.name || '管理员',
                    ...data.data
                };
            }
            return null;
        } catch (error) {
            console.error('[HomeTools] 加载用户信息失败:', error);
            return null;
        }
    },

    /**
     * 加载统计数据
     * @param {string} period - 时间范围
     * @returns {Promise<Object>} 统计数据
     */
    async loadStatistics(period) {
        try {
            const { startTime, endTime } = this.getTimeRange(period);

            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_statistics',
                    args: {
                        start_time: this.formatLocalDateTime(startTime),
                        end_time: this.formatLocalDateTime(endTime)
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('[HomeTools] 加载统计数据失败:', error);
            return null;
        }
    },

    /**
     * 数字增长动画
     * @param {HTMLElement} element - 目标元素
     * @param {number} target - 目标值
     * @param {number} duration - 动画持续时间
     */
    animateNumber(element, target, duration = 1500) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (target - start) * easeOutQuart);

            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(update);
    }
};

// 暴露到全局
window.HomeTools = HomeTools;
