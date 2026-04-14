/**
 * 首页控制器
 *
 * 负责首页的初始化、数据加载和动画效果
 * 使用通用动画库 WpAnimation 实现动画效果
 * 使用通用样式类
 */

class HomeController {
    /**
     * 构造函数
     */
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.currentPeriod = 'day';
        this.pollingInterval = null;
        this.POLLING_INTERVAL_MS = 5000;
        this.lastStatistics = {};
    }

    /**
     * 初始化首页
     * @param {HTMLElement} container - 容器元素
     */
    async init(container) {
        console.log('[HomeController] init 开始执行');
        this.container = container;

        // 生成并插入HTML
        this.container.innerHTML = HomeTools.generateHTML();

        // 加载并显示用户信息
        await this.loadUserInfo();

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
        console.log('[HomeController] 首页初始化完成');
    }

    /**
     * 显示页面
     */
    async show() {
        console.log('[HomeController] 页面显示');
        this.ensureElementsVisible();
        await this.refresh();
        this.startPolling();
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[HomeController] 页面隐藏');
        this.stopPolling();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        console.log('[HomeController] 刷新数据');
        if (!this.isInitialized) return;
        await this.loadStatistics();
    }

    /**
     * 启动定时轮询
     */
    startPolling() {
        this.stopPolling();
        console.log('[HomeController] 启动定时轮询，间隔5秒');
        this.pollingInterval = setInterval(async () => {
            console.log('[HomeController] 定时轮询：刷新统计数据');
            await this.loadStatistics();
        }, this.POLLING_INTERVAL_MS);
    }

    /**
     * 停止定时轮询
     */
    stopPolling() {
        if (this.pollingInterval) {
            console.log('[HomeController] 停止定时轮询');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * 确保所有元素可见
     */
    ensureElementsVisible() {
        const selectors = [
            '#welcome-banner',
            '.greeting-line',
            '.welcome-title',
            '.welcome-subtitle',
            '#time-filter-panel',
            '.wp-stat-card'
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
            '#welcome-banner',
            '.greeting-line',
            '.welcome-title',
            '.welcome-subtitle',
            '#time-filter-panel',
            '.wp-stat-card'
        ];

        animatedElements.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });

        // 使用通用动画库依次播放动画
        const banner = this.container.querySelector('#welcome-banner');
        const greetingLine = this.container.querySelector('.greeting-line');
        const welcomeTitle = this.container.querySelector('.welcome-title');
        const welcomeSubtitle = this.container.querySelector('.welcome-subtitle');
        const timeFilterPanel = this.container.querySelector('#time-filter-panel');
        const statCards = this.container.querySelectorAll('.wp-stat-card');

        // 1. 欢迎横幅淡入
        if (banner) {
            await WpAnimation.moveAndFadeIn(banner, 'down', 30, 800, 0)
        }

        // 2. 问候语淡入
        if (greetingLine) {
            await WpAnimation.fadeIn(greetingLine, 600, 0);
        }

        // 3. 欢迎标题淡入
        if (welcomeTitle) {
            await WpAnimation.fadeIn(welcomeTitle, 600, 0);
        }

        // 4. 副标题淡入
        if (welcomeSubtitle) {
            await WpAnimation.fadeIn(welcomeSubtitle, 500, 0);
        }

        // 5. 时间筛选面板淡入
        if (timeFilterPanel) {
            await WpAnimation.moveAndFadeIn(timeFilterPanel, 'down', 15, 600, 0);
        }

        // 6. 统计卡片依次入场
        if (statCards.length > 0) {
            await WpAnimation.moveAndFadeIn(statCards, 'down', 30, 700, 100);
        }

        // 进度条动画
        setTimeout(() => {
            this.animateProgressBars();
        }, 1500);
    }

    /**
     * 动画化进度条
     */
    animateProgressBars() {
        const progressBars = this.container.querySelectorAll('.wp-stat-progress-bar');
        const widths = ['75%', '60%', '45%', '85%'];

        progressBars.forEach((bar, index) => {
            if (bar) {
                anime({
                    targets: bar,
                    width: [0, widths[index] || '70%'],
                    easing: 'easeOutQuart',
                    duration: 1200,
                    delay: index * 100
                });
            }
        });
    }

    /**
     * 绑定时间筛选按钮事件
     */
    bindTimeFilterEvents() {
        const timeButtons = this.container.querySelectorAll('.wp-filter-chip');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const clickedBtn = e.currentTarget;

                // 按钮点击动画
                anime({
                    targets: clickedBtn,
                    scale: [1, 0.95, 1],
                    duration: 200,
                    easing: 'easeOutQuad'
                });

                // 更新激活状态
                timeButtons.forEach(b => b.classList.remove('active'));
                clickedBtn.classList.add('active');

                // 更新当前时间范围
                const period = clickedBtn.dataset.period;
                this.currentPeriod = period;

                // 刷新统计数据（带动画）
                await this.refreshStatisticsWithAnimation();
            });
        });
    }

    /**
     * 带动画的统计数据刷新
     */
    async refreshStatisticsWithAnimation() {
        const statValues = this.container.querySelectorAll('.wp-stat-value');

        // 第一步：旧数字向右淡出
        await WpAnimation.moveAndFadeOut(statValues, 'right', 30, 300, 0);

        // 第二步：加载新数据
        await this.loadStatistics();

        // 第三步：新数字从左侧滑入
        await WpAnimation.moveAndFadeIn(statValues, 'left', 30, 400, 0);
    }

    /**
     * 启动实时时钟更新
     */
    startRealtimeClock() {
        this.updateHeaderDateTime();
        this.updateGreeting();

        setInterval(() => {
            this.updateHeaderDateTime();
        }, 1000);

        setInterval(() => {
            this.updateGreeting();
        }, 60000);
    }

    /**
     * 更新问候语
     */
    updateGreeting() {
        const { greeting, emoji } = HomeTools.getGreeting();

        const greetingEl = this.container.querySelector('#greeting-text');
        const emojiEl = this.container.querySelector('.greeting-emoji');

        if (greetingEl) {
            // 先淡出
            WpAnimation.fadeOut(greetingEl, 200, 0).then(() => {
                greetingEl.textContent = greeting;
                // 再淡入
                WpAnimation.fadeIn(greetingEl, 300, 0);
            });
        }

        if (emojiEl) {
            emojiEl.textContent = emoji;
        }
    }

    /**
     * 更新头部日期和时间
     */
    updateHeaderDateTime() {
        const dateEl = this.container.querySelector('#header-date');
        const timeEl = this.container.querySelector('#header-realtime');

        const { date, time } = HomeTools.formatDateTime();

        if (dateEl) dateEl.textContent = date;
        if (timeEl) timeEl.textContent = time;
    }

    /**
     * 加载用户信息
     */
    async loadUserInfo() {
        const user = await HomeTools.loadUserInfo();
        if (user) {
            const userNameEl = this.container.querySelector('#user-display-name');
            if (userNameEl) {
                userNameEl.textContent = user.name;
            }
        }
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        const data = await HomeTools.loadStatistics(this.currentPeriod);

        if (data) {
            const totalEl = this.container.querySelector('#home-total-count');
            const preprocessingEl = this.container.querySelector('#home-preprocessing-count');
            const processingEl = this.container.querySelector('#home-processing-count');
            const feedbackingEl = this.container.querySelector('#home-feedbacking-count');

            // 只对发生变化的数字执行动画 
            if (totalEl && data['信件总量'] !== this.lastStatistics['信件总量']) {
                HomeTools.animateNumber(totalEl, data['信件总量'], 1200);
            }
            if (preprocessingEl && data['预处理'] !== this.lastStatistics['预处理']) {
                HomeTools.animateNumber(preprocessingEl, data['预处理'], 1200);
            }
            if (processingEl && data['正在处理'] !== this.lastStatistics['正在处理']) {
                HomeTools.animateNumber(processingEl, data['正在处理'], 1200);
            }
            if (feedbackingEl && data['正在反馈'] !== this.lastStatistics['正在反馈']) {
                HomeTools.animateNumber(feedbackingEl, data['正在反馈'], 1200);
            }

            // 保存本次数据供下次比较
            this.lastStatistics = { ...data };

            console.log('[HomeController] 统计数据加载成功:', data);
        }
    }
}

// 暴露到全局
window.HomeController = HomeController;
