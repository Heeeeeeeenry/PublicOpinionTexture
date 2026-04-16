/**
 * 用户管理控制器
 *
 * 负责用户管理页面的初始化、数据加载、增删改查操作
 * 使用 anime.js 实现入场动画和交互动画
 *
 * 权限控制：
 * - 市局：管理所有用户
 * - 区县局：管理本单位用户
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
 */

class UsersController {
    /**
     * 构造函数
     */
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.animationCompleted = false;
        this.currentAnimation = null;
        this.initAborted = false;
        this.users = [];
        this.filteredUsers = [];
        this.units = [];
        this.currentUser = null;
        this.deleteId = null;
        this.resetPasswordId = null;
        this.needRefresh = true;  // 初始需要刷新

        // 分页相关属性
        this.pageSize = 20;
        this.currentPage = 1;
        this.totalCount = 0;
        this.totalPages = 1;

        // DOM 元素引用
        this.elements = {};
    }

    /**
     * 停止当前动画
     * 当页面切换时调用，立即结束动画并重置元素状态
     */
    stopAnimation() {
        // 设置中断标志
        this.initAborted = true;
        
        if (this.currentAnimation) {
            // 完全停止动画，移除所有回调
            try {
                this.currentAnimation.pause();
                // 移除动画实例的所有回调
                if (this.currentAnimation._callbacks) {
                    this.currentAnimation._callbacks = {};
                }
                // 立即完成动画，跳过所有剩余动画
                this.currentAnimation.seek(this.currentAnimation.duration);
                this.currentAnimation = null;
            } catch (error) {
                console.error('[UsersController] 停止动画出错:', error);
            }
        }
        // 重置所有元素到可见状态
        this.resetElementsVisibility();
        
        // 清理所有可能的内存引用
        this.cleanupAnimation();
    }
    
    /**
     * 清理动画相关资源
     */
    cleanupAnimation() {
        // 清理动画实例
        this.currentAnimation = null;
        
        // 重置动画状态
        this.animationPlayed = false;
        this.animationCompleted = false;
        
        // 清理可能的事件监听器
        if (this.container) {
            // 移除所有 anime.js 相关的数据属性
            const animeElements = this.container.querySelectorAll('[data-anime]');
            animeElements.forEach(el => {
                el.removeAttribute('data-anime');
            });
        }
    }

    /**
     * 重置元素可见性
     * 将所有元素设置为可见状态
     */
    resetElementsVisibility() {
        if (!this.container) return;

        const selectors = [
            '.users-header',
            '.search-filter-panel',
            '#users-table-body tr',
            '.pagination-panel'
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
     * 初始化控制器
     *
     * 首次打开页面时调用，执行完整的初始化和动画
     *
     * @param {HTMLElement} container - 容器元素
     */
    async init(container) {
        this.container = container;
        this.initAborted = false;
        console.log('[UsersController] 初始化用户管理页面');

        // 第1步：先隐藏所有元素，防止闪烁
        this.hideAllElements();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第2步：获取当前用户信息
        await this.loadCurrentUser();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第3步：获取 DOM 元素
        this.getElements();

        // 第4步：绑定事件
        this.bindEvents();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第5步：加载单位列表
        await this.loadUnits();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第6步：加载用户数据（首次进入时跳过动画，等待入场动画）
        await this.loadUsers(true);

        // 检查是否被中断
        if (this.initAborted) return;

        // 第7步：执行入场动画（如果动画未完成或未播放过）
        if (!this.animationPlayed || !this.animationCompleted) {
            this.animationPlayed = true;
            this.animationCompleted = false;
            await this.playEntranceAnimation();
        }

        // 检查是否被中断
        if (this.initAborted) return;

        this.isInitialized = true;
    }

    /**
     * 隐藏所有元素（初始化前调用，防止闪烁）
     */
    hideAllElements() {
        if (this.container) {
            const selectors = [
                '.users-header',
                '.search-filter-panel',
                '#users-table-body tr',
                '.pagination-panel'
            ];

            selectors.forEach(selector => {
                const elements = this.container.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.opacity = '0';
                });
            });
        }
    }

    /**
     * 显示页面
     *
     * 再次打开页面时调用，刷新数据并执行表格动画
     */
    async show() {
        console.log('[UsersController] 页面显示');

        // 确保所有元素可见
        this.ensureElementsVisible();

        // 页面切换时跳过动画，直接显示
        // 只有在数据过期或需要刷新时才重新加载
        if (this.needRefresh || !this.users || this.users.length === 0) {
            await this.loadUsers(true);  // skipAnimation = true
            this.needRefresh = false;
        } else {
            // 已有数据，直接渲染表格（跳过动画）
            this.renderTable(true);
        }
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[UsersController] 页面隐藏');
        // 关闭可能打开的弹窗
        if (this.elements.modal) {
            this.closeModal();
        }
        if (this.elements.deleteModal) {
            this.closeDeleteModal();
        }
        if (this.elements.resetPasswordModal) {
            this.closeResetPasswordModal();
        }
    }

    /**
     * 刷新数据
     *
     * 再次打开页面时调用，只刷新数据，不执行动画
     */
    async refresh() {
        console.log('[UsersController] 刷新数据');
        if (!this.isInitialized) return;

        await this.loadUsers();
    }

    /**
     * 确保所有元素可见（用于非首次访问）
     */
    ensureElementsVisible() {
        const selectors = [
            '.users-header',
            '.search-filter-panel',
            '#users-table-body tr',
            '.pagination-panel'
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
     * 使用 anime.js 实现动画效果
     * 仅在页面首次访问时执行
     *
     * @returns {Promise} 动画完成后的 Promise
     */
    async playEntranceAnimation() {
        // 确保所有元素先隐藏
        const header = this.container.querySelector('.users-header');
        const searchPanel = this.container.querySelector('.search-filter-panel');
        const tableRows = this.container.querySelectorAll('#users-table-body tr');
        const paginationPanel = this.container.querySelector('.pagination-panel');

        if (header) header.style.opacity = '0';
        if (searchPanel) searchPanel.style.opacity = '0';
        if (paginationPanel) paginationPanel.style.opacity = '0';
        tableRows.forEach(row => row.style.opacity = '0');

        return new Promise((resolve) => {
            const tl = anime.timeline({
                easing: 'easeOutExpo',
                complete: () => {
                    this.animationCompleted = true;
                    this.currentAnimation = null;
                    resolve();
                }
            });

            // 保存动画实例
            this.currentAnimation = tl;

            // 1. 页面标题栏动画
            tl.add({
                targets: this.container.querySelectorAll('.users-header'),
                opacity: [0, 1],
                translateY: [30, 0],
                scale: [0.95, 1],
                duration: 800
            })
            // 2. 搜索栏动画
            .add({
                targets: this.container.querySelectorAll('.search-filter-panel'),
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 600
            }, '-=400')
            // 3. 分页信息动画（在表格数据之前）
            .add({
                targets: this.container.querySelectorAll('.pagination-panel'),
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 500
            }, '-=300')
            // 4. 表格行同时从左向右划入
            .add({
                targets: this.container.querySelectorAll('#users-table-body tr'),
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 500
            }, '-=300');
        });
    }

    /**
     * 加载当前用户信息
     */
    async loadCurrentUser() {
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
                this.currentUser = data.data;
                console.log('[UsersController] 当前用户:', this.currentUser);

                // 更新副标题显示当前管理范围
                const subtitle = this.container.querySelector('#users-subtitle');
                if (subtitle) {
                    if (this.currentUser.permission_level === '市局') {
                        subtitle.textContent = '管理所有用户账号';
                    } else if (this.currentUser.permission_level === '区县局') {
                        subtitle.textContent = `管理本单位用户账号`;
                    }
                }
            }
        } catch (error) {
            console.error('[UsersController] 加载当前用户信息失败:', error);
        }
    }

    /**
     * 获取 DOM 元素引用
     */
    getElements() {
        this.elements = {
            tableBody: this.container.querySelector('#users-table-body'),
            searchInput: this.container.querySelector('#search-input'),
            filterLevel: this.container.querySelector('#filter-level'),
            filterStatus: this.container.querySelector('#filter-status'),
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),
            btnAdd: this.container.querySelector('#btn-add-user')
        };

        // 弹窗元素
        this.elements.modal = document.querySelector('#user-modal');
        this.elements.modalTitle = document.querySelector('#modal-title');
        this.elements.userId = document.querySelector('#user-id');
        this.elements.inputPoliceNumber = document.querySelector('#input-police-number');
        this.elements.inputName = document.querySelector('#input-name');
        this.elements.inputNickname = document.querySelector('#input-nickname');
        this.elements.inputPhone = document.querySelector('#input-phone');
        this.elements.inputPermissionLevel = document.querySelector('#input-permission-level');
        this.elements.inputUnitLevel1 = document.querySelector('#input-unit-level1');
        this.elements.inputUnitLevel2 = document.querySelector('#input-unit-level2');
        this.elements.inputUnitLevel3 = document.querySelector('#input-unit-level3');
        this.elements.inputPassword = document.querySelector('#input-password');
        this.elements.inputIsActive = document.querySelector('#input-is-active');
        this.elements.passwordRequired = document.querySelector('#password-required');
        this.elements.passwordHint = document.querySelector('#password-hint');
        this.elements.btnSave = document.querySelector('#btn-save');
        this.elements.btnCancel = document.querySelector('#btn-cancel');

        // 删除弹窗
        this.elements.deleteModal = document.querySelector('#delete-modal');
        this.elements.btnCancelDelete = document.querySelector('#btn-cancel-delete');
        this.elements.btnConfirmDelete = document.querySelector('#btn-confirm-delete');

        // 重置密码弹窗
        this.elements.resetPasswordModal = document.querySelector('#reset-password-modal');
        this.elements.inputNewPassword = document.querySelector('#input-new-password');
        this.elements.btnCancelReset = document.querySelector('#btn-cancel-reset');
        this.elements.btnConfirmReset = document.querySelector('#btn-confirm-reset');
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 搜索
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => {
                this.filterUsers();
            });
        }

        // 权限筛选
        if (this.elements.filterLevel) {
            this.elements.filterLevel.addEventListener('change', () => {
                this.filterUsers();
            });
        }

        // 状态筛选
        if (this.elements.filterStatus) {
            this.elements.filterStatus.addEventListener('change', () => {
                this.filterUsers();
            });
        }

        // 新增按钮
        if (this.elements.btnAdd) {
            this.elements.btnAdd.addEventListener('click', () => {
                this.openModal();
            });
        }

        // 保存按钮
        if (this.elements.btnSave) {
            this.elements.btnSave.addEventListener('click', () => {
                this.saveUser();
            });
        }

        // 取消按钮
        if (this.elements.btnCancel) {
            this.elements.btnCancel.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // 权限级别变化
        if (this.elements.inputPermissionLevel) {
            this.elements.inputPermissionLevel.addEventListener('change', () => {
                this.onPermissionLevelChange();
            });
        }

        // 单位级联选择
        if (this.elements.inputUnitLevel1) {
            this.elements.inputUnitLevel1.addEventListener('change', () => {
                this.onUnitLevel1Change();
            });
        }

        if (this.elements.inputUnitLevel2) {
            this.elements.inputUnitLevel2.addEventListener('change', () => {
                this.onUnitLevel2Change();
            });
        }

        // 取消删除
        if (this.elements.btnCancelDelete) {
            this.elements.btnCancelDelete.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        // 确认删除
        if (this.elements.btnConfirmDelete) {
            this.elements.btnConfirmDelete.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

        // 取消重置密码
        if (this.elements.btnCancelReset) {
            this.elements.btnCancelReset.addEventListener('click', () => {
                this.closeResetPasswordModal();
            });
        }

        // 确认重置密码
        if (this.elements.btnConfirmReset) {
            this.elements.btnConfirmReset.addEventListener('click', () => {
                this.confirmResetPassword();
            });
        }

        // 点击弹窗外部关闭
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.closeModal();
                }
            });
        }

        if (this.elements.deleteModal) {
            this.elements.deleteModal.addEventListener('click', (e) => {
                if (e.target === this.elements.deleteModal) {
                    this.closeDeleteModal();
                }
            });
        }

        if (this.elements.resetPasswordModal) {
            this.elements.resetPasswordModal.addEventListener('click', (e) => {
                if (e.target === this.elements.resetPasswordModal) {
                    this.closeResetPasswordModal();
                }
            });
        }

        // 每页数量选择
        if (this.elements.pageSizeSelect) {
            this.elements.pageSizeSelect.addEventListener('change', () => {
                this.onPageSizeChange();
            });
        }
    }

    /**
     * 加载单位列表
     */
    async loadUnits() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_units',
                    args: {}
                })
            });
            const result = await response.json();

            if (result.success) {
                this.units = result.data || [];
                console.log('[UsersController] 单位数量:', this.units.length);
            } else {
                console.error('[UsersController] 加载单位列表失败:', result.error);
            }
        } catch (error) {
            console.error('[UsersController] 加载单位列表出错:', error);
        }
    }

    /**
     * 加载用户数据
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    async loadUsers(skipAnimation = false) {
        try {
            // 根据当前用户权限构建请求参数
            const args = {
                limit: this.pageSize,
                page: this.currentPage
            };
            if (this.currentUser) {
                if (this.currentUser.permission_level === '区县局') {
                    // 区县局只能查看本单位用户
                    args.unit_name = this.currentUser.unit_name;
                }
                // 市局可以查看所有用户，不需要额外参数
            }

            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_user_list',
                    args: args
                })
            });

            const data = await response.json();

            if (data.success) {
                this.users = data.data || [];
                this.filteredUsers = [...this.users];
                this.totalCount = data.total || 0;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
                this.renderTable(skipAnimation);
                this.renderPagination();
                this.needRefresh = false;  // 数据已刷新
            } else {
                console.error('[UsersController] 加载用户列表失败:', data.error);
            }
        } catch (error) {
            console.error('[UsersController] 加载用户列表出错:', error);
        }
    }

    /**
     * 筛选用户
     */
    filterUsers() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const levelFilter = this.elements.filterLevel.value;
        const statusFilter = this.elements.filterStatus.value;

        this.filteredUsers = this.users.filter(user => {
            const matchSearch = !searchTerm ||
                user.name.toLowerCase().includes(searchTerm) ||
                user.police_number.toLowerCase().includes(searchTerm) ||
                (user.phone && user.phone.includes(searchTerm));

            const matchLevel = !levelFilter || user.permission_level === levelFilter;
            const matchStatus = statusFilter === '' || user.is_active === parseInt(statusFilter);

            return matchSearch && matchLevel && matchStatus;
        });

        this.renderTable();
    }

    /**
     * 渲染表格
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    renderTable(skipAnimation = false) {
        if (this.filteredUsers.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-users text-4xl mb-3"></i>
                        <p>暂无用户数据</p>
                    </td>
                </tr>
            `;
            this.elements.paginationInfo.textContent = '共 0 条记录';
            return;
        }

        this.elements.tableBody.innerHTML = this.filteredUsers.map(user => {
            const statusBadge = user.is_active
                ? '<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">已激活</span>'
                : '<span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">已禁用</span>';

            // 权限级别映射
            const permissionMap = {
                'CITY': '市局',
                'DISTRICT': '区县局/支队',
                'OFFICER': '民警'
            };
            const permissionName = permissionMap[user.permission_level] || user.permission_level;

            const permissionClass = {
                'CITY': 'bg-purple-100 text-purple-700',
                'DISTRICT': 'bg-blue-100 text-blue-700',
                'OFFICER': 'bg-gray-100 text-gray-700'
            }[user.permission_level] || 'bg-gray-100 text-gray-700';

            return `
                <tr class="hover:bg-gray-50 transition" style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td class="px-6 py-4 text-sm text-gray-800 font-medium">${user.police_number}</td>
                    <td class="px-6 py-4 text-sm text-gray-800">${user.name}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${user.nickname || '-'}</td>
                    <td class="px-6 py-4 text-sm">
                        <span class="px-2 py-1 rounded-lg text-xs font-medium ${permissionClass}">${permissionName}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-600">${this.getUnitFullName(user.unit_name)}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${user.phone || '-'}</td>
                    <td class="px-6 py-4 text-center">${statusBadge}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-blue-600 hover:text-blue-800 mx-1" onclick="window.workplaceController.controllers.users.editUser(${user.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-amber-600 hover:text-amber-800 mx-1" onclick="window.workplaceController.controllers.users.resetPassword(${user.id})" title="重置密码">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-800 mx-1" onclick="window.workplaceController.controllers.users.deleteUser(${user.id})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.elements.paginationInfo.textContent = `共 ${this.filteredUsers.length} 条记录`;

        // 执行表格行动画（同时从左向右划入）
        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    /**
     * 动画化表格行（同时从左向右划入）
     */
    animateTableRows() {
        const rows = this.container.querySelectorAll('#users-table-body tr');
        if (rows.length > 0) {
            // 确保行元素初始状态正确
            rows.forEach(row => {
                row.style.opacity = '0';
                row.style.transform = 'translateX(-30px)';
            });

            anime({
                targets: rows,
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 500,
                easing: 'easeOutQuad'
            });
        }
    }

    /**
     * 获取单位全称
     * @param {string} unitName - 单位全称（来自 user.unit_name）
     * @returns {string} 单位全称
     */
    getUnitFullName(unitName) {
        return unitName || '-';
    }

    /**
     * 渲染分页控件
     */
    renderPagination() {
        const paginationInfo = this.elements.paginationInfo;
        const paginationControls = this.elements.paginationControls;

        if (paginationInfo) {
            paginationInfo.textContent = `共 ${this.totalCount} 条记录，第 ${this.currentPage}/${this.totalPages} 页`;
        }

        if (paginationControls) {
            let html = '';

            // 上一页按钮
            html += `
                <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                        onclick="window.workplaceController.controllers.users.goToPrevPage()" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                    上一页
                </button>
            `;

            // 页码按钮
            const maxButtons = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            if (startPage > 1) {
                html += `<button class="page-number" onclick="window.workplaceController.controllers.users.goToPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                            onclick="window.workplaceController.controllers.users.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }

            if (endPage < this.totalPages) {
                if (endPage < this.totalPages - 1) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
                html += `<button class="page-number" onclick="window.workplaceController.controllers.users.goToPage(${this.totalPages})">${this.totalPages}</button>`;
            }

            // 下一页按钮
            html += `
                <button class="page-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                        onclick="window.workplaceController.controllers.users.goToNextPage()" 
                        ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    下一页
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;

            paginationControls.innerHTML = html;
        }
    }

    /**
     * 跳转到指定页
     * @param {number} pageNum - 页码
     */
    async goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) {
            return;
        }
        this.currentPage = pageNum;
        await this.loadUsers();
    }

    /**
     * 跳转到上一页
     */
    async goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadUsers();
        }
    }

    /**
     * 跳转到下一页
     */
    async goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadUsers();
        }
    }

    /**
     * 每页数量改变
     */
    async onPageSizeChange() {
        const select = this.elements.pageSizeSelect;
        if (select) {
            this.pageSize = parseInt(select.value);
            this.currentPage = 1;
            await this.loadUsers();
        }
    }

    /**
     * 权限级别变化处理
     */
    onPermissionLevelChange() {
        const level = this.elements.inputPermissionLevel.value;
        const level2Select = this.elements.inputUnitLevel2;
        const level3Select = this.elements.inputUnitLevel3;

        // 重置单位选择
        level2Select.innerHTML = '<option value="">选择区县局</option>';
        level3Select.innerHTML = '<option value="">选择科室所队</option>';
        level2Select.disabled = true;
        level3Select.disabled = true;

        if (level === '市局') {
            // 市局用户不需要选择单位，自动填充
            this.elements.inputUnitLevel1.value = '济南市公安局';
        } else if (level === '区县局') {
            // 区县局用户只需要选择区县
            level2Select.disabled = false;
            this.populateLevel2Options();
        } else if (level === '民警') {
            // 民警需要完整选择
            level2Select.disabled = false;
            this.populateLevel2Options();
        }
    }

    /**
     * 单位一级选择变化
     */
    onUnitLevel1Change() {
        const level1 = this.elements.inputUnitLevel1.value;
        const level2Select = this.elements.inputUnitLevel2;
        const level3Select = this.elements.inputUnitLevel3;

        level2Select.innerHTML = '<option value="">选择区县局</option>';
        level3Select.innerHTML = '<option value="">选择科室所队</option>';
        level3Select.disabled = true;

        if (!level1) {
            level2Select.disabled = true;
            return;
        }

        level2Select.disabled = false;
        this.populateLevel2Options();
    }

    /**
     * 单位二级选择变化
     */
    onUnitLevel2Change() {
        const level1 = this.elements.inputUnitLevel1.value;
        const level2 = this.elements.inputUnitLevel2.value;
        const level3Select = this.elements.inputUnitLevel3;

        level3Select.innerHTML = '<option value="">选择科室所队</option>';

        if (!level2) {
            level3Select.disabled = true;
            return;
        }

        level3Select.disabled = false;
        this.populateLevel3Options(level1, level2);
    }

    /**
     * 填充二级单位选项
     */
    populateLevel2Options() {
        const level1 = this.elements.inputUnitLevel1.value;
        const level2Select = this.elements.inputUnitLevel2;

        const level2Units = [...new Set(
            this.units
                .filter(u => u["一级"] === level1 && u["二级"])
                .map(u => u["二级"])
        )];

        level2Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            level2Select.appendChild(option);
        });
    }

    /**
     * 填充三级单位选项
     */
    populateLevel3Options(level1, level2) {
        const level3Select = this.elements.inputUnitLevel3;

        const level3Units = [...new Set(
            this.units
                .filter(u => u["一级"] === level1 && u["二级"] === level2 && u["三级"])
                .map(u => u["三级"])
        )];

        level3Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            level3Select.appendChild(option);
        });
    }

    /**
     * 打开新增/编辑弹窗
     */
    openModal(user = null) {
        // 填充一级单位
        const level1Select = this.elements.inputUnitLevel1;
        level1Select.innerHTML = '<option value="">选择市局</option>';
        const level1Units = [...new Set(this.units.map(u => u["一级"]).filter(Boolean))];
        level1Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            level1Select.appendChild(option);
        });

        if (user) {
            this.elements.modalTitle.textContent = '编辑用户';
            this.elements.userId.value = user.id;
            this.elements.inputPoliceNumber.value = user.police_number;
            this.elements.inputName.value = user.name;
            this.elements.inputNickname.value = user.nickname || '';
            this.elements.inputPhone.value = user.phone || '';
            // 权限级别映射：将代码转换为前端显示值
            const permissionMap = {
                'CITY': '市局',
                'DISTRICT': '区县局/支队',
                'OFFICER': '民警',
                '市局': '市局',
                '区县局': '区县局/支队',  // 处理数据库中可能的中文格式
                '区县局/支队': '区县局/支队',
                '民警': '民警'
            };
            
            console.log('权限映射调试 (旧版本):');
            console.log('  user.permission_level:', user.permission_level);
            console.log('  permissionMap:', permissionMap);
            console.log('  映射结果:', permissionMap[user.permission_level] || user.permission_level);
            
            const permissionValue = permissionMap[user.permission_level] || user.permission_level;
            this.elements.inputPermissionLevel.value = permissionValue;
            console.log('  设置后的inputPermissionLevel.value:', this.elements.inputPermissionLevel.value);
            
            // 调试：检查选择框的当前状态
            console.log('  选择框调试 (旧版本):');
            console.log('    所有选项:', Array.from(this.elements.inputPermissionLevel.options).map(opt => ({value: opt.value, text: opt.text, selected: opt.selected})));
            console.log('    当前选中的选项:', this.elements.inputPermissionLevel.options[this.elements.inputPermissionLevel.selectedIndex]);
            this.elements.inputIsActive.checked = user.is_active;

            // 编辑时密码非必填
            this.elements.passwordRequired.style.display = 'none';
            this.elements.passwordHint.style.display = 'block';
            this.elements.inputPassword.value = '';
            this.elements.inputPassword.placeholder = '留空表示不修改密码';

            // 设置单位
            this.setUnitSelection(user.unit_name);
        } else {
            this.elements.modalTitle.textContent = '新增用户';
            this.elements.userId.value = '';
            this.elements.inputPoliceNumber.value = '';
            this.elements.inputName.value = '';
            this.elements.inputNickname.value = '';
            this.elements.inputPhone.value = '';
            this.elements.inputPermissionLevel.value = '';
            this.elements.inputIsActive.checked = true;

            // 新增时密码必填
            this.elements.passwordRequired.style.display = 'inline';
            this.elements.passwordHint.style.display = 'none';
            this.elements.inputPassword.value = '';
            this.elements.inputPassword.placeholder = '请输入密码';

            // 重置单位选择
            this.elements.inputUnitLevel2.innerHTML = '<option value="">选择区县局</option>';
            this.elements.inputUnitLevel3.innerHTML = '<option value="">选择科室所队</option>';
            this.elements.inputUnitLevel2.disabled = true;
            this.elements.inputUnitLevel3.disabled = true;
        }

        this.elements.modal.classList.remove('hidden');
        this.elements.modal.classList.add('flex');

        anime({
            targets: '#user-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            translateY: [20, 0],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 设置单位选择
     * @param {string} unitFullName - 单位全称
     */
    setUnitSelection(unitFullName) {
        if (!unitFullName) return;

        // 根据单位全称查找单位信息
        const unit = this.units.find(u => {
            const parts = [];
            if (u['一级']) parts.push(u['一级']);
            if (u['二级']) parts.push(u['二级']);
            if (u['三级']) parts.push(u['三级']);
            const fullName = parts.join(' / ');
            return fullName === unitFullName;
        });

        if (!unit) return;

        this.elements.inputUnitLevel1.value = unit['一级'] || '';

        if (unit['二级']) {
            this.populateLevel2Options();
            this.elements.inputUnitLevel2.value = unit['二级'];
            this.elements.inputUnitLevel2.disabled = false;

            if (unit['三级']) {
                this.populateLevel3Options(unit['一级'], unit['二级']);
                this.elements.inputUnitLevel3.value = unit['三级'];
                this.elements.inputUnitLevel3.disabled = false;
            } else {
                this.elements.inputUnitLevel3.innerHTML = '<option value="">选择科室所队</option>';
                this.elements.inputUnitLevel3.disabled = true;
            }
        } else {
            this.elements.inputUnitLevel2.innerHTML = '<option value="">选择区县局</option>';
            this.elements.inputUnitLevel2.disabled = true;
            this.elements.inputUnitLevel3.innerHTML = '<option value="">选择科室所队</option>';
            this.elements.inputUnitLevel3.disabled = true;
        }
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.elements.modal.classList.remove('flex');
    }

    /**
     * 编辑用户
     */
    editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (user) {
            this.openModal(user);
        }
    }

    /**
     * 保存用户
     */
    async saveUser() {
        const id = this.elements.userId.value;
        const policeNumber = this.elements.inputPoliceNumber.value.trim();
        const name = this.elements.inputName.value.trim();
        const nickname = this.elements.inputNickname.value.trim();
        const phone = this.elements.inputPhone.value.trim();
        const permissionLevel = this.elements.inputPermissionLevel.value;
        const password = this.elements.inputPassword.value;
        const isActive = this.elements.inputIsActive.checked ? 1 : 0;

        // 验证必填字段
        if (!policeNumber || !name || !permissionLevel) {
            alert('请填写必填字段');
            return;
        }

        // 新增时密码必填
        if (!id && !password) {
            alert('请输入密码');
            return;
        }

        // 获取单位全称
        let unitFullName = '';
        const level1 = this.elements.inputUnitLevel1.value;
        const level2 = this.elements.inputUnitLevel2.value;
        const level3 = this.elements.inputUnitLevel3.value;

        if (permissionLevel === '市局') {
            // 市局用户
            unitFullName = level1;
        } else if (permissionLevel === '区县局') {
            // 区县局用户
            if (!level2) {
                alert('请选择区县局');
                return;
            }
            unitFullName = `${level1} / ${level2}`;
        } else if (permissionLevel === '民警') {
            // 民警
            if (!level2) {
                alert('请选择区县局');
                return;
            }
            if (!level3) {
                alert('请选择科室所队');
                return;
            }
            unitFullName = `${level1} / ${level2} / ${level3}`;
        }

        // 权限检查
        if (this.currentUser.permission_level === '区县局') {
            // 区县局只能创建本单位及下属单位的用户
            // 根据当前用户单位全称查找单位信息
            const currentUnitParts = this.currentUser.unit_name.split(' / ');
            const targetUnitParts = unitFullName.split(' / ');

            // 检查目标单位是否在当前单位范围内
            if (targetUnitParts[0] !== currentUnitParts[0] ||
                (targetUnitParts[1] && targetUnitParts[1] !== currentUnitParts[1])) {
                alert('您只能管理本单位及下属单位的用户');
                return;
            }

            // 区县局不能创建市局用户
            if (permissionLevel === '市局') {
                alert('您没有权限创建市局用户');
                return;
            }
        }

        try {
            const order = id ? 'update_user' : 'create_user';
            const args = {
                police_number: policeNumber,
                name: name,
                nickname: nickname,
                phone: phone,
                permission_level: permissionLevel,
                unit_name: unitFullName,
                is_active: isActive
            };

            if (id) {
                args.id = parseInt(id);
            }

            if (password) {
                args.password = password;
            }

            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order, args })
            });

            const data = await response.json();

            if (data.success) {
                this.closeModal();
                await this.loadUsers();
                alert(id ? '用户更新成功' : '用户创建成功');
            } else {
                alert('保存失败: ' + data.error);
            }
        } catch (error) {
            console.error('[UsersController] 保存用户出错:', error);
            alert('保存用户出错');
        }
    }

    /**
     * 删除用户
     */
    deleteUser(id) {
        this.deleteId = id;
        this.elements.deleteModal.classList.remove('hidden');
        this.elements.deleteModal.classList.add('flex');

        anime({
            targets: '#delete-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 关闭删除弹窗
     */
    closeDeleteModal() {
        this.deleteId = null;
        this.elements.deleteModal.classList.add('hidden');
        this.elements.deleteModal.classList.remove('flex');
    }

    /**
     * 确认删除
     */
    async confirmDelete() {
        if (!this.deleteId) return;

        // 权限检查
        const user = this.users.find(u => u.id === this.deleteId);
        if (user && this.currentUser.permission_level === '区县局') {
            // 根据当前用户单位全称查找单位信息
            const currentUnit = this.units.find(u => {
                const parts = [];
                if (u['一级']) parts.push(u['一级']);
                if (u['二级']) parts.push(u['二级']);
                if (u['三级']) parts.push(u['三级']);
                return parts.join(' / ') === this.currentUser.unit_name;
            });
            // 根据目标用户单位全称查找单位信息
            const targetUnit = this.units.find(u => {
                const parts = [];
                if (u['一级']) parts.push(u['一级']);
                if (u['二级']) parts.push(u['二级']);
                if (u['三级']) parts.push(u['三级']);
                return parts.join(' / ') === user.unit_name;
            });

            if (currentUnit && targetUnit) {
                if (targetUnit['一级'] !== currentUnit['一级'] ||
                    (targetUnit['二级'] && targetUnit['二级'] !== currentUnit['二级'])) {
                    alert('您没有权限删除该用户');
                    this.closeDeleteModal();
                    return;
                }
            }
        }

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'delete_user',
                    args: { id: this.deleteId }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeDeleteModal();
                await this.loadUsers();
                alert('用户删除成功');
            } else {
                alert('删除失败: ' + data.error);
            }
        } catch (error) {
            console.error('[UsersController] 删除用户出错:', error);
            alert('删除用户出错');
        }
    }

    /**
     * 重置密码
     */
    resetPassword(id) {
        this.resetPasswordId = id;
        this.elements.inputNewPassword.value = '';
        this.elements.resetPasswordModal.classList.remove('hidden');
        this.elements.resetPasswordModal.classList.add('flex');

        anime({
            targets: '#reset-password-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 关闭重置密码弹窗
     */
    closeResetPasswordModal() {
        this.resetPasswordId = null;
        this.elements.resetPasswordModal.classList.add('hidden');
        this.elements.resetPasswordModal.classList.remove('flex');
    }

    /**
     * 确认重置密码
     */
    async confirmResetPassword() {
        if (!this.resetPasswordId) return;

        const newPassword = this.elements.inputNewPassword.value.trim();
        if (!newPassword) {
            alert('请输入新密码');
            return;
        }

        // 权限检查
        const user = this.users.find(u => u.id === this.resetPasswordId);
        if (user && this.currentUser.permission_level === '区县局') {
            // 根据当前用户单位全称查找单位信息
            const currentUnit = this.units.find(u => {
                const parts = [];
                if (u['一级']) parts.push(u['一级']);
                if (u['二级']) parts.push(u['二级']);
                if (u['三级']) parts.push(u['三级']);
                return parts.join(' / ') === this.currentUser.unit_name;
            });
            // 根据目标用户单位全称查找单位信息
            const targetUnit = this.units.find(u => {
                const parts = [];
                if (u['一级']) parts.push(u['一级']);
                if (u['二级']) parts.push(u['二级']);
                if (u['三级']) parts.push(u['三级']);
                return parts.join(' / ') === user.unit_name;
            });

            if (currentUnit && targetUnit) {
                if (targetUnit['一级'] !== currentUnit['一级'] ||
                    (targetUnit['二级'] && targetUnit['二级'] !== currentUnit['二级'])) {
                    alert('您没有权限重置该用户密码');
                    this.closeResetPasswordModal();
                    return;
                }
            }
        }

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'reset_password',
                    args: {
                        id: this.resetPasswordId,
                        password: newPassword
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeResetPasswordModal();
                alert('密码重置成功');
            } else {
                alert('重置失败: ' + data.error);
            }
        } catch (error) {
            console.error('[UsersController] 重置密码出错:', error);
            alert('重置密码出错');
        }
    }
}

// 导出控制器类到全局
window.UsersController = UsersController;
