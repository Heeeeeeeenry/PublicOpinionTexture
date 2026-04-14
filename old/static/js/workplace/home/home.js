/**
 * 首页模块控制器
 *
 * 负责首页的初始化、数据加载和动画效果
 * 使用 anime.js 实现绚丽的入场动画和交互动画
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
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
        this.pollingInterval = null;  // 轮询定时器
        this.POLLING_INTERVAL_MS = 5000;  // 轮询间隔5秒
        this.lastStatistics = {};  // 保存上次统计数据
    }

    /**
     * 初始化首页
     *
     * 首次打开页面时调用，执行完整的初始化和动画
     *
     * @param {HTMLElement} container - 容器元素
     */
    async init(container) {
        console.log('[HomeController] init 开始执行');
        this.container = container;

        // 加载并显示用户信息
        await this.loadUserInfo();

        // 绑定时间筛选按钮事件
        this.bindTimeFilterEvents();

        // 绑定快捷操作按钮动画
        this.bindActionCardEvents();

        // 启动实时时间更新
        this.startRealtimeClock();

        // 加载统计数据
        await this.loadStatistics();

        // 执行入场动画（仅首次）
        if (!this.animationPlayed) {
            this.playEntranceAnimation();
            this.animationPlayed = true;
        }

        // 启动背景装饰动画
        this.startBackgroundAnimation();

        // 启动定时轮询（每5秒刷新统计数据）
        this.startPolling();

        this.isInitialized = true;
        console.log('[HomeController] 首页初始化完成');
    }

    /**
     * 显示页面
     *
     * 再次打开页面时调用，刷新数据，不执行动画
     */
    async show() {
        console.log('[HomeController] 页面显示');

        // 确保所有元素可见
        this.ensureElementsVisible();

        // 刷新数据（页面重新进入时轮询后端数据）
        await this.refresh();

        // 启动定时轮询（每5秒刷新统计数据）
        this.startPolling();
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[HomeController] 页面隐藏');
        // 停止定时轮询
        this.stopPolling();
    }

    /**
     * 启动定时轮询
     * 每隔5秒自动刷新统计数据
     */
    startPolling() {
        // 如果已有定时器，先停止
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
     * 刷新数据
     *
     * 再次打开页面时调用，只刷新数据，不执行动画
     */
    async refresh() {
        console.log('[HomeController] 刷新数据');
        if (!this.isInitialized) return;

        await this.loadStatistics();
    }

    /**
     * 确保所有元素可见（用于非首次访问）
     */
    ensureElementsVisible() {
        const selectors = [
            '.welcome-banner',
            '.greeting-line',
            '.welcome-title',
            '.welcome-subtitle',
            '.time-card',
            '.time-filter-panel',
            '.stat-card',
            '.content-panel',
            '.progress-fill'
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
     * 使用 anime.js 实现绚丽的动画效果
     * 仅在页面首次访问时执行
     */
    playEntranceAnimation() {
        // 先将需要动画的元素设置为不可见
        const animatedElements = [
            '.welcome-banner',
            '.greeting-line',
            '.welcome-title',
            '.welcome-subtitle',
            '.time-card',
            '.time-filter-panel',
            '.stat-card',
            '.content-panel',
            '.progress-fill'
        ];

        animatedElements.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });

        const tl = anime.timeline({
            easing: 'easeOutExpo'
        });

        // 1. 欢迎横幅动画
        tl.add({
            targets: '.welcome-banner',
            opacity: [0, 1],
            translateY: [30, 0],
            scale: [0.95, 1],
            duration: 800
        })
        // 2. 问候语动画
        .add({
            targets: '.greeting-line',
            opacity: [0, 1],
            translateY: [-10, 0],
            duration: 600
        }, '-=400')
        // 3. 欢迎标题动画
        .add({
            targets: '.welcome-title',
            opacity: [0, 1],
            translateY: [15, 0],
            duration: 600
        }, '-=400')
        // 4. 副标题动画
        .add({
            targets: '.welcome-subtitle',
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 500
        }, '-=300')
        // 5. 时间卡片动画
        .add({
            targets: '.time-card',
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 600
        }, '-=300')
        // 6. 时间筛选面板动画
        .add({
            targets: '.time-filter-panel',
            opacity: [0, 1],
            translateY: [15, 0],
            duration: 600
        }, '-=300')
        // 7. 统计卡片依次入场
        .add({
            targets: '.stat-card',
            opacity: [0, 1],
            translateY: [30, 0],
            delay: anime.stagger(100),
            duration: 700
        }, '-=200')
        // 8. 内容面板动画
        .add({
            targets: '.content-panel',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(150),
            duration: 600
        }, '-=400');

        // 进度条动画
        setTimeout(() => {
            this.animateProgressBars();
        }, 1500);
    }

    /**
     * 动画化进度条
     */
    animateProgressBars() {
        const progressBars = this.container.querySelectorAll('.progress-fill');
        const widths = ['75%', '60%', '45%', '85%', '92%'];

        progressBars.forEach((bar, index) => {
            anime({
                targets: bar,
                width: [0, widths[index] || '70%'],
                easing: 'easeOutQuart',
                duration: 1200,
                delay: index * 100
            });
        });
    }

    /**
     * 启动背景装饰动画
     */
    startBackgroundAnimation() {
        anime({
            targets: '.floating-shape',
            translateY: [
                { value: -20, duration: 3000 },
                { value: 20, duration: 3000 }
            ],
            translateX: [
                { value: 10, duration: 4000 },
                { value: -10, duration: 4000 }
            ],
            scale: [
                { value: 1.05, duration: 5000 },
                { value: 0.95, duration: 5000 }
            ],
            rotate: [
                { value: 5, duration: 8000 },
                { value: -5, duration: 8000 }
            ],
            easing: 'easeInOutSine',
            duration: 8000,
            loop: true,
            direction: 'alternate',
            delay: anime.stagger(1000)
        });
    }

    /**
     * 绑定时间筛选按钮事件
     */
    bindTimeFilterEvents() {
        const timeButtons = this.container.querySelectorAll('.time-filter-chip');
        timeButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const clickedBtn = e.currentTarget;

                anime({
                    targets: clickedBtn,
                    scale: [1, 0.95, 1],
                    duration: 200,
                    easing: 'easeOutQuad'
                });

                timeButtons.forEach(b => {
                    b.classList.remove('active');
                });

                clickedBtn.classList.add('active');

                const period = clickedBtn.dataset.period;
                this.currentPeriod = period;

                await this.refreshStatisticsWithAnimation();
            });
        });
    }

    /**
     * 绑定快捷操作按钮动画
     */
    bindActionCardEvents() {
        const actionCards = this.container.querySelectorAll('.action-card');

        actionCards.forEach(card => {
            const wave = card.querySelector('.action-wave');

            card.addEventListener('mouseenter', () => {
                const icon = card.querySelector('.action-icon');
                anime({
                    targets: icon,
                    scale: [1, 1.15, 1.1],
                    rotate: [0, -10, 0],
                    duration: 400,
                    easing: 'easeOutElastic(1, .5)'
                });
            });

            card.addEventListener('click', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                wave.style.left = x + 'px';
                wave.style.top = y + 'px';

                anime({
                    targets: wave,
                    width: [0, 300],
                    height: [0, 300],
                    opacity: [0.5, 0],
                    duration: 600,
                    easing: 'easeOutExpo'
                });

                anime({
                    targets: card,
                    scale: [1, 0.95, 1],
                    duration: 200,
                    easing: 'easeOutQuad'
                });
            });
        });
    }

    /**
     * 带动画的统计数据刷新
     * 动画效果：旧数字向右淡出，新数字从左侧滑入
     */
    async refreshStatisticsWithAnimation() {
        const statValues = this.container.querySelectorAll('.stat-value');

        // 第一步：旧数字向右淡出
        await new Promise(resolve => {
            anime({
                targets: statValues,
                opacity: [1, 0],
                translateX: [0, 30],
                duration: 300,
                easing: 'easeInQuad',
                complete: resolve
            });
        });

        // 第二步：加载新数据
        await this.loadStatistics();

        // 第三步：新数字从左侧滑入
        anime({
            targets: statValues,
            opacity: [0, 1],
            translateX: [-30, 0],
            duration: 400,
            easing: 'easeOutQuad'
        });
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
        const hour = new Date().getHours();
        const greetingEl = document.getElementById('greeting-text');
        const emojiEl = document.querySelector('.greeting-emoji');

        let greeting = '早上好';
        let emoji = '👋';

        if (hour >= 5 && hour < 12) {
            greeting = '早上好';
            emoji = '🌅';
        } else if (hour >= 12 && hour < 14) {
            greeting = '中午好';
            emoji = '☀️';
        } else if (hour >= 14 && hour < 18) {
            greeting = '下午好';
            emoji = '🌤️';
        } else {
            greeting = '晚上好';
            emoji = '🌙';
        }

        if (greetingEl) {
            anime({
                targets: greetingEl,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInQuad',
                complete: () => {
                    greetingEl.textContent = greeting;
                    anime({
                        targets: greetingEl,
                        opacity: [0, 1],
                        translateY: [10, 0],
                        duration: 300,
                        easing: 'easeOutQuad'
                    });
                }
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
        const dateEl = document.getElementById('header-date');
        const timeEl = document.getElementById('header-realtime');

        if (dateEl || timeEl) {
            const now = new Date();

            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                });
            }

            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }
        }
    }

    /**
     * 格式化本地日期时间为字符串
     */
    formatLocalDateTime(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * 数字增长动画
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

    /**
     * 加载用户信息
     */
    async loadUserInfo() {
        try {
            console.log('[HomeController] 开始加载用户信息');
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
            console.log('[HomeController] 用户信息响应:', data);

            if (data.is_authenticated && data.data) {
                const user = data.data;
                console.log('[HomeController] 用户数据:', user);

                const displayName = user.nickname || user.name || '管理员';
                console.log('[HomeController] 显示名称:', displayName);

                const userNameEl = document.getElementById('user-display-name');
                console.log('[HomeController] 元素:', userNameEl);

                if (userNameEl) {
                    userNameEl.textContent = displayName;
                    console.log('[HomeController] 已更新用户名');
                }
            } else {
                console.log('[HomeController] 用户未认证或数据为空');
            }
        } catch (error) {
            console.error('[HomeController] 加载用户信息失败:', error);
        }
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            const now = new Date();
            let startTime, endTime;

            if (this.currentPeriod === 'day') {
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            } else if (this.currentPeriod === 'week') {
                const dayOfWeek = now.getDay();
                const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday, 0, 0, 0);
                startTime = weekStart;
                endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            } else if (this.currentPeriod === 'month') {
                startTime = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (this.currentPeriod === 'year') {
                startTime = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
                endTime = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            }

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
                const data = result.data;

                const totalEl = this.container.querySelector('#home-total-count');
                const preprocessingEl = this.container.querySelector('#home-preprocessing-count');
                const processingEl = this.container.querySelector('#home-processing-count');
                const feedbackingEl = this.container.querySelector('#home-feedbacking-count');

                // 只对发生变化的数字执行动画
                if (totalEl && data['信件总量'] !== this.lastStatistics['信件总量']) {
                    this.animateNumber(totalEl, data['信件总量'], 1200);
                }
                if (preprocessingEl && data['预处理'] !== this.lastStatistics['预处理']) {
                    this.animateNumber(preprocessingEl, data['预处理'], 1200);
                }
                if (processingEl && data['正在处理'] !== this.lastStatistics['正在处理']) {
                    this.animateNumber(processingEl, data['正在处理'], 1200);
                }
                if (feedbackingEl && data['正在反馈'] !== this.lastStatistics['正在反馈']) {
                    this.animateNumber(feedbackingEl, data['正在反馈'], 1200);
                }

                // 保存本次数据供下次比较
                this.lastStatistics = { ...data };

                console.log('[HomeController] 统计数据加载成功:', data);
            } else {
                console.error('[HomeController] 加载统计数据失败:', result.error);
            }
        } catch (error) {
            console.error('[HomeController] 加载统计数据失败:', error);
        }
    }

}

// 导出控制器类到全局
window.HomeController = HomeController;
