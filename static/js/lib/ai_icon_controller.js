/**
 * AI SVG 图标控制器
 *
 * 使用 SVG + anime.js 绘制机器人图标，支持眨眼和蹦跳动画
 * 特点：
 * - 支持多实例创建
 * - 透明背景
 * - 矢量缩放不失真
 * - 简洁的动画效果（眨眼、蹦跳）
 */

class AIIconController {
    /**
     * 构造函数
     * @param {string} containerSelector - 容器元素选择器
     * @param {Object} options - 配置选项
     */
    constructor(containerSelector, options = {}) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error('未找到容器元素:', containerSelector);
            return;
        }

        // 配置
        this.size = options.size || 80;
        this.color = options.color || '#4b5563';
        this.bgColor = options.bgColor || 'transparent';
        this.id = 'ai-icon-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // 动画状态
        this.isAnimating = false;
        this.currentAnimation = null;

        // 创建 SVG
        this.createSVG();

        // 初始绘制
        this.draw();
    }

    /**
     * 创建 SVG 结构
     */
    createSVG() {
        // 创建 SVG 命名空间
        const ns = 'http://www.w3.org/2000/svg';

        // 创建 SVG 元素
        this.svg = document.createElementNS(ns, 'svg');
        this.svg.setAttribute('width', this.size);
        this.svg.setAttribute('height', this.size);
        this.svg.setAttribute('viewBox', '0 0 100 100');
        this.svg.style.display = 'block';
        this.svg.style.backgroundColor = this.bgColor;

        // 创建脸部圆圈（外框）
        this.face = document.createElementNS(ns, 'circle');
        this.face.setAttribute('cx', '50');
        this.face.setAttribute('cy', '50');
        this.face.setAttribute('r', '45');
        this.face.setAttribute('fill', 'none');
        this.face.setAttribute('stroke', this.color);
        this.face.setAttribute('stroke-width', '5');
        this.face.setAttribute('stroke-linecap', 'round');
        this.svg.appendChild(this.face);

        // 创建左眼
        this.leftEye = document.createElementNS(ns, 'ellipse');
        this.leftEye.setAttribute('cx', '35');
        this.leftEye.setAttribute('cy', '45');
        this.leftEye.setAttribute('rx', '8');
        this.leftEye.setAttribute('ry', '8');
        this.leftEye.setAttribute('fill', this.color);
        this.svg.appendChild(this.leftEye);

        // 创建右眼
        this.rightEye = document.createElementNS(ns, 'ellipse');
        this.rightEye.setAttribute('cx', '65');
        this.rightEye.setAttribute('cy', '45');
        this.rightEye.setAttribute('rx', '8');
        this.rightEye.setAttribute('ry', '8');
        this.rightEye.setAttribute('fill', this.color);
        this.svg.appendChild(this.rightEye);

        // 添加到容器
        this.container.appendChild(this.svg);
    }

    /**
     * 绘制机器人（初始状态）
     */
    draw() {
        // 初始状态已创建
    }

    /**
     * 眨眼动画
     * @param {number} count - 眨眼次数
     */
    blink(count = 1) {
        const tl = anime.timeline({
            easing: 'easeInOutQuad'
        });

        for (let i = 0; i < count; i++) {
            tl.add({
                targets: [this.leftEye, this.rightEye],
                ry: 0.5,
                duration: 100
            })
            .add({
                targets: [this.leftEye, this.rightEye],
                ry: 8,
                duration: 150
            });
        }

        return tl.finished;
    }

    /**
     * 蹦跳动画 - 更自然流畅的弹跳效果
     */
    jump() {
        const tl = anime.timeline();

        // 阶段1: 蓄力下蹲（80ms）
        tl.add({
            targets: this.svg,
            scaleY: 0.7,
            scaleX: 1.15,
            translateY: 15,
            duration: 80,
            easing: 'easeInQuad'
        })
        // 阶段2: 起跳（120ms）
        .add({
            targets: this.svg,
            scaleY: 0.9,
            scaleX: 1.05,
            translateY: -50,
            duration: 120,
            easing: 'easeOutQuad'
        })
        // 阶段3: 空中最高点（60ms）
        .add({
            targets: this.svg,
            scaleY: 1.05,
            scaleX: 0.95,
            duration: 60,
            easing: 'easeOutQuad'
        })
        // 阶段4: 下落（150ms）
        .add({
            targets: this.svg,
            scaleY: 0.95,
            scaleX: 1.02,
            translateY: 0,
            duration: 150,
            easing: 'easeInQuad'
        })
        // 阶段5: 落地压缩（60ms）
        .add({
            targets: this.svg,
            scaleY: 0.75,
            scaleX: 1.12,
            duration: 60,
            easing: 'easeOutQuad'
        })
        // 阶段6: 回弹恢复（200ms）
        .add({
            targets: this.svg,
            scaleY: 1,
            scaleX: 1,
            duration: 200,
            easing: 'easeOutElastic(1, 0.5)'
        });

        return tl.finished;
    }

    /**
     * 弹性缩放动画（用于开场效果）
     * @param {number} fromSize - 起始大小
     * @param {number} toSize - 目标大小
     * @param {number} duration - 动画时长
     */
    elasticScale(fromSize, toSize, duration = 400) {
        // 设置初始 CSS 大小
        this.svg.style.width = fromSize + 'px';
        this.svg.style.height = fromSize + 'px';

        return anime({
            targets: this.svg,
            width: toSize,
            height: toSize,
            duration: duration,
            easing: 'easeOutElastic(1, .5)',
            update: (anim) => {
                // 同步更新 SVG 的 viewBox 以保持清晰度
                const currentWidth = parseFloat(this.svg.style.width);
                const currentHeight = parseFloat(this.svg.style.height);
                if (currentWidth && currentHeight) {
                    this.svg.setAttribute('width', currentWidth);
                    this.svg.setAttribute('height', currentHeight);
                }
            }
        }).finished;
    }

    /**
     * 移动到指定位置
     * @param {number} x - 目标X坐标
     * @param {number} y - 目标Y坐标
     * @param {number} duration - 动画时长
     */
    moveTo(x, y, duration = 800) {
        return anime({
            targets: this.svg,
            left: x,
            top: y,
            duration: duration,
            easing: 'cubicBezier(0.4, 0, 0.2, 1)'
        }).finished;
    }

    /**
     * 随机动作（眨眼或蹦跳）
     */
    randomAction() {
        const actions = ['blink', 'jump'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        this[randomAction]();
    }

    /**
     * 销毁控制器
     */
    destroy() {
        // 停止所有动画
        anime.remove(this.svg);
        anime.remove([this.leftEye, this.rightEye]);

        // 移除 SVG
        if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
        }

        this.svg = null;
        this.face = null;
        this.leftEye = null;
        this.rightEye = null;
    }
}

// 导出控制器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIIconController;
}
