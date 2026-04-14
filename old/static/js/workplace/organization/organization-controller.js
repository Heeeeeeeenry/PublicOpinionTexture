/**
 * 组织管理控制器
 *
 * 负责组织管理页面的初始化、单位管理、下发权限管理
 * 使用 anime.js 实现入场动画和交互动画
 * 仅限市局(CITY)权限使用
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
 */

class OrganizationController {
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
        this.currentTab = 'units';
        
        // 数据
        this.units = [];
        this.filteredUnits = [];
        this.dispatchPermissions = [];
        this.filteredDispatchPermissions = [];
        
        // 分页
        this.unitsPage = 1;
        this.unitsPageSize = 20;
        this.dispatchPage = 1;
        this.dispatchPageSize = 20;
        
        // 删除状态
        this.deleteType = null;
        this.deleteId = null;
        
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
            this.currentAnimation.pause();
            this.currentAnimation = null;
        }
        // 重置所有元素到可见状态
        this.resetElementsVisibility();
    }

    /**
     * 重置元素可见性
     * 将所有元素设置为可见状态
     */
    resetElementsVisibility() {
        if (!this.container) return;

        const selectors = [
            '.organization-header',
            '.tabs-panel',
            '.search-filter-panel',
            '#units-table-body tr',
            '#dispatch-table-body tr',
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
        console.log('[OrganizationController] 初始化组织管理页面');

        // 检查权限
        const hasPermission = await this.checkPermission();
        if (!hasPermission) {
            this.container.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <i class="fas fa-lock text-6xl text-gray-300 mb-4"></i>
                        <h2 class="text-xl font-bold text-gray-600">权限不足</h2>
                        <p class="text-gray-500 mt-2">只有市局管理员才能访问此页面</p>
                    </div>
                </div>
            `;
            return;
        }

        // 检查是否被中断
        if (this.initAborted) return;

        // 第1步：先隐藏所有元素，防止闪烁
        this.hideAllElements();

        // 第2步：获取 DOM 元素
        this.getElements();

        // 第3步：绑定事件
        this.bindEvents();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第4步：加载数据（首次进入时跳过动画，等待入场动画）
        await this.loadUnits(true);
        await this.loadDispatchPermissions(true);

        // 检查是否被中断
        if (this.initAborted) return;

        // 第5步：执行入场动画（如果动画未完成或未播放过）
        if (!this.animationPlayed || !this.animationCompleted) {
            this.animationPlayed = true;
            this.animationCompleted = false;
            await this.playEntranceAnimation();
        }

        // 检查是否被中断
        if (this.initAborted) return;

        this.isInitialized = true;
        console.log('[OrganizationController] 组织管理页面初始化完成');
    }

    /**
     * 隐藏所有元素（初始化前调用，防止闪烁）
     */
    hideAllElements() {
        if (this.container) {
            const selectors = [
                '.organization-header',
                '.tabs-panel',
                '.search-filter-panel',
                '#units-table-body tr',
                '#dispatch-table-body tr',
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
        console.log('[OrganizationController] 页面显示');

        // 确保所有元素可见
        this.ensureElementsVisible();

        // 刷新当前选项卡数据并执行表格动画
        if (this.currentTab === 'units') {
            await this.loadUnits();
        } else {
            await this.loadDispatchPermissions();
        }
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[OrganizationController] 页面隐藏');
        // 关闭可能打开的弹窗
        this.closeAllModals();
    }

    /**
     * 刷新数据
     *
     * 再次打开页面时调用，只刷新数据，不执行动画
     */
    async refresh() {
        console.log('[OrganizationController] 刷新数据');
        if (!this.isInitialized) return;

        if (this.currentTab === 'units') {
            await this.loadUnits();
        } else {
            await this.loadDispatchPermissions();
        }
    }

    /**
     * 隐藏表格行（用于动画前）
     */
    hideTableRows() {
        const rows = this.container.querySelectorAll('#units-table-body tr, #dispatch-table-body tr');
        rows.forEach(row => {
            row.style.opacity = '0';
        });
    }

    /**
     * 检查权限
     */
    async checkPermission() {
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
                return data.data.permission_level === 'CITY';
            }
            return false;
        } catch (error) {
            console.error('[OrganizationController] 检查权限失败:', error);
            return false;
        }
    }

    /**
     * 确保所有元素可见（用于非首次访问）
     */
    ensureElementsVisible() {
        const selectors = [
            '.organization-header',
            '.tabs-panel',
            '.search-filter-panel',
            '#units-table-body tr',
            '#dispatch-table-body tr',
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
                targets: this.container.querySelectorAll('.organization-header'),
                opacity: [0, 1],
                translateY: [30, 0],
                scale: [0.95, 1],
                duration: 800
            })
            // 2. 选项卡动画
            .add({
                targets: this.container.querySelectorAll('.tabs-panel'),
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 600
            }, '-=400')
            // 3. 搜索栏动画
            .add({
                targets: this.container.querySelectorAll('.search-filter-panel'),
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 500
            }, '-=300')
            // 4. 分页信息动画（在表格数据之前）
            .add({
                targets: this.container.querySelectorAll('.pagination-panel'),
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 500
            }, '-=300')
            // 5. 表格行同时从左向右划入
            .add({
                targets: this.container.querySelectorAll('#units-table-body tr, #dispatch-table-body tr'),
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 500
            }, '-=300');
        });
    }

    /**
     * 获取 DOM 元素引用
     */
    getElements() {
        // 选项卡
        this.elements.tabUnits = this.container.querySelector('#tab-units');
        this.elements.tabDispatch = this.container.querySelector('#tab-dispatch');
        this.elements.tabContentUnits = this.container.querySelector('#tab-content-units');
        this.elements.tabContentDispatch = this.container.querySelector('#tab-content-dispatch');

        // 单位管理元素
        this.elements.unitsTableBody = this.container.querySelector('#units-table-body');
        this.elements.unitSearchInput = this.container.querySelector('#unit-search-input');
        this.elements.filterLevel1 = this.container.querySelector('#filter-level1');
        this.elements.unitsPaginationInfo = this.container.querySelector('#units-pagination-info');
        this.elements.unitsPaginationControls = this.container.querySelector('#units-pagination-controls');
        this.elements.unitsPageSizeSelect = this.container.querySelector('#units-page-size-select');
        this.elements.btnAddUnit = this.container.querySelector('#btn-add-unit');

        // 下发权限元素
        this.elements.dispatchTableBody = this.container.querySelector('#dispatch-table-body');
        this.elements.dispatchSearchInput = this.container.querySelector('#dispatch-search-input');
        this.elements.dispatchPaginationInfo = this.container.querySelector('#dispatch-pagination-info');
        this.elements.dispatchPaginationControls = this.container.querySelector('#dispatch-pagination-controls');
        this.elements.dispatchPageSizeSelect = this.container.querySelector('#dispatch-page-size-select');
        this.elements.btnAddDispatch = this.container.querySelector('#btn-add-dispatch');

        // 单位弹窗
        this.elements.unitModal = this.container.querySelector('#unit-modal');
        this.elements.unitModalTitle = this.container.querySelector('#unit-modal-title');
        this.elements.unitId = this.container.querySelector('#unit-id');
        this.elements.inputUnitLevel1 = this.container.querySelector('#input-unit-level1');
        this.elements.inputUnitLevel2 = this.container.querySelector('#input-unit-level2');
        this.elements.inputUnitLevel3 = this.container.querySelector('#input-unit-level3');
        this.elements.btnUnitSave = this.container.querySelector('#btn-unit-save');
        this.elements.btnUnitCancel = this.container.querySelector('#btn-unit-cancel');

        // 下发权限弹窗
        this.elements.dispatchModal = this.container.querySelector('#dispatch-modal');
        this.elements.dispatchModalTitle = this.container.querySelector('#dispatch-modal-title');
        this.elements.dispatchPermissionId = this.container.querySelector('#dispatch-permission-id');
        this.elements.inputDispatchUnit = this.container.querySelector('#input-dispatch-unit');
        this.elements.inputDispatchUnitSearch = this.container.querySelector('#input-dispatch-unit-search');
        this.elements.dispatchUnitDropdown = this.container.querySelector('#dispatch-unit-dropdown');
        this.elements.inputUnitsFilter = this.container.querySelector('#input-units-filter');
        this.elements.specificUnitsContainer = this.container.querySelector('#specific-units-container');
        this.elements.unitsCheckboxList = this.container.querySelector('#units-checkbox-list');
        this.elements.selectedUnitsList = this.container.querySelector('#selected-units-list');
        this.elements.selectedUnitsCount = this.container.querySelector('#selected-units-count');
        this.elements.btnClearSelected = this.container.querySelector('#btn-clear-selected');
        this.elements.btnDispatchSave = this.container.querySelector('#btn-dispatch-save');
        this.elements.btnDispatchCancel = this.container.querySelector('#btn-dispatch-cancel');

        // 删除弹窗
        this.elements.deleteModal = this.container.querySelector('#delete-modal');
        this.elements.deleteModalMessage = this.container.querySelector('#delete-modal-message');
        this.elements.btnCancelDelete = this.container.querySelector('#btn-cancel-delete');
        this.elements.btnConfirmDelete = this.container.querySelector('#btn-confirm-delete');
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 选项卡切换
        this.elements.tabUnits.addEventListener('click', () => this.switchTab('units'));
        this.elements.tabDispatch.addEventListener('click', () => this.switchTab('dispatch'));

        // 单位管理事件
        this.elements.unitSearchInput.addEventListener('input', () => this.filterUnits());
        this.elements.filterLevel1.addEventListener('change', () => this.filterUnits());
        this.elements.btnAddUnit.addEventListener('click', () => this.openUnitModal());
        this.elements.btnUnitSave.addEventListener('click', () => this.saveUnit());
        this.elements.btnUnitCancel.addEventListener('click', () => this.closeUnitModal());

        // 单位每页数量选择
        if (this.elements.unitsPageSizeSelect) {
            this.elements.unitsPageSizeSelect.addEventListener('change', () => this.onUnitsPageSizeChange());
        }

        // 下发权限事件
        this.elements.dispatchSearchInput.addEventListener('input', () => this.filterDispatchPermissions());
        this.elements.btnAddDispatch.addEventListener('click', () => this.openDispatchModal());
        this.elements.btnDispatchSave.addEventListener('click', () => this.saveDispatchPermission());
        this.elements.btnDispatchCancel.addEventListener('click', () => this.closeDispatchModal());

        // 下发权限每页数量选择
        if (this.elements.dispatchPageSizeSelect) {
            this.elements.dispatchPageSizeSelect.addEventListener('change', () => this.onDispatchPageSizeChange());
        }

        // 单位搜索下拉框事件
        this.elements.inputDispatchUnitSearch.addEventListener('input', () => this.filterUnitDropdown());
        this.elements.inputDispatchUnitSearch.addEventListener('focus', () => this.showUnitDropdown());

        // 单位列表筛选事件
        this.elements.inputUnitsFilter.addEventListener('input', () => this.filterUnitsCheckboxList());

        // 清空已选单位事件
        this.elements.btnClearSelected.addEventListener('click', () => this.clearSelectedUnits());

        // 下发范围类型切换
        const scopeTypeRadios = this.container.querySelectorAll('input[name="dispatch-scope-type"]');
        scopeTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.onScopeTypeChange());
        });

        // 点击其他地方关闭单位下拉框
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#input-dispatch-unit-search') && !e.target.closest('#dispatch-unit-dropdown')) {
                this.hideUnitDropdown();
            }
        });

        // 删除弹窗事件
        this.elements.btnCancelDelete.addEventListener('click', () => this.closeDeleteModal());
        this.elements.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());

        // 点击弹窗外部关闭
        [this.elements.unitModal, this.elements.dispatchModal, this.elements.deleteModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeAllModals();
                    }
                });
            }
        });
    }

    /**
     * 切换选项卡
     */
    switchTab(tab) {
        if (this.currentTab === tab) return;

        this.currentTab = tab;

        // 更新选项卡样式
        this.elements.tabUnits.classList.toggle('active', tab === 'units');
        this.elements.tabUnits.classList.toggle('text-blue-600', tab === 'units');
        this.elements.tabUnits.classList.toggle('border-b-2', tab === 'units');
        this.elements.tabUnits.classList.toggle('border-blue-600', tab === 'units');
        this.elements.tabUnits.classList.toggle('text-gray-500', tab !== 'units');

        this.elements.tabDispatch.classList.toggle('active', tab === 'dispatch');
        this.elements.tabDispatch.classList.toggle('text-blue-600', tab === 'dispatch');
        this.elements.tabDispatch.classList.toggle('border-b-2', tab === 'dispatch');
        this.elements.tabDispatch.classList.toggle('border-blue-600', tab === 'dispatch');
        this.elements.tabDispatch.classList.toggle('text-gray-500', tab !== 'dispatch');

        // 切换内容显示
        this.elements.tabContentUnits.classList.toggle('hidden', tab !== 'units');
        this.elements.tabContentDispatch.classList.toggle('hidden', tab !== 'dispatch');

        // 播放切换动画
        anime({
            targets: tab === 'units' ? this.elements.tabContentUnits : this.elements.tabContentDispatch,
            opacity: [0, 1],
            translateX: [20, 0],
            duration: 400,
            easing: 'easeOutExpo'
        });

        // 刷新数据
        if (tab === 'units') {
            this.loadUnits();
        } else {
            this.loadDispatchPermissions();
        }
    }

    /**
     * 加载单位列表
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    async loadUnits(skipAnimation = false) {
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
                this.filteredUnits = [...this.units];
                this.updateLevel1Filter();
                this.renderUnitsTable(skipAnimation);
            } else {
                console.error('[OrganizationController] 加载单位列表失败:', result.error);
            }
        } catch (error) {
            console.error('[OrganizationController] 加载单位列表出错:', error);
        }
    }

    /**
     * 更新一级单位筛选选项
     */
    updateLevel1Filter() {
        const level1Units = [...new Set(this.units.map(u => u['一级']).filter(Boolean))];
        this.elements.filterLevel1.innerHTML = '<option value="">全部一级单位</option>';
        level1Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            this.elements.filterLevel1.appendChild(option);
        });
    }

    /**
     * 筛选单位
     */
    filterUnits() {
        const searchTerm = this.elements.unitSearchInput.value.toLowerCase();
        const level1Filter = this.elements.filterLevel1.value;

        this.filteredUnits = this.units.filter(unit => {
            const fullName = this.getUnitFullName(unit).toLowerCase();
            const matchSearch = !searchTerm || fullName.includes(searchTerm);

            const matchLevel1 = !level1Filter || unit['一级'] === level1Filter;

            return matchSearch && matchLevel1;
        });

        this.unitsPage = 1;
        this.renderUnitsTable();
    }

    /**
     * 渲染单位表格
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    renderUnitsTable(skipAnimation = false) {
        if (this.filteredUnits.length === 0) {
            this.elements.unitsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-building text-4xl mb-3"></i>
                        <p>暂无单位数据</p>
                    </td>
                </tr>
            `;
            this.elements.unitsPaginationInfo.textContent = '共 0 条记录';
            this.elements.unitsPaginationControls.innerHTML = '';
            return;
        }

        // 计算分页
        const totalPages = Math.ceil(this.filteredUnits.length / this.unitsPageSize);
        const start = (this.unitsPage - 1) * this.unitsPageSize;
        const end = start + this.unitsPageSize;
        const pageUnits = this.filteredUnits.slice(start, end);

        this.elements.unitsTableBody.innerHTML = pageUnits.map(unit => `
            <tr class="hover:bg-gray-50 transition" style="opacity: ${skipAnimation ? '0' : '1'};">
                <td class="px-6 py-4 text-sm text-gray-800 font-medium">${this.getUnitFullName(unit)}</td>
                <td class="px-6 py-4 text-sm text-gray-800">${unit['一级'] || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${unit['二级'] || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${unit['三级'] || '-'}</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-blue-600 hover:text-blue-800 mx-1" onclick="window.workplaceController.controllers.organization.editUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800 mx-1" onclick="window.workplaceController.controllers.organization.deleteUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // 更新分页信息
        this.elements.unitsPaginationInfo.textContent = `共 ${this.filteredUnits.length} 条记录，第 ${this.unitsPage}/${totalPages} 页`;

        // 渲染分页控件
        this.renderUnitsPaginationControls(totalPages);

        // 执行表格行动画（同时从左向右划入）
        if (!skipAnimation && this.currentTab === 'units') {
            this.animateTableRows('#units-table-body tr');
        }
    }

    /**
     * 渲染单位分页控件
     * @param {number} totalPages - 总页数
     */
    renderUnitsPaginationControls(totalPages) {
        const paginationControls = this.elements.unitsPaginationControls;
        if (!paginationControls) return;

        let html = '';

        // 上一页按钮
        html += `
            <button class="page-btn ${this.unitsPage === 1 ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.organization.goToUnitsPrevPage()" 
                    ${this.unitsPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
        `;

        // 页码按钮
        const maxButtons = 5;
        let startPage = Math.max(1, this.unitsPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="page-number" onclick="window.workplaceController.controllers.organization.goToUnitsPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="page-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-number ${i === this.unitsPage ? 'active' : ''}" 
                        onclick="window.workplaceController.controllers.organization.goToUnitsPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="page-ellipsis">...</span>`;
            }
            html += `<button class="page-number" onclick="window.workplaceController.controllers.organization.goToUnitsPage(${totalPages})">${totalPages}</button>`;
        }

        // 下一页按钮
        html += `
            <button class="page-btn ${this.unitsPage === totalPages ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.organization.goToUnitsNextPage()" 
                    ${this.unitsPage === totalPages ? 'disabled' : ''}>
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationControls.innerHTML = html;
    }

    /**
     * 跳转到指定单位页
     * @param {number} pageNum - 页码
     */
    goToUnitsPage(pageNum) {
        const totalPages = Math.ceil(this.filteredUnits.length / this.unitsPageSize);
        if (pageNum < 1 || pageNum > totalPages || pageNum === this.unitsPage) {
            return;
        }
        this.unitsPage = pageNum;
        this.renderUnitsTable();
    }

    /**
     * 跳转到单位上一页
     */
    goToUnitsPrevPage() {
        if (this.unitsPage > 1) {
            this.unitsPage--;
            this.renderUnitsTable();
        }
    }

    /**
     * 跳转到单位下一页
     */
    goToUnitsNextPage() {
        const totalPages = Math.ceil(this.filteredUnits.length / this.unitsPageSize);
        if (this.unitsPage < totalPages) {
            this.unitsPage++;
            this.renderUnitsTable();
        }
    }

    /**
     * 单位每页数量改变
     */
    onUnitsPageSizeChange() {
        const select = this.elements.unitsPageSizeSelect;
        if (select) {
            this.unitsPageSize = parseInt(select.value);
            this.unitsPage = 1;
            this.renderUnitsTable();
        }
    }

    /**
     * 加载下发权限列表
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    async loadDispatchPermissions(skipAnimation = false) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_dispatch_permissions',
                    args: {}
                })
            });
            const result = await response.json();

            if (result.success) {
                this.dispatchPermissions = result.data || [];
                this.filteredDispatchPermissions = [...this.dispatchPermissions];
                this.renderDispatchTable(skipAnimation);
            } else {
                console.error('[OrganizationController] 加载下发权限失败:', result.error);
            }
        } catch (error) {
            console.error('[OrganizationController] 加载下发权限出错:', error);
        }
    }

    /**
     * 筛选下发权限
     */
    filterDispatchPermissions() {
        const searchTerm = this.elements.dispatchSearchInput.value.toLowerCase();

        this.filteredDispatchPermissions = this.dispatchPermissions.filter(perm => {
            return !searchTerm || perm.unit_full_name.toLowerCase().includes(searchTerm);
        });

        this.dispatchPage = 1;
        this.renderDispatchTable();
    }

    /**
     * 显示单位下拉框
     */
    showUnitDropdown() {
        this.renderUnitDropdown(this.units);
        this.elements.dispatchUnitDropdown.classList.remove('hidden');
    }

    /**
     * 隐藏单位下拉框
     */
    hideUnitDropdown() {
        this.elements.dispatchUnitDropdown.classList.add('hidden');
    }

    /**
     * 筛选单位下拉框
     */
    filterUnitDropdown() {
        const searchTerm = this.elements.inputDispatchUnitSearch.value.toLowerCase();
        const filtered = this.units.filter(unit => {
            const fullName = this.getUnitFullName(unit).toLowerCase();
            return fullName.includes(searchTerm);
        });
        this.renderUnitDropdown(filtered);
        this.elements.dispatchUnitDropdown.classList.remove('hidden');
    }

    /**
     * 渲染单位下拉框
     */
    renderUnitDropdown(units) {
        if (units.length === 0) {
            this.elements.dispatchUnitDropdown.innerHTML = '<div class="px-4 py-2 text-gray-500">无匹配单位</div>';
            return;
        }

        this.elements.dispatchUnitDropdown.innerHTML = units.map(unit => `
            <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer" onclick="window.workplaceController.controllers.organization.selectUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')">
                <div class="font-medium text-gray-800">${this.getUnitFullName(unit)}</div>
            </div>
        `).join('');
    }

    /**
     * 选择单位
     */
    selectUnit(fullName) {
        this.elements.inputDispatchUnit.value = fullName;
        this.elements.inputDispatchUnitSearch.value = fullName;
        this.hideUnitDropdown();
    }

    /**
     * 筛选单位复选框列表
     */
    filterUnitsCheckboxList() {
        const searchTerm = this.elements.inputUnitsFilter.value.toLowerCase();
        const labels = this.elements.unitsCheckboxList.querySelectorAll('label');

        labels.forEach(label => {
            const text = label.textContent.toLowerCase();
            const match = text.includes(searchTerm);
            label.style.display = match ? 'flex' : 'none';
        });
    }

    /**
     * 更新已选单位列表
     */
    updateSelectedUnitsList() {
        const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox:checked');
        const selectedFullNames = Array.from(checkboxes).map(cb => cb.value);

        this.elements.selectedUnitsCount.textContent = selectedFullNames.length;

        if (selectedFullNames.length === 0) {
            this.elements.selectedUnitsList.innerHTML = '<div class="text-gray-400 text-sm">暂无已选单位</div>';
            return;
        }

        this.elements.selectedUnitsList.innerHTML = selectedFullNames.map(fullName => {
            return `
                <div class="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm">
                    <span class="text-sm text-gray-700 truncate" title="${fullName}">${fullName}</span>
                    <button onclick="window.workplaceController.controllers.organization.removeSelectedUnit('${fullName.replace(/'/g, "\\'")}')"
                            class="text-red-500 hover:text-red-700 ml-2" title="删除">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * 删除已选单位
     */
    removeSelectedUnit(fullName) {
        const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.value === fullName) {
                checkbox.checked = false;
            }
        });
        this.updateSelectedUnitsList();
    }

    /**
     * 清空已选单位
     */
    clearSelectedUnits() {
        const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox:checked');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectedUnitsList();
    }

    /**
     * 渲染下发权限表格
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    renderDispatchTable(skipAnimation = false) {
        if (this.filteredDispatchPermissions.length === 0) {
            this.elements.dispatchTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-paper-plane text-4xl mb-3"></i>
                        <p>暂无下发权限配置</p>
                    </td>
                </tr>
            `;
            this.elements.dispatchPaginationInfo.textContent = '共 0 条记录';
            this.elements.dispatchPaginationControls.innerHTML = '';
            return;
        }

        // 计算分页
        const totalPages = Math.ceil(this.filteredDispatchPermissions.length / this.dispatchPageSize);
        const start = (this.dispatchPage - 1) * this.dispatchPageSize;
        const end = start + this.dispatchPageSize;
        const pagePermissions = this.filteredDispatchPermissions.slice(start, end);

        this.elements.dispatchTableBody.innerHTML = pagePermissions.map(perm => {
            const unitName = perm.unit_full_name || '未知单位';

            let scopeText = '向所有单位下发';
            try {
                const scope = JSON.parse(perm.dispatch_scope);
                if (Array.isArray(scope) && scope.length > 0 && scope[0] !== 'ALLDEPARTMENT') {
                    scopeText = `向 ${scope.length} 个指定单位下发`;
                }
            } catch (e) {
                scopeText = perm.dispatch_scope;
            }

            return `
                <tr class="hover:bg-gray-50 transition" style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td class="px-6 py-4 text-sm text-gray-800 font-medium">${unitName}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${scopeText}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-blue-600 hover:text-blue-800 mx-1" onclick="window.workplaceController.controllers.organization.editDispatchPermission(${perm.id})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-800 mx-1" onclick="window.workplaceController.controllers.organization.deleteDispatchPermission(${perm.id})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // 更新分页信息
        this.elements.dispatchPaginationInfo.textContent = `共 ${this.filteredDispatchPermissions.length} 条记录，第 ${this.dispatchPage}/${totalPages} 页`;

        // 渲染分页控件
        this.renderDispatchPaginationControls(totalPages);

        // 执行表格行动画（同时从左向右划入）
        if (!skipAnimation && this.currentTab === 'dispatch') {
            this.animateTableRows('#dispatch-table-body tr');
        }
    }

    /**
     * 渲染下发权限分页控件
     * @param {number} totalPages - 总页数
     */
    renderDispatchPaginationControls(totalPages) {
        const paginationControls = this.elements.dispatchPaginationControls;
        if (!paginationControls) return;

        let html = '';

        // 上一页按钮
        html += `
            <button class="page-btn ${this.dispatchPage === 1 ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.organization.goToDispatchPrevPage()" 
                    ${this.dispatchPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
        `;

        // 页码按钮
        const maxButtons = 5;
        let startPage = Math.max(1, this.dispatchPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="page-number" onclick="window.workplaceController.controllers.organization.goToDispatchPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="page-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-number ${i === this.dispatchPage ? 'active' : ''}" 
                        onclick="window.workplaceController.controllers.organization.goToDispatchPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="page-ellipsis">...</span>`;
            }
            html += `<button class="page-number" onclick="window.workplaceController.controllers.organization.goToDispatchPage(${totalPages})">${totalPages}</button>`;
        }

        // 下一页按钮
        html += `
            <button class="page-btn ${this.dispatchPage === totalPages ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.organization.goToDispatchNextPage()" 
                    ${this.dispatchPage === totalPages ? 'disabled' : ''}>
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationControls.innerHTML = html;
    }

    /**
     * 跳转到指定下发权限页
     * @param {number} pageNum - 页码
     */
    goToDispatchPage(pageNum) {
        const totalPages = Math.ceil(this.filteredDispatchPermissions.length / this.dispatchPageSize);
        if (pageNum < 1 || pageNum > totalPages || pageNum === this.dispatchPage) {
            return;
        }
        this.dispatchPage = pageNum;
        this.renderDispatchTable();
    }

    /**
     * 跳转到下发权限上一页
     */
    goToDispatchPrevPage() {
        if (this.dispatchPage > 1) {
            this.dispatchPage--;
            this.renderDispatchTable();
        }
    }

    /**
     * 跳转到下发权限下一页
     */
    goToDispatchNextPage() {
        const totalPages = Math.ceil(this.filteredDispatchPermissions.length / this.dispatchPageSize);
        if (this.dispatchPage < totalPages) {
            this.dispatchPage++;
            this.renderDispatchTable();
        }
    }

    /**
     * 下发权限每页数量改变
     */
    onDispatchPageSizeChange() {
        const select = this.elements.dispatchPageSizeSelect;
        if (select) {
            this.dispatchPageSize = parseInt(select.value);
            this.dispatchPage = 1;
            this.renderDispatchTable();
        }
    }

    /**
     * 动画化表格行（同时从左向右划入）
     * @param {string} selector - 表格行选择器
     */
    animateTableRows(selector) {
        const rows = this.container.querySelectorAll(selector);
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
     * 获取单位完整名称
     */
    getUnitFullName(unit) {
        const parts = [];
        if (unit.level1) parts.push(unit.level1);
        if (unit.level2) parts.push(unit.level2);
        if (unit.level3) parts.push(unit.level3);
        return parts.length > 0 ? parts.join(' / ') : '';
    }

    /**
     * 打开单位弹窗
     */
    openUnitModal(unit = null) {
        if (unit) {
            this.elements.unitModalTitle.textContent = '编辑单位';
            this.elements.unitId.value = unit.fullName;
            this.elements.inputUnitLevel1.value = unit.level1 || '';
            this.elements.inputUnitLevel2.value = unit.level2 || '';
            this.elements.inputUnitLevel3.value = unit.level3 || '';
            this.elements.inputUnitLevel1.disabled = true;
        } else {
            this.elements.unitModalTitle.textContent = '新增单位';
            this.elements.unitId.value = '';
            this.elements.inputUnitLevel1.value = '';
            this.elements.inputUnitLevel2.value = '';
            this.elements.inputUnitLevel3.value = '';
            this.elements.inputUnitLevel1.disabled = false;
        }

        this.elements.unitModal.classList.remove('hidden');
        this.elements.unitModal.classList.add('flex');

        anime({
            targets: '#unit-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            translateY: [20, 0],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 关闭单位弹窗
     */
    closeUnitModal() {
        this.elements.unitModal.classList.add('hidden');
        this.elements.unitModal.classList.remove('flex');
    }

    /**
     * 编辑单位
     */
    editUnit(fullName) {
        const unit = this.units.find(u => this.getUnitFullName(u) === fullName);
        if (unit) {
            this.openUnitModal(unit);
        }
    }

    /**
     * 保存单位
     */
    async saveUnit() {
        const level1 = this.elements.inputUnitLevel1.value.trim();
        const level2 = this.elements.inputUnitLevel2.value.trim();
        const level3 = this.elements.inputUnitLevel3.value.trim();

        if (!level1) {
            alert('一级单位不能为空');
            return;
        }

        const isEdit = this.elements.unitId.value !== '';
        const order = isEdit ? 'update_unit' : 'create_unit';

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: order,
                    args: {
                        level1: level1,
                        level2: level2,
                        level3: level3
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                this.closeUnitModal();
                await this.loadUnits();
                alert(isEdit ? '单位更新成功' : '单位创建成功');
            } else {
                alert('保存失败: ' + result.error);
            }
        } catch (error) {
            console.error('[OrganizationController] 保存单位出错:', error);
            alert('保存单位出错');
        }
    }

    /**
     * 删除单位
     */
    deleteUnit(fullName) {
        this.deleteType = 'unit';
        this.deleteId = fullName;
        this.elements.deleteModalMessage.textContent = `确定要删除单位 "${fullName}" 吗？此操作不可恢复。`;
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
     * 打开下发权限弹窗
     */
    openDispatchModal(perm = null) {
        // 填充单位复选框列表
        this.elements.unitsCheckboxList.innerHTML = '';
        this.units.forEach(unit => {
            const fullName = this.getUnitFullName(unit);
            const label = document.createElement('label');
            label.className = 'flex items-center';
            label.innerHTML = `
                <input type="checkbox" value="${fullName}" class="unit-checkbox w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <span class="ml-2 text-sm text-gray-700">${fullName}</span>
            `;
            // 添加 change 事件监听
            const checkbox = label.querySelector('input');
            checkbox.addEventListener('change', () => this.updateSelectedUnitsList());
            this.elements.unitsCheckboxList.appendChild(label);
        });

        // 清空搜索框
        this.elements.inputDispatchUnitSearch.value = '';
        this.elements.inputUnitsFilter.value = '';

        if (perm) {
            this.elements.dispatchModalTitle.textContent = '编辑下发权限';
            this.elements.dispatchPermissionId.value = perm.id;

            // 设置单位选择
            this.elements.inputDispatchUnit.value = perm.unit_full_name || '';
            this.elements.inputDispatchUnitSearch.value = perm.unit_full_name || '';

            try {
                const scope = JSON.parse(perm.dispatch_scope);
                if (Array.isArray(scope) && scope.length > 0 && scope[0] === 'ALLDEPARTMENT') {
                    this.container.querySelector('input[name="dispatch-scope-type"][value="all"]').checked = true;
                    this.elements.specificUnitsContainer.classList.add('hidden');
                    this.updateSelectedUnitsList();
                } else {
                    this.container.querySelector('input[name="dispatch-scope-type"][value="specific"]').checked = true;
                    this.elements.specificUnitsContainer.classList.remove('hidden');
                    // 选中对应的单位
                    const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox');
                    checkboxes.forEach(cb => {
                        cb.checked = scope.includes(cb.value);
                    });
                    this.updateSelectedUnitsList();
                }
            } catch (e) {
                this.container.querySelector('input[name="dispatch-scope-type"][value="all"]').checked = true;
                this.elements.specificUnitsContainer.classList.add('hidden');
                this.updateSelectedUnitsList();
            }
        } else {
            this.elements.dispatchModalTitle.textContent = '新增下发权限';
            this.elements.dispatchPermissionId.value = '';
            this.elements.inputDispatchUnit.value = '';
            this.elements.inputDispatchUnitSearch.value = '';
            this.container.querySelector('input[name="dispatch-scope-type"][value="all"]').checked = true;
            this.elements.specificUnitsContainer.classList.add('hidden');
            // 清空复选框
            const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedUnitsList();
        }

        this.elements.dispatchModal.classList.remove('hidden');
        this.elements.dispatchModal.classList.add('flex');

        anime({
            targets: '#dispatch-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            translateY: [20, 0],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 关闭下发权限弹窗
     */
    closeDispatchModal() {
        this.elements.dispatchModal.classList.add('hidden');
        this.elements.dispatchModal.classList.remove('flex');
    }

    /**
     * 下发范围类型变化
     */
    onScopeTypeChange() {
        const scopeType = this.container.querySelector('input[name="dispatch-scope-type"]:checked').value;
        if (scopeType === 'specific') {
            this.elements.specificUnitsContainer.classList.remove('hidden');
            anime({
                targets: this.elements.specificUnitsContainer,
                opacity: [0, 1],
                height: [0, 'auto'],
                duration: 300,
                easing: 'easeOutQuad'
            });
        } else {
            this.elements.specificUnitsContainer.classList.add('hidden');
        }
    }

    /**
     * 编辑下发权限
     */
    editDispatchPermission(id) {
        const perm = this.dispatchPermissions.find(p => p.id === id);
        if (perm) {
            this.openDispatchModal(perm);
        }
    }

    /**
     * 保存下发权限
     */
    async saveDispatchPermission() {
        const id = this.elements.dispatchPermissionId.value;
        const unitFullName = this.elements.inputDispatchUnit.value;
        const scopeType = this.container.querySelector('input[name="dispatch-scope-type"]:checked').value;

        if (!unitFullName) {
            alert('请选择单位');
            return;
        }

        let dispatchScope;
        if (scopeType === 'all') {
            dispatchScope = ['ALLDEPARTMENT'];
        } else {
            const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox:checked');
            dispatchScope = Array.from(checkboxes).map(cb => cb.value);
            if (dispatchScope.length === 0) {
                alert('请至少选择一个单位');
                return;
            }
        }

        const order = id ? 'update_dispatch_permission' : 'create_dispatch_permission';
        const args = {
            unit_full_name: unitFullName,
            dispatch_scope: JSON.stringify(dispatchScope)
        };
        if (id) {
            args.id = parseInt(id);
        }

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: order,
                    args: args
                })
            });

            const result = await response.json();

            if (result.success) {
                this.closeDispatchModal();
                await this.loadDispatchPermissions();
                alert(id ? '下发权限更新成功' : '下发权限创建成功');
            } else {
                alert('保存失败: ' + result.error);
            }
        } catch (error) {
            console.error('[OrganizationController] 保存下发权限出错:', error);
            alert('保存下发权限出错');
        }
    }

    /**
     * 删除下发权限
     */
    deleteDispatchPermission(id) {
        this.deleteType = 'dispatch';
        this.deleteId = id;
        this.elements.deleteModalMessage.textContent = '确定要删除这个下发权限吗？此操作不可恢复。';
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
        this.deleteType = null;
        this.deleteId = null;
        this.elements.deleteModal.classList.add('hidden');
        this.elements.deleteModal.classList.remove('flex');
    }

    /**
     * 确认删除
     */
    async confirmDelete() {
        if (!this.deleteType || !this.deleteId) {
            this.closeDeleteModal();
            return;
        }

        let order, args;
        if (this.deleteType === 'unit') {
            order = 'delete_unit';
            args = { full_name: this.deleteId };
        } else {
            order = 'delete_dispatch_permission';
            args = { id: this.deleteId };
        }

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: order,
                    args: args
                })
            });

            const result = await response.json();

            if (result.success) {
                this.closeDeleteModal();
                if (this.deleteType === 'unit') {
                    await this.loadUnits();
                } else {
                    await this.loadDispatchPermissions();
                }
                alert('删除成功');
            } else {
                alert('删除失败: ' + result.error);
            }
        } catch (error) {
            console.error('[OrganizationController] 删除出错:', error);
            alert('删除出错');
        }
    }

    /**
     * 关闭所有弹窗
     */
    closeAllModals() {
        this.closeUnitModal();
        this.closeDispatchModal();
        this.closeDeleteModal();
    }
}

// 导出控制器类到全局
window.OrganizationController = OrganizationController;
