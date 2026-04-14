/**
 * Workplace 主控制器
 *
 * 负责工作台的初始化、二级页面的显示/隐藏切换
 * 整合菜单管理、页面路由管理等功能
 *
 * 设计原则：
 * - 子控制器负责各自页面的业务逻辑
 * - 主控制器只负责页面切换，不销毁页面
 * - 首次打开页面时执行动画和数据获取
 * - 再次打开时只刷新数据，不执行动画
 */

import { DispatchController } from './dispatch/dispatch.js';
import { ProcessingController } from './processing/processing.js';

class WorkplaceController {
    /**
     * 构造函数
     */
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
        this.controllers = {};
        this.pageContainers = {};
        this.menuData = [];
        this.currentUser = null;

        // DOM 元素引用
        this.workspace = null;
        this.workspaceContent = null;
        this.menuContainer = null;
        this.sidebar = null;
    }

    /**
     * 初始化工作台
     */
    async init() {
        if (this.isInitialized) {
            console.log('[WorkplaceController] 已经初始化，跳过');
            return;
        }

        console.log('[WorkplaceController] 开始初始化');

        // 获取 DOM 元素
        this.workspace = document.getElementById('workspace');
        this.workspaceContent = document.getElementById('workspace-content');
        this.menuContainer = document.getElementById('menu-container');
        this.sidebar = document.getElementById('sidebar');

        // 检查登录状态
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/';
            return;
        }

        // 加载菜单
        await this.loadMenu();

        // 注册页面控制器
        this.registerPageControllers();

        // 初始化事件监听
        this.bindEvents();

        // 初始化智能助手
        this.initAIAssistant();

        // 加载首页
        await this.navigate('home');

        // 触发淡入动画
        document.body.classList.add('fade-in');

        this.isInitialized = true;
        console.log('[WorkplaceController] 初始化完成');
    }

    /**
     * 显示工作台
     */
    show() {
        if (!this.isInitialized) {
            console.warn('[WorkplaceController] 工作台未初始化');
            return;
        }
        document.body.classList.remove('hidden');
        console.log('[WorkplaceController] 工作台已显示');
    }

    /**
     * 隐藏工作台
     */
    hide() {
        if (!this.isInitialized) {
            console.warn('[WorkplaceController] 工作台未初始化');
            return;
        }
        document.body.classList.add('hidden');
        console.log('[WorkplaceController] 工作台已隐藏');
    }

    /**
     * 销毁工作台
     */
    destroy() {
        // 隐藏当前页面
        if (this.currentPage && this.pageContainers[this.currentPage]) {
            const container = this.pageContainers[this.currentPage];
            container.style.display = 'none';
        }

        // 清理引用
        this.controllers = {};
        this.pageContainers = {};
        this.menuData = [];
        this.currentUser = null;
        this.isInitialized = false;

        console.log('[WorkplaceController] 工作台已销毁');
    }

    /**
     * 检查登录状态
     */
    async checkAuth() {
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
            return data.is_authenticated;
        } catch (error) {
            console.error('[WorkplaceController] 检查登录状态失败:', error);
            return false;
        }
    }

    /**
     * 从 API 加载菜单
     */
    async loadMenu() {
        try {
            const response = await fetch('/api/config/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_menu',
                    args: {}
                })
            });
            const data = await response.json();

            if (data.success) {
                this.menuData = data.data.menu;
                this.currentUser = data.data.user;
                this.renderMenu();
                this.updateUserInfo();
            } else {
                console.error('[WorkplaceController] 加载菜单失败:', data.error);
                if (response.status === 401) {
                    window.location.href = '/';
                }
            }
        } catch (error) {
            console.error('[WorkplaceController] 加载菜单出错:', error);
        }
    }

    /**
     * 渲染菜单
     */
    renderMenu() {
        let html = '';

        this.menuData.forEach((group, index) => {
            if (index > 0) {
                html += `
                    <li class="pt-4 border-t border-gray-200 mt-4">
                        <p class="px-4 text-xs text-gray-400 uppercase tracking-wider mb-2">${group.group}</p>
                    </li>
                `;
            }

            group.items.forEach(item => {
                const isActive = item.id === 'home' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50';
                const isLogout = item.is_action ? 'text-red-600 hover:bg-red-50' : '';

                html += `
                    <li>
                        <a href="#" class="menu-item flex items-center px-4 py-3 ${isActive} ${isLogout} rounded-xl transition"
                           data-menu="${item.id}"
                           data-path="${item.path}"
                           ${item.is_action ? 'data-action="true"' : ''}>
                            <i class="fas ${item.icon} w-6"></i>
                            <span class="font-medium">${item.name}</span>
                        </a>
                    </li>
                `;
            });
        });

        this.menuContainer.innerHTML = `<ul class="space-y-2">${html}</ul>`;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const menuItems = this.menuContainer.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const menuId = item.dataset.menu;
                const isAction = item.dataset.action === 'true';

                if (isAction) {
                    if (menuId === 'logout') {
                        this.handleLogout();
                    }
                } else {
                    this.navigate(menuId);
                }
            });
        });

        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleMenu();
            });
        }
    }

    /**
     * 切换菜单显示/隐藏
     */
    toggleMenu() {
        if (this.sidebar.classList.contains('closed')) {
            this.showMenu();
        } else {
            this.hideMenu();
        }
    }

    /**
     * 显示菜单
     */
    showMenu() {
        if (this.sidebar && this.sidebar.classList.contains('closed')) {
            this.sidebar.classList.remove('closed');
            if (this.workspace) {
                this.workspace.style.marginLeft = '16rem';
            }
        }
    }

    /**
     * 隐藏菜单
     */
    hideMenu() {
        if (this.sidebar && !this.sidebar.classList.contains('closed')) {
            this.sidebar.classList.add('closed');
            if (this.workspace) {
                this.workspace.style.marginLeft = '0';
            }
        }
    }

    /**
     * 更新菜单激活状态
     */
    updateActiveMenu(activePage) {
        const menuItems = this.menuContainer.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const menuId = item.dataset.menu;
            if (menuId === activePage) {
                item.classList.remove('text-gray-600', 'hover:bg-gray-50');
                item.classList.add('bg-blue-50', 'text-blue-600');
            } else if (!item.dataset.action) {
                item.classList.remove('bg-blue-50', 'text-blue-600');
                item.classList.add('text-gray-600', 'hover:bg-gray-50');
            }
        });
    }

    /**
     * 更新用户信息显示
     */
    updateUserInfo() {
        if (this.currentUser) {
            const usernameEl = document.getElementById('username');
            if (usernameEl) {
                usernameEl.textContent = this.currentUser.name;
            }
        }
    }

    /**
     * 处理退出登录
     */
    async handleLogout() {
        try {
            const response = await fetch('/api/auth/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'logout',
                    args: {}
                })
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('[WorkplaceController] 退出失败:', error);
        }
    }

    /**
     * 导航到指定页面
     *
     * 核心逻辑：
     * 1. 如果页面已加载，直接显示并刷新数据
     * 2. 如果页面未加载，加载HTML并初始化
     * 3. 不销毁已加载的页面，保持页面状态
     */
    async navigate(pageName) {
        if (this.currentPage === pageName) return;

        console.log(`[WorkplaceController] 导航到: ${pageName}`);

        // 立即更新菜单选中状态
        this.updateActiveMenu(pageName);

        // 停止当前页面的动画并隐藏
        if (this.currentPage && this.pageContainers[this.currentPage]) {
            // 先停止当前页面的动画
            if (this.controllers[this.currentPage] && typeof this.controllers[this.currentPage].stopAnimation === 'function') {
                this.controllers[this.currentPage].stopAnimation();
            }

            const currentContainer = this.pageContainers[this.currentPage];
            currentContainer.style.display = 'none';

            // 调用子控制器的 hide 方法（如果存在）
            if (this.controllers[this.currentPage] && typeof this.controllers[this.currentPage].hide === 'function') {
                this.controllers[this.currentPage].hide();
            }
        }

        // 检查目标页面是否已加载
        if (this.pageContainers[pageName]) {
            // 页面已加载，直接显示
            console.log(`[WorkplaceController] 页面 ${pageName} 已加载，直接显示`);
            const targetContainer = this.pageContainers[pageName];
            targetContainer.style.display = 'block';

            // 调用子控制器的 show 方法（如果存在）
            if (this.controllers[pageName]) {
                // 设置当前控制器引用
                this.currentController = this.controllers[pageName];
                if (typeof this.controllers[pageName].show === 'function') {
                    await this.controllers[pageName].show();
                }
                // 刷新数据
                if (typeof this.controllers[pageName].refresh === 'function') {
                    await this.controllers[pageName].refresh();
                }
            }
        } else {
            // 页面未加载，需要加载HTML并初始化
            console.log(`[WorkplaceController] 页面 ${pageName} 未加载，开始加载`);

            // 创建页面容器
            const pageContainer = document.createElement('div');
            pageContainer.id = `page-${pageName}`;
            pageContainer.className = 'page-container h-full';
            pageContainer.style.display = 'none';
            this.workspaceContent.appendChild(pageContainer);
            this.pageContainers[pageName] = pageContainer;

            // 加载页面 HTML
            await this.loadPageHtml(pageName, pageContainer);

            // 等待 DOM 更新完成
            await new Promise(resolve => requestAnimationFrame(resolve));

            // 初始化页面控制器
            if (this.controllers[pageName]) {
                pageContainer.style.display = 'block';
                // 设置当前控制器引用
                this.currentController = this.controllers[pageName];
                await this.controllers[pageName].init(pageContainer);
            } else {
                console.error(`[WorkplaceController] 找不到控制器: ${pageName}`);
                pageContainer.innerHTML = `<div class="text-center py-8 text-red-500">页面控制器未找到: ${pageName}</div>`;
                pageContainer.style.display = 'block';
            }
        }

        this.currentPage = pageName;
    }

    /**
     * 加载页面 HTML
     */
    async loadPageHtml(pageName, container) {
        try {
            const templateUrl = `/workplace/template/${pageName}/`;
            const response = await fetch(templateUrl);
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error(`[WorkplaceController] 加载页面失败: ${pageName}`, error);
            container.innerHTML = `<div class="text-center py-8 text-red-500">加载页面失败: ${pageName}</div>`;
        }
    }

    /**
     * 注册页面控制器
     */
    registerController(pageName, controller) {
        this.controllers[pageName] = controller;
        console.log(`[WorkplaceController] 注册控制器: ${pageName}`);
    }

    /**
     * 注册所有页面控制器
     */
    registerPageControllers() {
        console.log('[WorkplaceController] 开始注册页面控制器');

        // 注册首页控制器
        if (typeof HomeController !== 'undefined') {
            this.registerController('home', new HomeController());
        } else {
            console.warn('[WorkplaceController] HomeController 未定义');
        }

        // 注册下发工作台控制器
        this.registerController('dispatch', new DispatchController());

        // 注册处理工作台控制器
        this.registerController('processing', new ProcessingController());

        // 注册所有信件页面控制器
        if (typeof LettersController !== 'undefined') {
            this.registerController('letters', new LettersController());
        } else {
            console.warn('[WorkplaceController] LettersController 未定义');
        }

        // 注册分类管理页面控制器
        if (typeof CategoryController !== 'undefined') {
            this.registerController('category', new CategoryController());
        } else {
            console.warn('[WorkplaceController] CategoryController 未定义');
        }

        // 注册用户管理页面控制器
        if (typeof UsersController !== 'undefined') {
            this.registerController('users', new UsersController());
        } else {
            console.warn('[WorkplaceController] UsersController 未定义');
        }

        // 注册组织管理页面控制器
        if (typeof OrganizationController !== 'undefined') {
            this.registerController('organization', new OrganizationController());
        } else {
            console.warn('[WorkplaceController] OrganizationController 未定义');
        }

        // 注册专项关注管理页面控制器
        if (typeof SpecialFocusController !== 'undefined') {
            this.registerController('special-focus', specialFocusController);
        } else {
            console.warn('[WorkplaceController] SpecialFocusController 未定义');
        }

        console.log('[WorkplaceController] 已注册控制器列表:', Object.keys(this.controllers));
    }

    /**
     * 初始化智能助手
     */
    initAIAssistant() {
        const aiAssistantEl = document.getElementById('ai-assistant');
        if (!aiAssistantEl || typeof AIIconController === 'undefined') {
            return;
        }

        const aiAssistant = new AIIconController('#ai-assistant', {
            size: 32,
            color: '#4b5563'
        });

        aiAssistantEl.addEventListener('click', function() {
            aiAssistant.jump();
            console.log('[WorkplaceController] 打开智能助手');
        });

        const randomBlink = () => {
            const interval = 3000 + Math.random() * 2000;
            setTimeout(() => {
                aiAssistant.blink();
                randomBlink();
            }, interval);
        };
        randomBlink();
    }

    /**
     * 显示全局通知
     * @param {string} html - HTML富文本内容
     * @param {string} position - 显示位置，可选值：'top'|'bottom'|'center'，默认'bottom'
     * @param {number} duration - 显示时长（毫秒），默认5000ms
     */
    showNotification(html, position = 'bottom', duration = 5000) {
        // 创建通知容器（如果不存在）
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // 根据位置设置容器位置
        if (position === 'top') {
            container.style.top = '20px';
            container.style.bottom = 'auto';
        } else if (position === 'center') {
            container.style.top = '50%';
            container.style.bottom = 'auto';
            container.style.transform = 'translate(-50%, -50%)';
        } else {
            // bottom
            container.style.bottom = '20px';
            container.style.top = 'auto';
            container.style.transform = 'translateX(-50%)';
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            border: 1px solid rgba(229, 231, 235, 0.8);
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            min-width: 300px;
            max-width: 500px;
            pointer-events: auto;
            animation: notification-slide-in 0.3s ease;
        `;
        notification.innerHTML = html;

        // 添加动画样式（如果不存在）
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes notification-slide-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes notification-slide-out {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // 添加到容器
        container.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'notification-slide-out 0.3s ease forwards';
            setTimeout(() => {
                notification.remove();
                // 如果没有通知了，移除容器
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);

        return notification;
    }
}

// 创建全局实例
const workplaceController = new WorkplaceController();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    workplaceController.init();
});

// 挂载到 window，供其他代码使用
window.workplaceController = workplaceController;
