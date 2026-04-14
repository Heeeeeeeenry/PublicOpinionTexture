/**
 * Workplace 通用动画模块
 *
 * 提供统一的动画效果封装
 * 所有方法均接收元素列表和元素动画之间的间隔时间
 * 依赖：anime.js
 */

const WpAnimation = {
    
    _animations: new Map(),
    _animationIdCounter: 0,

    /**
     * 生成唯一的动画ID
     * @returns {string} 唯一的动画ID
     */
    _generateAnimationId() {
        return `anim_${Date.now()}_${++this._animationIdCounter}`;
    },

    /**
     * 规范化元素参数为元素数组
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @returns {HTMLElement[]} 元素数组
     */
    _normalizeElements(elements) {
        if (typeof elements === 'string') {
            return Array.from(document.querySelectorAll(elements));
        }
        if (elements instanceof NodeList) {
            return Array.from(elements);
        }
        if (elements instanceof HTMLElement) {
            return [elements];
        }
        if (Array.isArray(elements)) {
            return elements;
        }
        return [];
    },

    /**
     * 根据方向获取移动的位移对象
     * @param {string} direction - 方向
     * @param {number} distance - 距离
     * @param {boolean} isOut - 是否是淡出（淡出时方向相反）
     * @returns {object} 位移对象
     */
    _getTranslation(direction, distance, isOut = false) {
        switch (direction) {
            case 'left':
                return { translateX: isOut ? -distance : -distance };
            case 'right':
                return { translateX: isOut ? distance : distance };
            case 'up':
                return { translateY: isOut ? -distance : -distance };
            case 'down':
                return { translateY: isOut ? distance : distance };
            default:
                return {};
        }
    },

    /**
     * 移动并淡出动画
     * 元素向指定方向移动并同时淡出
     *
     * 方向语义：
     * - 'left': 向左移动并淡出（从右向左）
     * - 'right': 向右移动并淡出（从左向右）
     * - 'up': 向上移动并淡出（从下向上）
     * - 'down': 向下移动并淡出（从上向下）
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {string} direction - 移动方向，必须传入：'left'|'right'|'up'|'down'
     * @param {number} distance - 移动距离（像素），默认为50px
     * @param {number} duration - 动画持续时间（毫秒），默认为500ms
     * @param {number} stagger - 元素动画之间的间隔时间（毫秒），默认为0ms
     * @returns {Promise<string>} 动画ID，用于后续停止动画
     *
     * @example
     * // 向左移动50px并淡出，持续500ms
     * const animId = await WpAnimation.moveAndFadeOut(element, 'left');
     *
     * @example
     * // 向右移动100px并淡出，持续800ms，每个元素间隔100ms
     * const animId = await WpAnimation.moveAndFadeOut([el1, el2, el3], 'right', 100, 800, 100);
     */
    async moveAndFadeOut(elements, direction, distance = 50, duration = 500, stagger = 0) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();
        const translation = this._getTranslation(direction, distance, true);

        const savedTransitions = [];
        normalizedElements.forEach((el, index) => {
            savedTransitions[index] = el.style.transition;
            el.style.transition = 'none';
        });

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                ...translation,
                opacity: [1, 0],
                duration: duration,
                easing: 'easeOutQuad',
                delay: anime.stagger(stagger),
                complete: () => {
                    normalizedElements.forEach((el, index) => {
                        el.style.transition = savedTransitions[index];
                    });
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    },

    /**
     * 移动并淡入动画
     * 元素从指定方向移动进入并同时淡入
     *
     * 方向语义（从哪个方向来）：
     * - 'left': 从左方进入（初始在左侧，向右移动到原位）
     * - 'right': 从右方进入（初始在右侧，向左移动到原位）
     * - 'up': 从上方进入（初始在上方，向下移动到原位）
     * - 'down': 从下方进入（初始在下方，向上移动到原位）
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {string} direction - 移动方向，必须传入：'left'|'right'|'up'|'down'
     * @param {number} distance - 移动距离（像素），默认为50px
     * @param {number} duration - 动画持续时间（毫秒），默认为500ms
     * @param {number} stagger - 元素动画之间的间隔时间（毫秒），默认为0ms
     * @returns {Promise<string>} 动画ID，用于后续停止动画
     *
     * @example
     * // 从右侧移动进入并淡入
     * const animId = await WpAnimation.moveAndFadeIn(element, 'right');
     *
     * @example
     * // 从下方100px处进入，持续800ms，每个元素间隔100ms
     * const animId = await WpAnimation.moveAndFadeIn([el1, el2, el3], 'down', 100, 800, 100);
     */
    async moveAndFadeIn(elements, direction, distance = 50, duration = 500, stagger = 0) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();
        const initialTranslation = this._getTranslation(direction, distance, false);

        const savedTransitions = [];
        normalizedElements.forEach((el, index) => {
            savedTransitions[index] = el.style.transition;
            el.style.transition = 'none';
            el.style.opacity = '0';
        });

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                translateX: initialTranslation.translateX !== undefined 
                    ? [initialTranslation.translateX, 0] 
                    : 0,
                translateY: initialTranslation.translateY !== undefined 
                    ? [initialTranslation.translateY, 0] 
                    : 0,
                opacity: [0, 1],
                duration: duration,
                easing: 'easeOutQuad',
                delay: anime.stagger(stagger),
                complete: () => {
                    normalizedElements.forEach((el, index) => {
                        el.style.transform = '';
                        el.style.transition = savedTransitions[index];
                    });
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    },

    /**
     * 淡入动画
     * 元素从透明渐变为不透明
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {number} duration - 动画持续时间（毫秒），默认为500ms
     * @param {number} stagger - 元素动画之间的间隔时间（毫秒），默认为0ms
     * @returns {Promise<string>} 动画ID，用于后续停止动画
     *
     * @example
     * // 淡入，持续500ms
     * const animId = await WpAnimation.fadeIn(element);
     *
     * @example
     * // 淡入，持续800ms，每个元素间隔100ms
     * const animId = await WpAnimation.fadeIn([el1, el2, el3], 800, 100);
     */
    async fadeIn(elements, duration = 500, stagger = 0) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();

        normalizedElements.forEach(el => {
            el.style.opacity = '0';
        });

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                opacity: [0, 1],
                duration: duration,
                easing: 'easeOutQuad',
                delay: anime.stagger(stagger),
                complete: () => {
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    },

    /**
     * 淡出动画
     * 元素从不透明渐变为透明
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {number} duration - 动画持续时间（毫秒），默认为500ms
     * @param {number} stagger - 元素动画之间的间隔时间（毫秒），默认为0ms
     * @returns {Promise<string>} 动画ID，用于后续停止动画
     *
     * @example
     * // 淡出，持续500ms
     * const animId = await WpAnimation.fadeOut(element);
     *
     * @example
     * // 淡出，持续800ms，每个元素间隔100ms
     * const animId = await WpAnimation.fadeOut([el1, el2, el3], 800, 100);
     */
    async fadeOut(elements, duration = 500, stagger = 0) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                opacity: [1, 0],
                duration: duration,
                easing: 'easeOutQuad',
                delay: anime.stagger(stagger),
                complete: () => {
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    },

    /**
     * 停止指定动画
     * @param {string} animId - 动画ID
     */
    stop(animId) {
        const animation = this._animations.get(animId);
        if (animation) {
            animation.pause();
            this._animations.delete(animId);
        }
    },

    /**
     * 停止所有动画
     */
    stopAll() {
        this._animations.forEach(animation => animation.pause());
        this._animations.clear();
    },

    /**
     * 弹窗进入动画
     * 从中心点缩放并淡入，模拟弹窗弹出效果
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {number} duration - 动画持续时间（毫秒），默认为300ms
     * @returns {Promise<string>} 动画ID
     *
     * @example
     * // 弹窗进入动画
     * await WpAnimation.popIn(modalContainer);
     */
    async popIn(elements, duration = 300) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();

        normalizedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9)';
        });

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                scale: [0.9, 1],
                opacity: [0, 1],
                duration: duration,
                easing: 'easeOutBack',
                complete: () => {
                    normalizedElements.forEach(el => {
                        el.style.transform = '';
                    });
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    },

    /**
     * 弹窗退出动画
     * 缩放到中心点并淡出，模拟弹窗关闭效果
     *
     * @param {HTMLElement|HTMLElement[]|NodeList|string} elements - 元素或元素列表
     * @param {number} duration - 动画持续时间（毫秒），默认为200ms
     * @returns {Promise<string>} 动画ID
     *
     * @example
     * // 弹窗退出动画
     * await WpAnimation.popOut(modalContainer);
     */
    async popOut(elements, duration = 200) {
        const normalizedElements = this._normalizeElements(elements);
        if (normalizedElements.length === 0) {
            return null;
        }

        const animId = this._generateAnimationId();

        return new Promise((resolve) => {
            const animation = anime({
                targets: normalizedElements,
                scale: [1, 0.9],
                opacity: [1, 0],
                duration: duration,
                easing: 'easeInQuad',
                complete: () => {
                    normalizedElements.forEach(el => {
                        el.style.transform = '';
                        el.style.opacity = '';
                    });
                    this._animations.delete(animId);
                    resolve(animId);
                }
            });

            this._animations.set(animId, animation);
        });
    }
};

// 暴露到全局
window.WpAnimation = WpAnimation;
