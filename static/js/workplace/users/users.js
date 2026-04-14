/**
 * 用户管理页面控制器
 *
 * 负责用户列表的显示、搜索、筛选、分页以及增删改查交互
 * 使用通用动画库 WpAnimation 实现动画效果
 */

class UsersController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;

        this.currentUser = null;
        this.users = [];
        this.filteredUsers = [];
        this.units = [];

        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;

        this.deleteId = null;
        this.resetPasswordId = null;

        this.elements = {};
    }

    /**
     * 初始化页面
     */
    async init(container) {
        this.container = container;
        console.log('[UsersController] 初始化用户管理页面');

        // 生成HTML结构
        this.container.innerHTML = UsersHtml.generateHTML();

        // 隐藏元素准备入场动画
        this.hideAllElements();

        // 获取DOM引用
        this.getElements();

        // 绑定事件
        this.bindEvents();

        // 加载必要数据
        this.currentUser = await UsersTools.loadCurrentUser();
        this.units = await UsersTools.loadUnits();

        this.updateSubtitle();

        this.isInitialized = true;
        console.log('[UsersController] 用户管理页面初始化完成');
    }

    /**
     * 更新副标题
     */
    updateSubtitle() {
        const subtitle = this.elements.subtitle;
        if (subtitle && this.currentUser) {
            if (this.currentUser.permission_level === '市局') {
                subtitle.textContent = '管理所有用户账号';
            } else if (this.currentUser.permission_level === '区县局') {
                subtitle.textContent = '管理本单位用户账号';
            }
        }
    }

    /**
     * 隐藏所有元素
     */
    hideAllElements() {
        const selectors = [
            '#users-header',
            '#users-filter-panel',
            '#users-table-body tr',
            '#users-pagination'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });
    }

    /**
     * 显示页面
     */
    async show() {
        console.log('[UsersController] 页面显示');
        this.ensureElementsVisible();

        if (!this.animationPlayed) {
            await this.loadUsers(true);
            await this.playEntranceAnimation();
            this.animationPlayed = true;
        } else {
            await this.loadUsers(false);
        }
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[UsersController] 页面隐藏');
        this.closeModal();
        this.closeDeleteModal();
        this.closeResetPasswordModal();
    }

    /**
     * 确保所有元素可见
     */
    ensureElementsVisible() {
        const selectors = [
            '#users-header',
            '#users-filter-panel',
            '#users-table-body tr',
            '#users-pagination'
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
     * 播放入场动画
     */
    async playEntranceAnimation() {
        const header = this.container.querySelector('#users-header');
        const filterPanel = this.container.querySelector('#users-filter-panel');
        const tableRows = this.container.querySelectorAll('#users-table-body tr');
        const pagination = this.container.querySelector('#users-pagination');

        if (header) header.style.opacity = '0';
        if (filterPanel) filterPanel.style.opacity = '0';
        if (pagination) pagination.style.opacity = '0';
        tableRows.forEach(row => row.style.opacity = '0');

        if (header) {
            await WpAnimation.moveAndFadeIn(header, 'down', 30, 800, 0);
        }

        if (filterPanel) {
            await WpAnimation.moveAndFadeIn(filterPanel, 'down', 20, 600, 0);
        }

        if (pagination) {
            await WpAnimation.moveAndFadeIn(pagination, 'down', 15, 500, 0);
        }

        if (tableRows.length > 0) {
            await WpAnimation.moveAndFadeIn(tableRows, 'left', 30, 500, 50);
        }
    }

    /**
     * 动画化表格行
     */
    async animateTableRows() {
        const rows = this.container.querySelectorAll('#users-table-body tr');
        if (rows.length > 0) {
            rows.forEach(row => row.style.opacity = '0');
            await WpAnimation.moveAndFadeIn(rows, 'left', 30, 500, 50);
        }
    }

    /**
     * 获取DOM元素引用
     */
    getElements() {
        this.elements = {
            subtitle: this.container.querySelector('#users-subtitle'),
            searchInput: this.container.querySelector('#search-input'),
            filterLevel: this.container.querySelector('#filter-level'),
            filterStatus: this.container.querySelector('#filter-status'),
            tableBody: this.container.querySelector('#users-table-body'),
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),
            btnAdd: this.container.querySelector('#btn-add-user'),

            // 新增/编辑弹窗
            modal: this.container.querySelector('#user-modal'),
            modalTitle: this.container.querySelector('#modal-title'),
            userId: this.container.querySelector('#user-id'),
            inputPoliceNumber: this.container.querySelector('#input-police-number'),
            inputName: this.container.querySelector('#input-name'),
            inputNickname: this.container.querySelector('#input-nickname'),
            inputPhone: this.container.querySelector('#input-phone'),
            inputPermissionLevel: this.container.querySelector('#input-permission-level'),
            inputUnitLevel1: this.container.querySelector('#input-unit-level1'),
            inputUnitLevel2: this.container.querySelector('#input-unit-level2'),
            inputUnitLevel3: this.container.querySelector('#input-unit-level3'),
            inputPassword: this.container.querySelector('#input-password'),
            inputIsActive: this.container.querySelector('#input-is-active'),
            passwordRequired: this.container.querySelector('#password-required'),
            passwordHint: this.container.querySelector('#password-hint'),
            btnSave: this.container.querySelector('#btn-save'),
            btnCancel: this.container.querySelector('#btn-cancel'),
            btnCancelIcon: this.container.querySelector('#btn-cancel-icon'),

            // 删除确认弹窗
            deleteModal: this.container.querySelector('#delete-modal'),
            btnCancelDelete: this.container.querySelector('#btn-cancel-delete'),
            btnConfirmDelete: this.container.querySelector('#btn-confirm-delete'),

            // 重置密码弹窗
            resetPasswordModal: this.container.querySelector('#reset-password-modal'),
            inputNewPassword: this.container.querySelector('#input-new-password'),
            btnCancelReset: this.container.querySelector('#btn-cancel-reset'),
            btnConfirmReset: this.container.querySelector('#btn-confirm-reset')
        };
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => this.filterUsers());
        }

        if (this.elements.filterLevel) {
            this.elements.filterLevel.addEventListener('change', () => this.filterUsers());
        }

        if (this.elements.filterStatus) {
            this.elements.filterStatus.addEventListener('change', () => this.filterUsers());
        }

        if (this.elements.btnAdd) {
            this.elements.btnAdd.addEventListener('click', () => this.openModal());
        }

        if (this.elements.btnSave) {
            this.elements.btnSave.addEventListener('click', () => this.saveUser());
        }

        if (this.elements.btnCancel) {
            this.elements.btnCancel.addEventListener('click', () => this.closeModal());
        }
        
        if (this.elements.btnCancelIcon) {
            this.elements.btnCancelIcon.addEventListener('click', () => this.closeModal());
        }

        if (this.elements.inputPermissionLevel) {
            this.elements.inputPermissionLevel.addEventListener('change', () => this.onPermissionLevelChange());
        }

        if (this.elements.inputUnitLevel1) {
            this.elements.inputUnitLevel1.addEventListener('change', () => this.onUnitLevel1Change());
        }

        if (this.elements.inputUnitLevel2) {
            this.elements.inputUnitLevel2.addEventListener('change', () => this.onUnitLevel2Change());
        }

        if (this.elements.btnCancelDelete) {
            this.elements.btnCancelDelete.addEventListener('click', () => this.closeDeleteModal());
        }

        if (this.elements.btnConfirmDelete) {
            this.elements.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());
        }

        if (this.elements.btnCancelReset) {
            this.elements.btnCancelReset.addEventListener('click', () => this.closeResetPasswordModal());
        }

        if (this.elements.btnConfirmReset) {
            this.elements.btnConfirmReset.addEventListener('click', () => this.confirmResetPassword());
        }
        
        // 点击弹窗外部关闭
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) this.closeModal();
            });
        }

        if (this.elements.deleteModal) {
            this.elements.deleteModal.addEventListener('click', (e) => {
                if (e.target === this.elements.deleteModal) this.closeDeleteModal();
            });
        }

        if (this.elements.resetPasswordModal) {
            this.elements.resetPasswordModal.addEventListener('click', (e) => {
                if (e.target === this.elements.resetPasswordModal) this.closeResetPasswordModal();
            });
        }
    }

    /**
     * 加载用户列表
     * @param {boolean} skipAnimation 是否跳过列表动画
     */
    async loadUsers(skipAnimation = false) {
        const args = {
            limit: this.pageSize,
            page: this.currentPage
        };
        
        if (this.currentUser && this.currentUser.permission_level === '区县局') {
            args.unit_name = this.currentUser.unit_name;
        }

        const data = await UsersTools.loadUsers(args);
        this.users = data.users;
        this.totalCount = data.total;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.filteredUsers = [...this.users];

        this.renderTable(skipAnimation);
        this.renderPagination();
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

        this.renderTable(false);
    }

    /**
     * 渲染表格
     */
    renderTable(skipAnimation = false) {
        if (this.filteredUsers.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-users text-4xl mb-3 text-gray-300"></i>
                            <p>暂无用户数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.elements.paginationInfo.textContent = '共 0 条记录';
            return;
        }

        const permissionMap = {
            'CITY': '市局',
            'DISTRICT': '区县局/支队',
            'OFFICER': '民警'
        };

        const permissionClassMap = {
            'CITY': 'bg-purple-100 text-purple-700',
            'DISTRICT': 'bg-blue-100 text-blue-700',
            'OFFICER': 'bg-gray-100 text-gray-700'
        };

        this.elements.tableBody.innerHTML = this.filteredUsers.map(user => {
            const statusBadge = user.is_active
                ? '<span class="wp-badge success">已激活</span>'
                : '<span class="wp-badge info">已禁用</span>';

            const permissionName = permissionMap[user.permission_level] || user.permission_level;
            const permissionClass = permissionClassMap[user.permission_level] || 'bg-gray-100 text-gray-700';

            return `
                <tr style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td>${user.police_number}</td>
                    <td><span class="font-medium text-gray-800">${user.name}</span></td>
                    <td>${user.nickname || '-'}</td>
                    <td><span class="px-2 py-1 rounded-lg text-xs font-medium ${permissionClass}">${permissionName}</span></td>
                    <td class="truncate max-w-[200px]" title="${user.unit_name || '-'}">${user.unit_name || '-'}</td>
                    <td>${user.phone || '-'}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">
                        <button class="wp-icon-btn text-blue-500 hover:bg-blue-50" onclick="window.workplace.controllers.users.editUser(${user.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="wp-icon-btn text-amber-500 hover:bg-amber-50" onclick="window.workplace.controllers.users.resetPassword(${user.id})" title="重置密码">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="wp-icon-btn text-red-500 hover:bg-red-50" onclick="window.workplace.controllers.users.deleteUser(${user.id})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.elements.paginationInfo.textContent = `共 ${this.filteredUsers.length} 条记录`;

        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        const info = this.elements.paginationInfo;
        const controls = this.elements.paginationControls;

        if (info) {
            info.textContent = `共 ${this.totalCount} 条记录，第 ${this.currentPage}/${this.totalPages} 页`;
        }

        if (controls) {
            let html = '';
            
            // 上一页
            const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
            html += `
                <button class="wp-page-btn" ${prevDisabled} onclick="window.workplace.controllers.users.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;

            // 页码
            const maxButtons = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }

            if (startPage > 1) {
                html += `<button class="wp-page-btn" onclick="window.workplace.controllers.users.goToPage(1)">1</button>`;
                if (startPage > 2) html += `<span class="wp-page-ellipsis">...</span>`;
            }

            for (let i = startPage; i <= endPage; i++) {
                const activeClass = i === this.currentPage ? 'active' : '';
                html += `<button class="wp-page-btn ${activeClass}" onclick="window.workplace.controllers.users.goToPage(${i})">${i}</button>`;
            }

            if (endPage < this.totalPages) {
                if (endPage < this.totalPages - 1) html += `<span class="wp-page-ellipsis">...</span>`;
                html += `<button class="wp-page-btn" onclick="window.workplace.controllers.users.goToPage(${this.totalPages})">${this.totalPages}</button>`;
            }

            // 下一页
            const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
            html += `
                <button class="wp-page-btn" ${nextDisabled} onclick="window.workplace.controllers.users.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;

            controls.innerHTML = html;
        }
    }

    async goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
        this.currentPage = pageNum;
        await this.loadUsers();
    }

    async onPageSizeChange() {
        if (this.elements.pageSizeSelect) {
            this.pageSize = parseInt(this.elements.pageSizeSelect.value);
            this.currentPage = 1;
            await this.loadUsers();
        }
    }

    onPermissionLevelChange() {
        const level = this.elements.inputPermissionLevel.value;
        const level2Select = this.elements.inputUnitLevel2;
        const level3Select = this.elements.inputUnitLevel3;

        level2Select.innerHTML = '<option value="">选择区县局</option>';
        level3Select.innerHTML = '<option value="">选择科室所队</option>';
        level2Select.disabled = true;
        level3Select.disabled = true;

        if (level === '市局') {
            this.elements.inputUnitLevel1.value = '济南市公安局';
        } else if (level === '区县局' || level === '民警') {
            level2Select.disabled = false;
            this.populateLevel2Options();
        }
    }

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

    populateLevel2Options() {
        const level1 = this.elements.inputUnitLevel1.value;
        const level2Select = this.elements.inputUnitLevel2;

        const level2Units = [...new Set(
            this.units.filter(u => u.level1 === level1 && u.level2).map(u => u.level2)
        )];

        level2Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            level2Select.appendChild(option);
        });
    }

    populateLevel3Options(level1, level2) {
        const level3Select = this.elements.inputUnitLevel3;

        const level3Units = [...new Set(
            this.units.filter(u => u.level1 === level1 && u.level2 === level2 && u.level3).map(u => u.level3)
        )];

        level3Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            level3Select.appendChild(option);
        });
    }

    openModal(user = null) {
        const level1Select = this.elements.inputUnitLevel1;
        level1Select.innerHTML = '<option value="">选择市局</option>';
        const level1Units = [...new Set(this.units.map(u => u.level1).filter(Boolean))];
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
            this.elements.inputPermissionLevel.value = user.permission_level;
            this.elements.inputIsActive.checked = user.is_active;

            this.elements.passwordRequired.style.display = 'none';
            this.elements.passwordHint.style.display = 'block';
            this.elements.inputPassword.value = '';
            this.elements.inputPassword.placeholder = '留空表示不修改密码';

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

            this.elements.passwordRequired.style.display = 'inline';
            this.elements.passwordHint.style.display = 'none';
            this.elements.inputPassword.value = '';
            this.elements.inputPassword.placeholder = '请输入密码';

            this.elements.inputUnitLevel2.innerHTML = '<option value="">选择区县局</option>';
            this.elements.inputUnitLevel3.innerHTML = '<option value="">选择科室所队</option>';
            this.elements.inputUnitLevel2.disabled = true;
            this.elements.inputUnitLevel3.disabled = true;
        }

        this.elements.modal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.modal.querySelector('.wp-modal-container'));
    }

    setUnitSelection(unitFullName) {
        if (!unitFullName) return;

        const unit = this.units.find(u => {
            const parts = [];
            if (u['一级']) parts.push(u['一级']);
            if (u['二级']) parts.push(u['二级']);
            if (u['三级']) parts.push(u['三级']);
            return parts.join(' / ') === unitFullName;
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

    closeModal() {
        if (!this.elements.modal.classList.contains('hidden')) {
            WpAnimation.popOut(this.elements.modal.querySelector('.wp-modal-container')).then(() => {
                this.elements.modal.classList.add('hidden');
            });
        }
    }

    editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (user) {
            this.openModal(user);
        }
    }

    async saveUser() {
        const id = this.elements.userId.value;
        const policeNumber = this.elements.inputPoliceNumber.value.trim();
        const name = this.elements.inputName.value.trim();
        const nickname = this.elements.inputNickname.value.trim();
        const phone = this.elements.inputPhone.value.trim();
        const permissionLevel = this.elements.inputPermissionLevel.value;
        const password = this.elements.inputPassword.value;
        const isActive = this.elements.inputIsActive.checked ? 1 : 0;

        if (!policeNumber || !name || !permissionLevel) {
            alert('请填写必填字段');
            return;
        }

        if (!id && !password) {
            alert('请输入密码');
            return;
        }

        let unitFullName = '';
        const level1 = this.elements.inputUnitLevel1.value;
        const level2 = this.elements.inputUnitLevel2.value;
        const level3 = this.elements.inputUnitLevel3.value;

        if (permissionLevel === '市局') {
            unitFullName = level1;
        } else if (permissionLevel === '区县局') {
            if (!level2) {
                alert('请选择区县局');
                return;
            }
            unitFullName = `${level1} / ${level2}`;
        } else if (permissionLevel === '民警') {
            if (!level2 || !level3) {
                alert('请选择区县局和科室所队');
                return;
            }
            unitFullName = `${level1} / ${level2} / ${level3}`;
        }

        if (this.currentUser.permission_level === '区县局') {
            const currentUnitParts = this.currentUser.unit_name.split(' / ');
            const targetUnitParts = unitFullName.split(' / ');

            if (targetUnitParts[0] !== currentUnitParts[0] ||
                (targetUnitParts[1] && targetUnitParts[1] !== currentUnitParts[1])) {
                alert('您只能管理本单位及下属单位的用户');
                return;
            }

            if (permissionLevel === '市局') {
                alert('您没有权限创建市局用户');
                return;
            }
        }

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

        if (id) args.id = parseInt(id);
        if (password) args.password = password;

        const data = await UsersTools.saveUser(order, args);

        if (data.success) {
            this.closeModal();
            await this.loadUsers();
            if(window.workplace) {
                window.workplace.showNotification(id ? '用户更新成功' : '用户创建成功', 'bottom', 3000);
            } else {
                alert(id ? '用户更新成功' : '用户创建成功');
            }
        } else {
            alert('保存失败: ' + data.error);
        }
    }

    deleteUser(id) {
        this.deleteId = id;
        this.elements.deleteModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.deleteModal.querySelector('.wp-modal-container'));
    }

    closeDeleteModal() {
        if (!this.elements.deleteModal.classList.contains('hidden')) {
            this.deleteId = null;
            WpAnimation.popOut(this.elements.deleteModal.querySelector('.wp-modal-container')).then(() => {
                this.elements.deleteModal.classList.add('hidden');
            });
        }
    }

    async confirmDelete() {
        if (!this.deleteId) return;

        const user = this.users.find(u => u.id === this.deleteId);
        if (user && this.currentUser.permission_level === '区县局') {
            const currentUnit = this.units.find(u => [u['一级'], u['二级'], u['三级']].filter(Boolean).join(' / ') === this.currentUser.unit_name);
            const targetUnit = this.units.find(u => [u['一级'], u['二级'], u['三级']].filter(Boolean).join(' / ') === user.unit_name);

            if (currentUnit && targetUnit) {
                if (targetUnit['一级'] !== currentUnit['一级'] ||
                    (targetUnit['二级'] && targetUnit['二级'] !== currentUnit['二级'])) {
                    alert('您没有权限删除该用户');
                    this.closeDeleteModal();
                    return;
                }
            }
        }

        const data = await UsersTools.deleteUser(this.deleteId);

        if (data.success) {
            this.closeDeleteModal();
            await this.loadUsers();
            if(window.workplace) {
                window.workplace.showNotification('用户删除成功', 'bottom', 3000);
            }
        } else {
            alert('删除失败: ' + data.error);
        }
    }

    resetPassword(id) {
        this.resetPasswordId = id;
        this.elements.inputNewPassword.value = '';
        this.elements.resetPasswordModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.resetPasswordModal.querySelector('.wp-modal-container'));
    }

    closeResetPasswordModal() {
        if (!this.elements.resetPasswordModal.classList.contains('hidden')) {
            this.resetPasswordId = null;
            WpAnimation.popOut(this.elements.resetPasswordModal.querySelector('.wp-modal-container')).then(() => {
                this.elements.resetPasswordModal.classList.add('hidden');
            });
        }
    }

    async confirmResetPassword() {
        if (!this.resetPasswordId) return;

        const newPassword = this.elements.inputNewPassword.value.trim();
        if (!newPassword) {
            alert('请输入新密码');
            return;
        }

        const user = this.users.find(u => u.id === this.resetPasswordId);
        if (user && this.currentUser.permission_level === '区县局') {
            const currentUnit = this.units.find(u => [u['一级'], u['二级'], u['三级']].filter(Boolean).join(' / ') === this.currentUser.unit_name);
            const targetUnit = this.units.find(u => [u['一级'], u['二级'], u['三级']].filter(Boolean).join(' / ') === user.unit_name);

            if (currentUnit && targetUnit) {
                if (targetUnit['一级'] !== currentUnit['一级'] ||
                    (targetUnit['二级'] && targetUnit['二级'] !== currentUnit['二级'])) {
                    alert('您没有权限重置该用户密码');
                    this.closeResetPasswordModal();
                    return;
                }
            }
        }

        const data = await UsersTools.resetPassword(this.resetPasswordId, newPassword);

        if (data.success) {
            this.closeResetPasswordModal();
            if(window.workplace) {
                window.workplace.showNotification('密码重置成功', 'bottom', 3000);
            } else {
                alert('密码重置成功');
            }
        } else {
            alert('重置失败: ' + data.error);
        }
    }
}

window.UsersController = UsersController;
