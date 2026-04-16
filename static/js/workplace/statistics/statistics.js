/**
 * 统计工作台控制器
 *
 * 负责统计工作台的初始化、数据加载和图表渲染
 * 使用通用动画WpAnimation和通用样式，与首页风格保持一致
 */

class StatisticsController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.currentPeriod = 'day';
        this.pollingInterval = null;
        this.POLLING_INTERVAL_MS = 5000;
        this.lastStatistics = {};

        // 自定义日期范围
        this.customStartDate = null;
        this.customEndDate = null;

        // ECharts 实例
        this.trendChart = null;
        this.statusChart = null;
        this.categoryChart = null;
    }

    /**
     * 初始化统计工作台
     * @param {HTMLElement} container - 容器元素
     */
    async init(container) {
        console.log('[StatisticsController] 初始化统计工作台');
        this.container = container;

        // 生成并插入HTML
        this.container.innerHTML = StatisticsHtml.getFullPageHtml();

        // 初始化图表
        this.initCharts();

        // 绑定时间筛选按钮事件
        this.bindTimeFilterEvents();

        // 启动实时时间更新
        this.startRealtimeClock();

        // 加载统计数据
        await this.loadStatistics();

        // 执行入场动画（仅首次）
        if (!this.animationPlayed) {
            await this.playEntranceAnimation();
            this.animationPlayed = true;
        }

        // 启动定时轮询
        this.startPolling();

        this.isInitialized = true;
        console.log('[StatisticsController] 统计工作台初始化完成');
    }

    /**
     * 显示页面
     */
    async show() {
        console.log('[StatisticsController] 页面显示');
        this.ensureElementsVisible();

        // 重新渲染图表（解决切换页面后图表不显示的问题）
        if (this.trendChart) this.trendChart.resize();
        if (this.statusChart) this.statusChart.resize();
        if (this.categoryChart) this.categoryChart.resize();

        // 异步刷新数据（不阻塞页面切换）
        this.refresh().catch(err => {
            console.error('[StatisticsController] 刷新数据失败:', err);
        });
        
        this.startPolling();
    }

    /**
     * 停止所有动画
     * 当页面切换时立即调用，确保动画不会阻塞页面切换
     */
    stopAnimation() {
        console.log('[StatisticsController] 停止动画');
        // 确保重置所有元素到可见状态
        this.ensureElementsVisible();
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[StatisticsController] 页面隐藏');
        this.stopPolling();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        console.log('[StatisticsController] 刷新数据');
        if (!this.isInitialized) return;
        await this.loadStatistics();
    }

    /**
     * 启动定时轮询
     */
    startPolling() {
        this.stopPolling();
        console.log('[StatisticsController] 启动定时轮询，间隔5秒');
        this.pollingInterval = setInterval(async () => {
            console.log('[StatisticsController] 定时轮询：刷新统计数据');
            await this.loadStatistics();
        }, this.POLLING_INTERVAL_MS);
    }

    /**
     * 停止定时轮询
     */
    stopPolling() {
        if (this.pollingInterval) {
            console.log('[StatisticsController] 停止定时轮询');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * 确保所有元素可见
     */
    ensureElementsVisible() {
        const selectors = [
            '#statistics-header',
            '#time-filter-panel',
            '#trend-chart-panel',
            '#status-chart-panel',
            '#category-chart-panel'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        });
    }

    /**
     * 播放入场动画序列
     * 使用通用动画库 WpAnimation
     */
    async playEntranceAnimation() {
        // 先将需要动画的元素设置为不可见
        const animatedElements = [
            '#statistics-header',
            '#time-filter-panel',
            '#trend-chart-panel',
            '#status-chart-panel',
            '#category-chart-panel'
        ];

        animatedElements.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });

        // 使用通用动画库依次播放动画
        const header = this.container.querySelector('#statistics-header');
        const timeFilterPanel = this.container.querySelector('#time-filter-panel');
        const trendChartPanel = this.container.querySelector('#trend-chart-panel');
        const statusChartPanel = this.container.querySelector('#status-chart-panel');
        const categoryChartPanel = this.container.querySelector('#category-chart-panel');

        // 1. 标题栏淡入
        if (header) {
            await WpAnimation.moveAndFadeIn(header, 'down', 30, 800, 0);
        }

        // 2. 时间筛选面板淡入
        if (timeFilterPanel) {
            await WpAnimation.moveAndFadeIn(timeFilterPanel, 'down', 20, 600, 0);
        }

        // 3. 图表区域淡入
        if (trendChartPanel) {
            await WpAnimation.moveAndFadeIn(trendChartPanel, 'down', 20, 600, 0);
        }
        if (statusChartPanel) {
            await WpAnimation.moveAndFadeIn(statusChartPanel, 'down', 20, 600, 0);
        }
        if (categoryChartPanel) {
            await WpAnimation.moveAndFadeIn(categoryChartPanel, 'down', 20, 600, 0);
        }
    }

    /**
     * 绑定时间筛选按钮事件
     */
    bindTimeFilterEvents() {
        const filterPanel = this.container.querySelector('#time-filter-panel');
        if (!filterPanel) return;

        const buttons = filterPanel.querySelectorAll('.wp-filter-chip');
        const customDateRange = this.container.querySelector('#custom-date-range');
        const startDateInput = this.container.querySelector('#custom-start-date');
        const endDateInput = this.container.querySelector('#custom-end-date');
        const applyBtn = this.container.querySelector('#btn-apply-custom-date');

        // 设置默认日期值为今天
        const today = new Date().toISOString().split('T')[0];
        if (startDateInput) startDateInput.value = today;
        if (endDateInput) endDateInput.value = today;

        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const period = btn.dataset.period;

                // 更新按钮状态
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 更新当前周期
                this.currentPeriod = period;

                // 处理自定义日期显示/隐藏
                if (period === 'custom') {
                    if (customDateRange) {
                        customDateRange.classList.remove('hidden');
                    }
                } else {
                    if (customDateRange) {
                        customDateRange.classList.add('hidden');
                    }
                    // 重新加载数据
                    await this.loadStatistics();
                }
            });
        });

        // 绑定自定义日期应用按钮事件
        if (applyBtn) {
            applyBtn.addEventListener('click', async () => {
                const startDate = startDateInput ? startDateInput.value : null;
                const endDate = endDateInput ? endDateInput.value : null;

                if (!startDate || !endDate) {
                    console.warn('[StatisticsController] 请选择完整的日期范围');
                    return;
                }

                if (new Date(startDate) > new Date(endDate)) {
                    console.warn('[StatisticsController] 开始日期不能晚于结束日期');
                    return;
                }

                this.customStartDate = startDate;
                this.customEndDate = endDate;

                await this.loadStatistics();
            });
        }
    }

    /**
     * 启动实时时钟更新
     */
    startRealtimeClock() {
        const updateClock = () => {
            const dateEl = this.container.querySelector('#header-date');
            const timeEl = this.container.querySelector('#header-realtime');

            if (dateEl && timeEl) {
                const { date, time } = StatisticsTools.formatDateTime();
                dateEl.textContent = date;
                timeEl.textContent = time;
            }
        };

        // 立即执行一次
        updateClock();

        // 每秒更新
        setInterval(updateClock, 1000);
    }

    /**
     * 初始化 ECharts 图表
     */
    initCharts() {
        // 趋势图
        const trendChartDom = this.container.querySelector('#trend-chart');
        if (trendChartDom && typeof echarts !== 'undefined') {
            this.trendChart = echarts.init(trendChartDom);
        }

        // 状态分布图
        const statusChartDom = this.container.querySelector('#status-chart');
        if (statusChartDom && typeof echarts !== 'undefined') {
            this.statusChart = echarts.init(statusChartDom);
        }

        // 分类统计图
        const categoryChartDom = this.container.querySelector('#category-chart');
        if (categoryChartDom && typeof echarts !== 'undefined') {
            this.categoryChart = echarts.init(categoryChartDom);
        }

        // 监听窗口大小变化，自动调整图表大小
        window.addEventListener('resize', () => {
            if (this.trendChart) this.trendChart.resize();
            if (this.statusChart) this.statusChart.resize();
            if (this.categoryChart) this.categoryChart.resize();
        });
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            // 构建查询参数
            const params = {
                period: this.currentPeriod
            };

            // 如果是自定义时间段，添加日期参数
            if (this.currentPeriod === 'custom' && this.customStartDate && this.customEndDate) {
                params.startDate = this.customStartDate;
                params.endDate = this.customEndDate;
            }

            // 获取统计数据
            const stats = await StatisticsTools.getStatistics(params);
            this.lastStatistics = stats;

            // 更新图表
            this.updateCharts(stats);

        } catch (error) {
            console.error('[StatisticsController] 加载统计数据失败:', error);
        }
    }

    /**
     * 更新图表
     */
    updateCharts(stats) {
        this.updateTrendChart();
        this.updateStatusChart(stats);
        this.updateCategoryChart();
    }

    /**
     * 更新趋势图
     */
    updateTrendChart() {
        if (!this.trendChart) return;

        // 模拟趋势数据（实际应从后端获取）
        const hours = [];
        const data = [];
        for (let i = 0; i < 24; i++) {
            hours.push(`${i}:00`);
            data.push(Math.floor(Math.random() * 50) + 10);
        }

        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: { color: '#374151' },
                extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: hours,
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#6b7280' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#6b7280' },
                splitLine: { lineStyle: { color: '#f3f4f6' } }
            },
            series: [{
                name: '信件数量',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                sampling: 'average',
                itemStyle: { color: '#3b82f6' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                        { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
                    ])
                },
                data: data
            }]
        };

        this.trendChart.setOption(option);
    }

    /**
     * 更新状态分布图
     */
    updateStatusChart(stats) {
        if (!this.statusChart) return;

        const data = [
            { value: stats['预处理'] || 0, name: '预处理', itemStyle: { color: '#9ca3af' } },
            { value: stats['市局下发至区县局/支队'] || 0, name: '市局下发', itemStyle: { color: '#8b5cf6' } },
            { value: stats['正在处理'] || 0, name: '正在处理', itemStyle: { color: '#f59e0b' } },
            { value: stats['正在反馈'] || 0, name: '正在反馈', itemStyle: { color: '#f97316' } },
            { value: stats['已办结'] || 0, name: '已办结', itemStyle: { color: '#10b981' } }
        ].filter(item => item.value > 0);

        const option = {
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: { color: '#374151' },
                extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                right: '5%',
                top: 'center',
                textStyle: { color: '#6b7280' }
            },
            series: [{
                name: '信件状态',
                type: 'pie',
                radius: ['45%', '70%'],
                center: ['35%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: data
            }]
        };

        this.statusChart.setOption(option);
    }

    /**
     * 更新分类统计图
     */
    updateCategoryChart() {
        if (!this.categoryChart) return;

        // 模拟分类数据（实际应从后端获取）
        const categories = ['治安类', '交通类', '户籍类', '出入境类', '消防类', '其他'];
        const data = categories.map(() => Math.floor(Math.random() * 100) + 20);

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: { color: '#374151' },
                extraCssText: 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#6b7280' },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#6b7280' },
                splitLine: { lineStyle: { color: '#f3f4f6' } }
            },
            series: [{
                name: '信件数量',
                type: 'bar',
                barWidth: '40%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#10b981' },
                        { offset: 1, color: '#34d399' }
                    ]),
                    borderRadius: [6, 6, 0, 0]
                },
                data: data
            }]
        };

        this.categoryChart.setOption(option);
    }
}
