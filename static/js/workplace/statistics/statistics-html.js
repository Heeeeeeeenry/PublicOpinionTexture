/**
 * 统计工作台HTML生成模块
 *
 * 负责动态生成页面HTML结构
 * 使用通用样式类，保持与首页风格一致
 */

const StatisticsHtml = {
    /**
     * 生成标题面板的HTML代码
     * @returns {string} HTML字符串
     */
    getTitleHtml() {
        return `
            <div class="wp-header" id="statistics-header">
                <div class="wp-header-left">
                    <div class="wp-header-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="wp-header-content">
                        <h2 class="wp-header-title">统计工作台</h2>
                        <p class="wp-header-subtitle">数据洞察中心，实时掌握民意动态</p>
                    </div>
                </div>
                <div class="wp-header-right">
                    <div class="wp-panel flex items-center gap-3 px-5 py-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-400 font-medium" id="header-date">2024年1月1日</span>
                            <span class="text-lg font-bold text-gray-700 font-mono tracking-wider" id="header-realtime">00:00:00</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成时间筛选面板的HTML代码
     * @returns {string} HTML字符串
     */
    getTimeFilterHtml() {
        return `
            <div class="wp-panel" id="time-filter-panel">
                <div class="wp-panel-body flex items-center gap-4 flex-wrap">
                    <div class="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                        <i class="fas fa-calendar-alt text-sm"></i>
                    </div>
                    <div class="text-sm font-semibold text-gray-700">时间范围</div>
                    <div class="flex gap-2 flex-wrap ml-auto items-center">
                        <div id="custom-date-range" class="hidden flex items-center gap-2 mr-2">
                            <input type="date" id="custom-start-date" class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <span class="text-gray-400">至</span>
                            <input type="date" id="custom-end-date" class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <button id="btn-apply-custom-date" class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                                应用
                            </button>
                        </div>
                        <button class="wp-filter-chip" data-period="custom">
                            <span class="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            <span>自定义</span>
                        </button>
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
        `;
    },



    /**
     * 生成图表区域的HTML代码
     * @returns {string} HTML字符串
     */
    getChartsHtml() {
        return `
            <!-- 第一行图表：趋势图 + 状态分布 -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- 信件趋势折线图 -->
                <div class="wp-panel lg:col-span-2" id="trend-chart-panel">
                    <div class="wp-panel-header">
                        <div class="wp-panel-title">
                            <i class="fas fa-chart-line text-blue-500"></i>
                            <span>信件趋势</span>
                        </div>
                    </div>
                    <div class="wp-panel-body">
                        <div id="trend-chart" style="width: 100%; height: 320px;"></div>
                    </div>
                </div>

                <!-- 状态分布饼图 -->
                <div class="wp-panel" id="status-chart-panel">
                    <div class="wp-panel-header">
                        <div class="wp-panel-title">
                            <i class="fas fa-chart-pie text-purple-500"></i>
                            <span>状态分布</span>
                        </div>
                    </div>
                    <div class="wp-panel-body">
                        <div id="status-chart" style="width: 100%; height: 320px;"></div>
                    </div>
                </div>
            </div>

            <!-- 第二行图表：分类统计 -->
            <div class="wp-panel" id="category-chart-panel">
                <div class="wp-panel-header">
                    <div class="wp-panel-title">
                        <i class="fas fa-chart-bar text-green-500"></i>
                        <span>分类统计</span>
                    </div>
                </div>
                <div class="wp-panel-body">
                    <div id="category-chart" style="width: 100%; height: 280px;"></div>
                </div>
            </div>
        `;
    },

    /**
     * 生成完整的页面HTML代码
     * @returns {string} HTML字符串
     */
    getFullPageHtml() {
        return `
            <div class="statistics-container flex flex-col gap-6" id="statistics-container">
                ${this.getTitleHtml()}
                ${this.getTimeFilterHtml()}
                ${this.getChartsHtml()}
            </div>
        `;
    }
};
