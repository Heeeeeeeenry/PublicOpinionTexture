/**
 * Workplace 主控制器
 *
 * 负责工作台的初始化、菜单管理、页面路由、通知弹窗和退出登录
 * 精简版：只保留核心功能
 */

class Workplace {
    /**
     * 构造函数
     */
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
        this.menuData = [];
        this.currentUser = null;

        // 页面控制器和容器管理
        this.controllers = {};
        this.pageContainers = {};  // 页面容器管理
        this.currentController = null;
        this.navigating = false;  // 防止重复导航标志

        // DOM 元素引用
        this.workspace = null;
        this.workspaceContent = null;
        this.menuContainer = null;
        this.sidebar = null;

        // 需要动态加载的脚本列表
        this.scriptsToLoad = [
            // 第三方库
            '/static/js/lib/anime.min.js',
            '/static/js/lib/marked.umd.js',
            '/static/js/lib/echarts.min.js',
            '/static/js/lib/ai_icon_controller.js',
            '/static/js/lib/AiController.js',
            '/static/js/lib/wp-animation.js',
            // 首页控制器
            '/static/js/workplace/home/home-tools.js',
            '/static/js/workplace/home/home.js',
            // 信件页面控制器
            '/static/js/workplace/letters/letters-tools.js',
            '/static/js/workplace/letters/letters.js',
            // 下发工作台控制器
            '/static/js/workplace/dispatch/dispatch-html.js',
            '/static/js/workplace/dispatch/dispatch-tools.js',
            '/static/js/workplace/dispatch/dispatch.js',
            // 核查工作台控制器
            '/static/js/workplace/audit/audit-html.js',
            '/static/js/workplace/audit/audit-tools.js',
            '/static/js/workplace/audit/audit.js',
            // 处理工作台控制器
            '/static/js/workplace/processing/processing-html.js',
            '/static/js/workplace/processing/processing-tools.js',
            '/static/js/workplace/processing/processing.js',
            // 统计工作台控制器
            '/static/js/workplace/statistics/statistics-html.js',
            '/static/js/workplace/statistics/statistics-tools.js',
            '/static/js/workplace/statistics/statistics.js',
            // 用户管理页面控制器
            '/static/js/workplace/users/users-html.js',
            '/static/js/workplace/users/users-tools.js',
            '/static/js/workplace/users/users.js',
            // 组织管理页面控制器
            '/static/js/workplace/organization/organization-html.js',
            '/static/js/workplace/organization/organization-tools.js',
            '/static/js/workplace/organization/organization.js',
            // 专项关注页面控制器
            '/static/js/workplace/special-focus/special-focus-html.js',
            '/static/js/workplace/special-focus/special-focus-tools.js',
            '/static/js/workplace/special-focus/special-focus.js',
            // 分类管理页面控制器
            '/static/js/workplace/category/category-html.js',
            '/static/js/workplace/category/category-tools.js',
            '/static/js/workplace/category/category.js'
        ];

        this.loadedScripts = new Set();
    }

    /**
     * 动态加载单个脚本
     * @param {string} src - 脚本路径
     * @returns {Promise}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (this.loadedScripts.has(src)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedScripts.add(src);
                resolve();
            };
            script.onerror = () => {
                console.error(`[Workplace] 脚本加载失败: ${src}`);
                resolve();
            };
            document.body.appendChild(script);
        });
    }

    /**
     * 动态加载所有脚本
     * @returns {Promise}
     */
    async loadAllScripts() {
        console.log('[Workplace] 开始动态加载脚本');

        for (const src of this.scriptsToLoad) {
            await this.loadScript(src);
        }

        console.log('[Workplace] 所有脚本加载完成');
    }

    /**
     * 初始化工作台
     */
    async init() {
        if (this.isInitialized) {
            console.log('[Workplace] 已经初始化，跳过');
            return;
        }

        console.log('[Workplace] 开始初始化');

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

        // 初始化事件监听
        this.bindEvents();

        // 注册页面控制器
        this.registerPageControllers();

        // 隐藏加载动画，显示工作台
        await this.hideLoadingAndShowWorkplace();

        // 延迟加载首页内容（确保工作台框架已显示）
        setTimeout(async () => {
            await this.navigate('home');
        }, 100);

        this.isInitialized = true;
        console.log('[Workplace] 初始化完成');
    }

    /**
     * 隐藏加载动画并显示工作台
     * 实现动画衔接：加载动画淡出 -> 工作台淡入
     */
    async hideLoadingAndShowWorkplace() {
        const loadingOverlay = document.getElementById('page-loading');

        return new Promise((resolve) => {
            if (loadingOverlay) {
                // 添加淡出类，触发CSS过渡动画
                loadingOverlay.classList.add('fade-out');

                // 等待淡出动画完成后，显示工作台
                setTimeout(() => {
                    // 触发工作台淡入动画
                    document.body.classList.add('fade-in');

                    // 移除加载遮罩层
                    setTimeout(() => {
                        loadingOverlay.remove();
                        resolve();
                    }, 500);
                }, 600);
            } else {
                // 没有加载遮罩层，直接显示工作台
                document.body.classList.add('fade-in');
                resolve();
            }
        });
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
        // 菜单项点击事件
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

        // 菜单切换按钮
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
     * 注册页面控制器
     * @param {string} pageName - 页面名称
     * @param {Object} controller - 控制器实例
     */
    registerController(pageName, controller) {
        this.controllers[pageName] = controller;
        console.log(`[Workplace] 注册控制器: ${pageName}`);
    }

    /**
     * 导航到指定页面
     * @param {string} pageName - 页面名称
     */
    async navigate(pageName) {
        if (this.currentPage === pageName) {
            console.log(`[Workplace] 已经是当前页面: ${pageName}，跳过导航`);
            return;
        }
        
        // 防止重复导航
        if (this.navigating) {
            console.log(`[Workplace] 正在导航中，跳过重复请求: ${pageName}`);
            return;
        }
        
        this.navigating = true;
        
        console.log(`[Workplace] 导航到: ${pageName}，当前页面: ${this.currentPage || '无'}`);

        // 更新菜单选中状态
        this.updateActiveMenu(pageName);

        try {
            // === 阶段1：核心导航操作（需要同步保护）===
            
            // 1.1 处理当前页面
            if (this.currentPage && this.pageContainers[this.currentPage]) {
                // 停止动画
                if (this.currentController && typeof this.currentController.stopAnimation === 'function') {
                    console.log(`[Workplace] 停止 ${this.currentPage} 的动画`);
                    this.currentController.stopAnimation();
                }
                
                // 隐藏容器
                console.log(`[Workplace] 隐藏当前页面容器: ${this.currentPage}`);
                this.pageContainers[this.currentPage].style.display = 'none';
                
                // 调用 hide 方法
                if (this.currentController && typeof this.currentController.hide === 'function') {
                    console.log(`[Workplace] 调用 ${this.currentPage}.hide()`);
                    await this.currentController.hide();
                }
            }

            // 1.2 处理目标页面容器
            if (!this.pageContainers[pageName]) {
                // 页面未加载，创建容器
                console.log(`[Workplace] 页面 ${pageName} 未加载，创建容器`);
                const pageContainer = document.createElement('div');
                pageContainer.id = `page-${pageName}`;
                pageContainer.className = 'page-container h-full';
                pageContainer.style.display = 'block';
                this.workspaceContent.appendChild(pageContainer);
                this.pageContainers[pageName] = pageContainer;
            }
            
            // 1.3 显示目标容器
            console.log(`[Workplace] 显示页面容器: ${pageName}`);
            this.pageContainers[pageName].style.display = 'block';
            
            // 1.4 更新控制器引用
            this.currentController = this.controllers[pageName];
            
            // 1.5 更新当前页面状态（立即更新，让用户知道已切换）
            this.currentPage = pageName;
            
            // === 阶段2：页面初始化和显示（可以异步执行）===
            
            // 2.1 如果页面需要初始化（异步执行，不阻塞）
            if (this.currentController && typeof this.currentController.init === 'function') {
                // 检查是否已初始化
                if (!this.currentController.isInitialized) {
                    console.log(`[Workplace] 开始异步初始化控制器 ${pageName}`);
                    // 不等待，立即返回
                    this.currentController.init(this.pageContainers[pageName]).then(() => {
                        console.log(`[Workplace] 控制器 ${pageName} 初始化完成`);
                        
                        // 初始化完成后显示页面
                        if (this.currentController && typeof this.currentController.show === 'function') {
                            console.log(`[Workplace] 初始化后调用 ${pageName}.show()`);
                            this.currentController.show().catch(err => {
                                console.error(`[Workplace] 显示控制器 ${pageName} 失败:`, err);
                            });
                        }
                    }).catch(err => {
                        console.error(`[Workplace] 初始化控制器 ${pageName} 失败:`, err);
                    });
                } else {
                    // 页面已初始化，直接显示
                    if (this.currentController && typeof this.currentController.show === 'function') {
                        console.log(`[Workplace] 调用已初始化的 ${pageName}.show()`);
                        this.currentController.show().catch(err => {
                            console.error(`[Workplace] 显示控制器 ${pageName} 失败:`, err);
                        });
                    }
                }
            } else {
                // 没有 init 方法，直接显示
                if (this.currentController && typeof this.currentController.show === 'function') {
                    console.log(`[Workplace] 直接调用 ${pageName}.show()`);
                    this.currentController.show().catch(err => {
                        console.error(`[Workplace] 显示控制器 ${pageName} 失败:`, err);
                    });
                }
            }
            
            console.log(`[Workplace] 核心导航完成，当前页面: ${pageName}`);
            
        } catch (error) {
            console.error(`[Workplace] 导航到 ${pageName} 失败:`, error);
            // 恢复之前的状态
            if (this.currentPage && this.pageContainers[this.currentPage]) {
                this.pageContainers[this.currentPage].style.display = 'block';
            }
            throw error;
        } finally {
            // 立即重置导航标志，允许用户继续切换
            this.navigating = false;
            console.log(`[Workplace] 导航标志已重置，允许继续导航`);
        }
    }

    /**
     * 注册所有页面控制器
     */
    registerPageControllers() {
        console.log('[Workplace] 开始注册页面控制器');

        // 注册首页控制器
        if (typeof HomeController !== 'undefined') {
            this.registerController('home', new HomeController());
        } else {
            console.warn('[Workplace] HomeController 未定义');
        }

        // 注册信件页面控制器
        if (typeof LettersController !== 'undefined') {
            this.registerController('letters', new LettersController());
        } else {
            console.warn('[Workplace] LettersController 未定义');
        }

        // 注册下发工作台控制器
        if (typeof DispatchController !== 'undefined') {
            this.registerController('dispatch', new DispatchController());
        } else {
            console.warn('[Workplace] DispatchController 未定义');
        }

        // 注册核查工作台控制器
        if (typeof AuditController !== 'undefined') {
            this.registerController('audit', new AuditController());
        } else {
            console.warn('[Workplace] AuditController 未定义');
        }

        // 注册处理工作台控制器
        if (typeof ProcessingController !== 'undefined') {
            this.registerController('processing', new ProcessingController());
        } else {
            console.warn('[Workplace] ProcessingController 未定义');
        }

        // 注册统计工作台控制器
        if (typeof StatisticsController !== 'undefined') {
            this.registerController('statistics', new StatisticsController());
        } else {
            console.warn('[Workplace] StatisticsController 未定义');
        }

        // 注册用户管理控制器
        if (typeof UsersController !== 'undefined') {
            this.registerController('users', new UsersController());
        } else {
            console.warn('[Workplace] UsersController 未定义');
        }

        // 注册组织管理控制器
        if (typeof OrganizationController !== 'undefined') {
            this.registerController('organization', new OrganizationController());
        } else {
            console.warn('[Workplace] OrganizationController 未定义');
        }

        // 注册专项关注控制器
        if (typeof SpecialFocusController !== 'undefined') {
            this.registerController('special-focus', new SpecialFocusController());
        } else {
            console.warn('[Workplace] SpecialFocusController 未定义');
        }

        // 注册分类管理控制器
        if (typeof CategoryController !== 'undefined') {
            this.registerController('category', new CategoryController());
        } else {
            console.warn('[Workplace] CategoryController 未定义');
        }

        console.log('[Workplace] 已注册控制器列表:', Object.keys(this.controllers));
    }

    /**
     * 加载页面（无控制器时使用，显示提示信息）
     * @param {string} pageName - 页面名称
     */
    async loadPage(pageName) {
        console.warn(`[Workplace] 页面 ${pageName} 没有对应的控制器`);
        this.workspaceContent.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                    <i class="fas fa-construction text-4xl mb-4"></i>
                    <p>页面 ${pageName} 正在开发中</p>
                </div>
            </div>
        `;
    }

    /**
     * 显示全局通知弹窗
     * @param {string} html - HTML富文本内容
     * @param {string} position - 显示位置，可选值：'top'|'bottom'|'center'，默认'bottom'
     * @param {number} duration - 显示时长（毫秒），默认5000ms
     * @returns {HTMLElement} 通知元素
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
const workplace = new Workplace();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Workplace] DOM加载完成，开始加载脚本');

    // 动态加载所有脚本
    await workplace.loadAllScripts();

    console.log('[Workplace] 脚本加载完成，开始初始化');

    // 初始化工作台
    await workplace.init();
});

// 挂载到 window，供其他代码使用
window.workplace = workplace;