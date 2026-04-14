/**
 * 下发工作台动画模块
 *
 * 提供统一的动画效果封装
 * 所有涉及动画的方法均为异步方法
 */

const DispatchAnimation = {
    /**
     * 私有方法 - 通用元素滑动
     * @param {HTMLElement} element - 要滑动的元素
     * @param {string} direction - 滑动方向 'in'|'out'
     * @param {Object} options - 可选配置
     * @returns {Promise<void>}
     */
    async _slide(element, direction, options = {}) {
        const {
            duration = 400,
            easing = 'easeOutExpo',
            delay = 0,
            distance = '100px'  // 默认移动距离为100px
        } = options;

        if (!element) return;

        const translateX = direction === 'out' ? `-${distance}` : '0px';
        const startTranslateX = direction === 'out' ? '0px' : `-${distance}`;
        const startOpacity = direction === 'out' ? 1 : 0;
        const endOpacity = direction === 'out' ? 0 : 1;

        // 设置初始状态
        element.style.opacity = startOpacity;
        element.style.transform = `translateX(${startTranslateX})`;

        // 强制浏览器重绘，确保初始状态生效
        element.offsetHeight;

        // 使用 anime.js 执行动画
        return new Promise((resolve) => {
            anime({
                targets: element,
                opacity: endOpacity,
                translateX: translateX,
                duration: duration,
                easing: easing,
                delay: delay,
                complete: () => {
                    resolve();
                }
            });
        });
    },

    /**
     * 首次进入启动动画
     * @param {HTMLElement} header - 标题元素
     * @param {HTMLElement} leftPanel - 左侧面板元素
     * @param {HTMLElement} rightPanel - 右侧面板元素
     * @returns {Promise<void>}
     */
    async initStart(header, leftPanel, rightPanel) {
        const dispatchController = window.workplaceController?.controllers?.dispatch;

        // 检查是否需要中断
        if (dispatchController?.initStartAnimationInterrupt) {
            return;
        }

        // 先将需要动画的元素设置为不可见
        const animatedElements = [
            '.dispatch-header',
            '.header-icon',
            '.header-content',
            '.header-right',
            '.letter-list-panel',
            '.letter-list-item',
            '.letter-detail-panel',
            '.detail-info',
            '.detail-content',
            '.detail-middle',
            '.detail-bottom',
            '.action-btn'
        ];

        const container = header?.parentElement;
        if (container) {
            animatedElements.forEach(selector => {
                const elements = container.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.opacity = '0';
                });
            });
        }

        // 检查是否需要中断
        if (dispatchController?.initStartAnimationInterrupt) {
            return;
        }

        const tl = anime.timeline({
            easing: 'easeOutExpo'
        });

        // 1. 页面头部整体淡入 + 上移
        tl.add({
            targets: header,
            opacity: [0, 1],
            translateY: [-30, 0],
            duration: 800
        })
        // 2. 头部图标缩放旋转入场
        .add({
            targets: header?.querySelector('.header-icon'),
            opacity: [0, 1],
            scale: [0.5, 1],
            rotate: [-10, 0],
            duration: 600
        }, '-=400')
        // 3. 头部标题和副标题依次入场
        .add({
            targets: header?.querySelector('.header-content'),
            opacity: [0, 1],
            translateX: [-20, 0],
            duration: 500
        }, '-=300')
        // 4. 头部右侧状态徽章入场
        .add({
            targets: header?.querySelector('.header-right'),
            opacity: [0, 1],
            translateX: [20, 0],
            duration: 500
        }, '-=400')
        // 5. 左侧信件列表面板从左侧滑入
        .add({
            targets: leftPanel,
            opacity: [0, 1],
            translateX: [-50, 0],
            duration: 700
        }, '-=200')
        // 6. 信件列表项依次入场
        .add({
            targets: leftPanel?.querySelectorAll('.letter-list-item'),
            opacity: [0, 1],
            translateX: [-30, 0],
            delay: anime.stagger(80),
            duration: 500
        }, '-=400')
        // 7. 右侧详情面板从右侧滑入
        .add({
            targets: rightPanel,
            opacity: [0, 1],
            translateX: [50, 0],
            duration: 700
        }, '-=600')
        // 8. 详情信息区域淡入
        .add({
            targets: rightPanel?.querySelector('.detail-info'),
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 500
        }, '-=400')
        // 9. 诉求内容区域淡入
        .add({
            targets: rightPanel?.querySelector('.detail-content'),
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 500
        }, '-=400')
        // 10. AI聊天区域淡入
        .add({
            targets: rightPanel?.querySelector('.detail-middle'),
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 500
        }, '-=400')
        // 11. 底部操作区域淡入
        .add({
            targets: rightPanel?.querySelector('.detail-bottom'),
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 500
        }, '-=300')
        // 12. 操作按钮弹性入场
        .add({
            targets: rightPanel?.querySelectorAll('.action-btn'),
            opacity: [0, 1],
            scale: [0.8, 1],
            delay: anime.stagger(100),
            duration: 500,
            easing: 'easeOutElastic(1, .6)'
        }, '-=300');

        // 标记动画完成
        if (dispatchController) {
            dispatchController.initStartAnimationOver = true;
        }

        return new Promise((resolve) => {
            tl.finished.then(resolve);
        });
    },

    /**
     * 启动动画中断方法
     * 检查动画是否完成，如果未完成则停止动画、重置元素状态并清空页面
     */
    initStartInterrupt() {
        const dispatchController = window.workplaceController?.controllers?.dispatch;

        if (dispatchController && !dispatchController.initStartAnimationOver) {
            // 1. 先停止所有动画并重置元素到初始状态（避免跳变）
            const animatedSelectors = [
                '.dispatch-header',
                '.header-icon',
                '.header-content',
                '.header-right',
                '.letter-list-panel',
                '.letter-list-item',
                '.letter-detail-panel',
                '.detail-info',
                '.detail-content',
                '.detail-middle',
                '.detail-bottom',
                '.action-btn'
            ];

            animatedSelectors.forEach(selector => {
                // 第二个参数true表示重置元素到初始状态
                anime.remove(selector, true);
            });

            // 2. 清空页面内容
            const container = dispatchController.container;
            if (container) {
                container.innerHTML = '';
            }

            // 3. 设置中断标志
            dispatchController.initStartAnimationInterrupt = true;
        }
    },

    /**
     * 信件项的滑入与滑出
     * @param {HTMLElement} element - 信件项元素
     * @param {string} operation - 操作类型 'update'|'delete'|'add'
     * @returns {Promise<void>}
     */
    async letterItemAnimation(element, operation) {
        if (!element) return;

        switch (operation) {
            case 'update':
                // 更新：向左滑出后再向右滑入
                await this._slide(element, 'out', { duration: 300 });
                await this._slide(element, 'in', { duration: 300 });
                break;
            case 'delete':
                // 删除：向左滑出
                await this._slide(element, 'out', { duration: 400 });
                break;
            case 'add':
                // 增加：向右滑入
                await this._slide(element, 'in', { duration: 400 });
                break;
            default:
                break;
        }
    },

    /**
     * 信件详细内容面板中的文字元素的滑入滑出
     * 注意：输入框、下拉框和按钮不参与动画
     * @param {Object} elements - 元素对象
     * @param {string} operation - 操作类型 'show'|'hide'
     * @returns {Promise<void>}
     */
    async letterInfoAnimation(elements, operation) {
        const {
            textElements = []
        } = elements;

        const allElements = [...textElements].filter(Boolean);

        if (allElements.length === 0) return;

        if (operation === 'hide') {
            // 隐藏：文字元素同时向左滑出（使用默认移动距离）
            await Promise.all(allElements.map(el => this._slide(el, 'out', { duration: 300 })));
        } else if (operation === 'show') {
            // 显示：文字元素同时向右滑入（使用默认移动距离，无delay）
            await Promise.all(allElements.map(el =>
                this._slide(el, 'in', { duration: 300, delay: 0 })
            ));
        }
    },

    /**
     * 再次进入动画
     * 页面重新进入时执行，动画效果简洁流畅
     * @param {HTMLElement} container - 容器元素
     * @returns {Promise<void>}
     */
    async reenterAnimation(container) {
        if (!container) return;

        const tl = anime.timeline({
            easing: 'easeOutQuad'
        });

        // 1. 页面头部轻微淡入
        tl.add({
            targets: container.querySelector('.dispatch-header'),
            opacity: [0.7, 1],
            translateY: [-10, 0],
            duration: 400
        })
        // 2. 左侧面板轻微滑入
        .add({
            targets: container.querySelector('.letter-list-panel'),
            opacity: [0.8, 1],
            translateX: [-15, 0],
            duration: 400
        }, '-=300')
        // 3. 信件列表项快速依次入场
        .add({
            targets: container.querySelectorAll('.letter-list-item'),
            opacity: [0, 1],
            translateX: [-10, 0],
            delay: anime.stagger(50),
            duration: 300
        }, '-=300')
        // 4. 右侧面板轻微滑入
        .add({
            targets: container.querySelector('.letter-detail-panel'),
            opacity: [0.8, 1],
            translateX: [15, 0],
            duration: 400
        }, '-=400')
        // 5. 底部按钮轻微淡入
        .add({
            targets: container.querySelectorAll('.action-btn'),
            opacity: [0.7, 1],
            scale: [0.95, 1],
            delay: anime.stagger(50),
            duration: 300
        }, '-=200');

        return new Promise((resolve) => {
            tl.finished.then(resolve);
        });
    },

    /**
     * 确保所有元素可见（用于非首次访问）
     * @param {HTMLElement} container - 容器元素
     */
    ensureElementsVisible(container) {
        if (!container) return;

        const selectors = [
            '.dispatch-header',
            '.header-icon',
            '.header-content',
            '.header-right',
            '.letter-list-panel',
            '.letter-list-item',
            '.letter-detail-panel',
            '.detail-info',
            '.detail-content',
            '.detail-middle',
            '.detail-bottom',
            '.action-btn'
        ];

        selectors.forEach(selector => {
            const elements = container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        });
    },

    /**
     * 让输入框边框红色呼吸闪烁3次，每次1秒
     * @param {HTMLElement} inputElement - 输入框元素
     */
    flashInputBorder(inputElement) {
        const breathDuration = 1000; // 每次呼吸1秒
        const totalBreaths = 3; // 呼吸3次
        const startTime = Date.now();

        // 设置过渡效果
        inputElement.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
        inputElement.style.borderWidth = '2px';
        inputElement.style.borderStyle = 'solid';

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = (elapsed % breathDuration) / breathDuration;

            // 计算呼吸效果：0 -> 1 -> 0
            const breathIntensity = Math.sin(progress * Math.PI);

            // 红色呼吸效果
            const redIntensity = Math.floor(239 * breathIntensity + 229 * (1 - breathIntensity));
            const greenBlueIntensity = Math.floor(68 * breathIntensity + 231 * (1 - breathIntensity));
            const borderColor = `rgb(${redIntensity}, ${greenBlueIntensity}, ${greenBlueIntensity})`;

            // 阴影呼吸效果
            const shadowOpacity = breathIntensity * 0.5;
            const boxShadow = `0 0 ${8 * breathIntensity}px rgba(239, 68, 68, ${shadowOpacity})`;

            inputElement.style.borderColor = borderColor;
            inputElement.style.boxShadow = boxShadow;

            // 检查是否完成3次呼吸
            if (elapsed < breathDuration * totalBreaths) {
                requestAnimationFrame(animate);
            } else {
                // 恢复默认样式
                inputElement.style.borderColor = '';
                inputElement.style.borderWidth = '';
                inputElement.style.borderStyle = '';
                inputElement.style.boxShadow = '';
            }
        };

        requestAnimationFrame(animate);
    }
};

window.DispatchAnimation = DispatchAnimation;
