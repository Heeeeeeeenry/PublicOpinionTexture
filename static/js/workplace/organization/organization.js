/**
 * 组织管理页面控制器
 */

class OrganizationController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
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
        
        // 动画和数据状态
        this.initialAnimationPlayed = false;
        this.needRefresh = true;
        this.animationAborted = false;  // 动画中断标志
        this.pageReady = false;         // 页面是否准备好
        
        // DOM 元素引用
        this.elements = {};
    }

    async init(container) {
        this.container = container;
        console.log('[OrganizationController] 初始化组织管理页面');

        try {
            // 1. 检查权限（同步检查，如果有缓存）
            const hasPermission = await OrganizationTools.checkPermission();
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
                this.isInitialized = true;
                return;
            }

            // 2. 设置HTML结构
            this.container.innerHTML = OrganizationHtml.generateHTML();
            this.getElements();
            this.bindEvents();

            // 3. 标记为已初始化
            this.isInitialized = true;
            console.log('[OrganizationController] 组织管理页面初始化完成');

            // 4. 页面已准备好，可以显示
            this.pageReady = true;
            
        } catch (error) {
            console.error('[OrganizationController] 初始化失败:', error);
            this.container.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center text-red-500">
                        <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                        <h2 class="text-xl font-bold">初始化失败</h2>
                        <p class="mt-2">${error.message || '未知错误'}</p>
                    </div>
                </div>
            `;
            this.isInitialized = true;
        }
    }

    hideAllElements() {
        const selectors = [
            '#organization-header',
            '.tabs-panel',
            '.search-filter-panel',
            '#units-table-body tr',
            '#dispatch-table-body tr',
            '#units-pagination',
            '#dispatch-pagination'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });
    }

    async show() {
        console.log('[OrganizationController] 页面显示，isInitialized:', this.isInitialized);
        
        // 确保页面已初始化
        if (!this.isInitialized || !this.container) {
            console.error('[OrganizationController] 页面未初始化，无法显示');
            return;
        }
        
        // 确保元素可见
        this.ensureElementsVisible();
        
        console.log('[OrganizationController] 页面基本显示完成，开始异步加载数据');

        // 异步加载数据（不阻塞页面切换）
        // 使用 Promise 但不等待，允许用户继续切换
        if (this.currentTab === 'units') {
            this.loadUnits().catch(err => {
                console.error('[OrganizationController] 加载单位列表失败:', err);
            });
        } else {
            this.loadDispatchPermissions().catch(err => {
                console.error('[OrganizationController] 加载下发权限失败:', err);
            });
        }
    }

    /**
     * 停止所有动画
     * 当页面切换时立即调用，确保动画不会阻塞页面切换
     */
    stopAnimation() {
        console.log('[OrganizationController] 停止动画');
        // 立即停止所有 WpAnimation 动画
        if (typeof WpAnimation !== 'undefined' && typeof WpAnimation.stopAll === 'function') {
            WpAnimation.stopAll();
        }
        // 立即重置所有元素到可见状态
        this.ensureElementsVisible();
    }

    hide() {
        console.log('[OrganizationController] 页面隐藏');
        this.closeAllModals();
    }

    ensureElementsVisible() {
        const selectors = [
            '#organization-header',
            '.tabs-panel',
            '.search-filter-panel',
            '#units-table-body tr',
            '#dispatch-table-body tr',
            '#units-pagination',
            '#dispatch-pagination'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
        });
    }

    async playEntranceAnimation() {
        // 重置中断标志
        this.animationAborted = false;
        
        const header = this.container.querySelector('#organization-header');
        const tabsPanel = this.container.querySelector('.tabs-panel');
        const searchPanel = this.container.querySelector('#tab-content-' + this.currentTab + ' .search-filter-panel');
        const tableRows = this.container.querySelectorAll('#' + this.currentTab + '-table-body tr');
        const paginationPanel = this.container.querySelector('#' + this.currentTab + '-pagination');

        // 检查是否被中断
        if (this.animationAborted) {
            console.log('[OrganizationController] 入场动画被中断，跳过剩余动画');
            return;
        }
        if (header) await WpAnimation.moveAndFadeIn(header, 'down', 30, 800, 0);
        
        if (this.animationAborted) return;
        if (tabsPanel) await WpAnimation.moveAndFadeIn(tabsPanel, 'down', 20, 600, 0);
        
        if (this.animationAborted) return;
        if (searchPanel) await WpAnimation.moveAndFadeIn(searchPanel, 'down', 20, 600, 0);
        
        if (this.animationAborted) return;
        if (paginationPanel) await WpAnimation.moveAndFadeIn(paginationPanel, 'down', 15, 500, 0);
        
        if (this.animationAborted) return;
        if (tableRows.length > 0) {
            await WpAnimation.moveAndFadeIn(tableRows, 'left', 30, 500, 50);
        }
    }

    async animateTableRows(selector) {
        const rows = this.container.querySelectorAll(selector);
        if (rows.length > 0) {
            rows.forEach(row => row.style.opacity = '0');
            await WpAnimation.moveAndFadeIn(rows, 'left', 30, 500, 50);
        }
    }

    getElements() {
        this.elements = {
            tabUnits: this.container.querySelector('#tab-units'),
            tabDispatch: this.container.querySelector('#tab-dispatch'),
            tabContentUnits: this.container.querySelector('#tab-content-units'),
            tabContentDispatch: this.container.querySelector('#tab-content-dispatch'),

            unitSearchInput: this.container.querySelector('#unit-search-input'),
            filterLevel1: this.container.querySelector('#filter-level1'),
            btnAddUnit: this.container.querySelector('#btn-add-unit'),
            unitsTableBody: this.container.querySelector('#units-table-body'),
            unitsPaginationInfo: this.container.querySelector('#units-pagination-info'),
            unitsPaginationControls: this.container.querySelector('#units-pagination-controls'),
            unitsPageSizeSelect: this.container.querySelector('#units-page-size-select'),

            dispatchSearchInput: this.container.querySelector('#dispatch-search-input'),
            btnAddDispatch: this.container.querySelector('#btn-add-dispatch'),
            dispatchTableBody: this.container.querySelector('#dispatch-table-body'),
            dispatchPaginationInfo: this.container.querySelector('#dispatch-pagination-info'),
            dispatchPaginationControls: this.container.querySelector('#dispatch-pagination-controls'),
            dispatchPageSizeSelect: this.container.querySelector('#dispatch-page-size-select'),

            // 单位弹窗
            unitModal: this.container.querySelector('#unit-modal'),
            unitModalTitle: this.container.querySelector('#unit-modal-title'),
            unitId: this.container.querySelector('#unit-id'),
            inputUnitLevel1: this.container.querySelector('#input-unit-level1'),
            inputUnitLevel2: this.container.querySelector('#input-unit-level2'),
            inputUnitLevel3: this.container.querySelector('#input-unit-level3'),
            btnUnitCancel: this.container.querySelector('#btn-unit-cancel'),
            btnUnitCancelIcon: this.container.querySelector('#btn-unit-cancel-icon'),
            btnUnitSave: this.container.querySelector('#btn-unit-save'),

            // 下发权限弹窗
            dispatchModal: this.container.querySelector('#dispatch-modal'),
            dispatchModalTitle: this.container.querySelector('#dispatch-modal-title'),
            dispatchPermissionId: this.container.querySelector('#dispatch-permission-id'),
            inputDispatchUnitSearch: this.container.querySelector('#input-dispatch-unit-search'),
            dispatchUnitDropdown: this.container.querySelector('#dispatch-unit-dropdown'),
            inputDispatchUnit: this.container.querySelector('#input-dispatch-unit'),
            specificUnitsContainer: this.container.querySelector('#specific-units-container'),
            inputUnitsFilter: this.container.querySelector('#input-units-filter'),
            unitsCheckboxList: this.container.querySelector('#units-checkbox-list'),
            selectedUnitsList: this.container.querySelector('#selected-units-list'),
            selectedUnitsCount: this.container.querySelector('#selected-units-count'),
            btnClearSelected: this.container.querySelector('#btn-clear-selected'),
            btnDispatchCancel: this.container.querySelector('#btn-dispatch-cancel'),
            btnDispatchCancelIcon: this.container.querySelector('#btn-dispatch-cancel-icon'),
            btnDispatchSave: this.container.querySelector('#btn-dispatch-save'),

            // 删除弹窗
            deleteModal: this.container.querySelector('#delete-modal'),
            deleteModalMessage: this.container.querySelector('#delete-modal-message'),
            btnCancelDelete: this.container.querySelector('#btn-cancel-delete'),
            btnConfirmDelete: this.container.querySelector('#btn-confirm-delete')
        };
    }

    bindEvents() {
        // 选项卡切换
        this.elements.tabUnits.addEventListener('click', () => this.switchTab('units'));
        this.elements.tabDispatch.addEventListener('click', () => this.switchTab('dispatch'));

        // 单位管理事件
        this.elements.unitSearchInput.addEventListener('input', () => this.filterUnits());
        this.elements.filterLevel1.addEventListener('change', () => this.filterUnits());
        this.elements.btnAddUnit.addEventListener('click', () => this.openUnitModal());

        this.elements.btnUnitCancel.addEventListener('click', () => this.closeUnitModal());
        this.elements.btnUnitCancelIcon.addEventListener('click', () => this.closeUnitModal());
        this.elements.btnUnitSave.addEventListener('click', () => this.saveUnit());

        // 下发权限事件
        this.elements.dispatchSearchInput.addEventListener('input', () => this.filterDispatchPermissions());
        this.elements.btnAddDispatch.addEventListener('click', () => this.openDispatchModal());

        this.elements.inputDispatchUnitSearch.addEventListener('focus', () => this.showUnitDropdown());
        this.elements.inputDispatchUnitSearch.addEventListener('input', () => this.filterUnitDropdown());
        document.addEventListener('click', (e) => {
            if (!this.elements.inputDispatchUnitSearch.contains(e.target) && !this.elements.dispatchUnitDropdown.contains(e.target)) {
                this.hideUnitDropdown();
            }
        });

        const scopeRadios = this.container.querySelectorAll('input[name="dispatch-scope-type"]');
        scopeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.onScopeTypeChange());
        });

        this.elements.inputUnitsFilter.addEventListener('input', () => this.filterUnitsCheckboxList());
        this.elements.btnClearSelected.addEventListener('click', () => this.clearSelectedUnits());

        this.elements.btnDispatchCancel.addEventListener('click', () => this.closeDispatchModal());
        this.elements.btnDispatchCancelIcon.addEventListener('click', () => this.closeDispatchModal());
        this.elements.btnDispatchSave.addEventListener('click', () => this.saveDispatchPermission());

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

    switchTab(tab) {
        if (this.currentTab === tab) return;

        this.currentTab = tab;

        this.elements.tabUnits.classList.toggle('active', tab === 'units');
        this.elements.tabDispatch.classList.toggle('active', tab === 'dispatch');

        this.elements.tabContentUnits.style.display = tab === 'units' ? 'flex' : 'none';
        this.elements.tabContentDispatch.style.display = tab === 'dispatch' ? 'flex' : 'none';

        if (tab === 'units') {
            this.loadUnits(false);
            WpAnimation.moveAndFadeIn(this.elements.tabContentUnits, 'right', 20, 400, 0);
        } else {
            this.loadDispatchPermissions(false);
            WpAnimation.moveAndFadeIn(this.elements.tabContentDispatch, 'right', 20, 400, 0);
        }
    }

    async loadUnits(skipAnimation = false, resetPage = false) {
        console.log('[OrganizationController] 开始加载单位列表，skipAnimation=', skipAnimation, 'resetPage=', resetPage);
        try {
            this.units = await OrganizationTools.loadUnits();
            console.log('[OrganizationController] 单位列表加载完成，共', this.units.length, '条记录');
            console.log('[OrganizationController] 单位列表前5条:', this.units.slice(0, 5));
            
            this.filteredUnits = [...this.units];
            this.updateLevel1Filter();
            
            // 如果重置分页，回到第一页
            if (resetPage) {
                console.log('[OrganizationController] 重置分页到第一页');
                this.unitsPage = 1;
            }
            
            console.log('[OrganizationController] 当前分页:', this.unitsPage);
            this.renderUnitsTable(skipAnimation);
            console.log('[OrganizationController] 单位列表渲染完成');
        } catch (error) {
            console.error('[OrganizationController] 加载单位列表出错:', error);
        }
    }

    updateLevel1Filter() {
        const level1Units = [...new Set(this.units.map(u => u['一级']).filter(Boolean))];
        const currentValue = this.elements.filterLevel1.value;
        
        this.elements.filterLevel1.innerHTML = '<option value="">全部一级单位</option>';
        level1Units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            this.elements.filterLevel1.appendChild(option);
        });
        
        if (level1Units.includes(currentValue)) {
            this.elements.filterLevel1.value = currentValue;
        }
    }

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

    getUnitFullName(unit) {
        const parts = [];
        if (unit['一级']) parts.push(unit['一级']);
        if (unit['二级']) parts.push(unit['二级']);
        if (unit['三级']) parts.push(unit['三级']);
        return parts.join(' / ');
    }

    renderUnitsTable(skipAnimation = false) {
        console.log('[OrganizationController] 渲染单位表格，skipAnimation=', skipAnimation);
        console.log('[OrganizationController] filteredUnits长度:', this.filteredUnits.length);
        console.log('[OrganizationController] unitsPage:', this.unitsPage, 'unitsPageSize:', this.unitsPageSize);
        
        const startIndex = (this.unitsPage - 1) * this.unitsPageSize;
        const endIndex = startIndex + this.unitsPageSize;
        const pageData = this.filteredUnits.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredUnits.length / this.unitsPageSize) || 1;

        console.log('[OrganizationController] 分页数据: startIndex=', startIndex, 'endIndex=', endIndex, 'pageData长度=', pageData.length, 'totalPages=', totalPages);

        if (pageData.length === 0) {
            console.log('[OrganizationController] 分页数据为空，显示空状态');
            this.elements.unitsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-building text-4xl mb-3 text-gray-300"></i>
                            <p>暂无单位数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.elements.unitsPaginationInfo.textContent = '共 0 条记录';
            this.elements.unitsPaginationControls.innerHTML = '';
            return;
        }

        this.elements.unitsTableBody.innerHTML = pageData.map(unit => `
            <tr style="opacity: ${skipAnimation ? '0' : '1'};">
                <td class="font-medium text-gray-800">${unit['一级'] || '-'}</td>
                <td>${unit['二级'] || '-'}</td>
                <td>${unit['三级'] || '-'}</td>
                <td class="text-center">
                    <button class="wp-icon-btn text-blue-500 hover:bg-blue-50" onclick="window.workplace.controllers.organization.editUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="wp-icon-btn text-red-500 hover:bg-red-50" onclick="window.workplace.controllers.organization.deleteUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        this.elements.unitsPaginationInfo.textContent = `共 ${this.filteredUnits.length} 条记录，第 ${this.unitsPage}/${totalPages} 页`;
        this.renderUnitsPaginationControls(totalPages);

        if (!skipAnimation && this.currentTab === 'units') {
            this.animateTableRows('#units-table-body tr');
        }
    }

    renderUnitsPaginationControls(totalPages) {
        const controls = this.elements.unitsPaginationControls;
        if (!controls) return;

        let html = '';
        const prevDisabled = this.unitsPage === 1 ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${prevDisabled} onclick="window.workplace.controllers.organization.goToUnitsPage(${this.unitsPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

        const maxButtons = 5;
        let startPage = Math.max(1, this.unitsPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.organization.goToUnitsPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="wp-page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.unitsPage ? 'active' : '';
            html += `<button class="wp-page-btn ${activeClass}" onclick="window.workplace.controllers.organization.goToUnitsPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="wp-page-ellipsis">...</span>`;
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.organization.goToUnitsPage(${totalPages})">${totalPages}</button>`;
        }

        const nextDisabled = this.unitsPage === totalPages ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${nextDisabled} onclick="window.workplace.controllers.organization.goToUnitsPage(${this.unitsPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

        controls.innerHTML = html;
    }

    goToUnitsPage(pageNum) {
        const totalPages = Math.ceil(this.filteredUnits.length / this.unitsPageSize);
        if (pageNum < 1 || pageNum > totalPages || pageNum === this.unitsPage) return;
        this.unitsPage = pageNum;
        this.renderUnitsTable();
    }

    onUnitsPageSizeChange() {
        if (this.elements.unitsPageSizeSelect) {
            this.unitsPageSize = parseInt(this.elements.unitsPageSizeSelect.value);
            this.unitsPage = 1;
            this.renderUnitsTable();
        }
    }

    openUnitModal(unit = null) {
        if (unit) {
            this.elements.unitModalTitle.textContent = '编辑单位';
            this.elements.unitId.value = this.getUnitFullName(unit);
            this.elements.inputUnitLevel1.value = unit['一级'] || '';
            this.elements.inputUnitLevel2.value = unit['二级'] || '';
            this.elements.inputUnitLevel3.value = unit['三级'] || '';
        } else {
            this.elements.unitModalTitle.textContent = '新增单位';
            this.elements.unitId.value = '';
            this.elements.inputUnitLevel1.value = '';
            this.elements.inputUnitLevel2.value = '';
            this.elements.inputUnitLevel3.value = '';
        }

        this.elements.unitModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.unitModal.querySelector('.wp-modal-container'));
    }

    closeUnitModal() {
        if (!this.elements.unitModal.classList.contains('hidden')) {
            WpAnimation.popOut(this.elements.unitModal.querySelector('.wp-modal-container')).then(() => {
                this.elements.unitModal.classList.add('hidden');
            });
        }
    }

    editUnit(fullName) {
        const unit = this.units.find(u => this.getUnitFullName(u) === fullName);
        if (unit) {
            this.openUnitModal(unit);
        }
    }

    async saveUnit() {
        const level1 = this.elements.inputUnitLevel1.value.trim();
        const level2 = this.elements.inputUnitLevel2.value.trim();
        const level3 = this.elements.inputUnitLevel3.value.trim();

        console.log('[OrganizationController] 表单值:', { level1, level2, level3 });

        if (!level1) {
            alert('一级单位不能为空');
            return;
        }

        // 构建单位全称：一级 / 二级 / 三级
        // 根据实际业务逻辑：如果有三级单位，必须有二级单位
        let fullName = level1;
        if (level2) {
            fullName += ' / ' + level2;
            if (level3) {
                fullName += ' / ' + level3;
            }
        }
        // 注意：如果只有一级单位，fullName就是level1
        
        console.log('[OrganizationController] 构建的单位全称:', fullName);

        const isEdit = this.elements.unitId.value !== '';
        const order = isEdit ? 'update_unit' : 'create_unit';

        // 发送给后端的参数
        const args = { level1, level2, level3 };
        
        // 如果是编辑，需要传递旧的单位全称作为full_name参数
        // 如果是创建，需要传递新的单位全称作为full_name参数
        if (isEdit) {
            // 编辑时：full_name是旧的单位全称（用于定位要更新的单位）
            args.full_name = this.elements.unitId.value;
            console.log('[OrganizationController] 编辑模式: old_full_name=', this.elements.unitId.value, 'new_fullName=', fullName);
        } else {
            // 创建时：full_name是新的单位全称
            args.full_name = fullName;
            console.log('[OrganizationController] 创建模式: full_name=', fullName);
        }

        console.log('[OrganizationController] 保存单位参数:', { order, args });
        const result = await OrganizationTools.saveUnit(order, args);
        console.log('[OrganizationController] 保存单位结果:', result);

        if (result.success) {
            this.closeUnitModal();
            await this.loadUnits();
            if(window.workplace) window.workplace.showNotification(isEdit ? '单位更新成功' : '单位创建成功', 'bottom', 3000);
        } else {
            alert('保存失败: ' + result.error);
        }
    }

    deleteUnit(fullName) {
        this.deleteType = 'unit';
        this.deleteId = fullName;
        this.elements.deleteModalMessage.textContent = `确定要删除单位 "${fullName}" 吗？此操作不可恢复。`;
        this.elements.deleteModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.deleteModal.querySelector('.wp-modal-container'));
    }

    async loadDispatchPermissions(skipAnimation = false, resetPage = false) {
        console.log('[OrganizationController] 开始加载下发权限列表');
        this.dispatchPermissions = await OrganizationTools.loadDispatchPermissions();
        console.log('[OrganizationController] 下发权限列表加载完成，共', this.dispatchPermissions.length, '条记录');
        this.filteredDispatchPermissions = [...this.dispatchPermissions];
        
        // 如果重置分页，回到第一页
        if (resetPage) {
            this.dispatchPage = 1;
        }
        
        this.renderDispatchTable(skipAnimation);
        console.log('[OrganizationController] 下发权限列表渲染完成');
    }

    filterDispatchPermissions() {
        const searchTerm = this.elements.dispatchSearchInput.value.toLowerCase();
        this.filteredDispatchPermissions = this.dispatchPermissions.filter(perm => {
            // 兼容中文字段名和英文字段名
            const unitFullName = (perm['单位全称'] || perm.unit_full_name || '').toLowerCase();
            return !searchTerm || unitFullName.includes(searchTerm);
        });
        this.dispatchPage = 1;
        this.renderDispatchTable();
    }

    renderDispatchTable(skipAnimation = false) {
        const startIndex = (this.dispatchPage - 1) * this.dispatchPageSize;
        const endIndex = startIndex + this.dispatchPageSize;
        const pageData = this.filteredDispatchPermissions.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredDispatchPermissions.length / this.dispatchPageSize) || 1;

        if (pageData.length === 0) {
            this.elements.dispatchTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-paper-plane text-4xl mb-3 text-gray-300"></i>
                            <p>暂无下发权限数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.elements.dispatchPaginationInfo.textContent = '共 0 条记录';
            this.elements.dispatchPaginationControls.innerHTML = '';
            return;
        }

        this.elements.dispatchTableBody.innerHTML = pageData.map(perm => {
            // 兼容中文字段名和英文字段名
            const unitFullName = perm['单位全称'] || perm.unit_full_name || '';
            const dispatchScope = perm['下发范围'] || perm.dispatch_scope || '[]';
            const permId = perm['序号'] || perm.id;
            
            let scopeDisplay = '';
            try {
                const scopeArray = JSON.parse(dispatchScope);
                if (scopeArray.includes('ALLDEPARTMENT')) {
                    scopeDisplay = '<span class="wp-badge success">所有单位</span>';
                } else {
                    scopeDisplay = `<div class="max-h-20 overflow-y-auto wp-scrollbar pr-2 flex flex-wrap gap-1">
                        ${scopeArray.map(s => `<span class="wp-badge info">${s}</span>`).join('')}
                    </div>`;
                }
            } catch (e) {
                scopeDisplay = dispatchScope;
            }

            return `
                <tr style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td class="font-medium text-gray-800">${unitFullName}</td>
                    <td>${scopeDisplay}</td>
                    <td class="text-center">
                        <button class="wp-icon-btn text-blue-500 hover:bg-blue-50" onclick="window.workplace.controllers.organization.editDispatchPermission(${permId})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="wp-icon-btn text-red-500 hover:bg-red-50" onclick="window.workplace.controllers.organization.deleteDispatchPermission(${permId})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.elements.dispatchPaginationInfo.textContent = `共 ${this.filteredDispatchPermissions.length} 条记录，第 ${this.dispatchPage}/${totalPages} 页`;
        this.renderDispatchPaginationControls(totalPages);

        if (!skipAnimation && this.currentTab === 'dispatch') {
            this.animateTableRows('#dispatch-table-body tr');
        }
    }

    renderDispatchPaginationControls(totalPages) {
        const controls = this.elements.dispatchPaginationControls;
        if (!controls) return;

        let html = '';
        const prevDisabled = this.dispatchPage === 1 ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${prevDisabled} onclick="window.workplace.controllers.organization.goToDispatchPage(${this.dispatchPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

        const maxButtons = 5;
        let startPage = Math.max(1, this.dispatchPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.organization.goToDispatchPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="wp-page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.dispatchPage ? 'active' : '';
            html += `<button class="wp-page-btn ${activeClass}" onclick="window.workplace.controllers.organization.goToDispatchPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="wp-page-ellipsis">...</span>`;
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.organization.goToDispatchPage(${totalPages})">${totalPages}</button>`;
        }

        const nextDisabled = this.dispatchPage === totalPages ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${nextDisabled} onclick="window.workplace.controllers.organization.goToDispatchPage(${this.dispatchPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

        controls.innerHTML = html;
    }

    goToDispatchPage(pageNum) {
        const totalPages = Math.ceil(this.filteredDispatchPermissions.length / this.dispatchPageSize);
        if (pageNum < 1 || pageNum > totalPages || pageNum === this.dispatchPage) return;
        this.dispatchPage = pageNum;
        this.renderDispatchTable();
    }

    onDispatchPageSizeChange() {
        if (this.elements.dispatchPageSizeSelect) {
            this.dispatchPageSize = parseInt(this.elements.dispatchPageSizeSelect.value);
            this.dispatchPage = 1;
            this.renderDispatchTable();
        }
    }

    showUnitDropdown() {
        this.renderUnitDropdown(this.units);
        this.elements.dispatchUnitDropdown.classList.remove('hidden');
    }

    hideUnitDropdown() {
        this.elements.dispatchUnitDropdown.classList.add('hidden');
    }

    filterUnitDropdown() {
        const searchTerm = this.elements.inputDispatchUnitSearch.value.toLowerCase();
        const filtered = this.units.filter(unit => {
            const fullName = this.getUnitFullName(unit).toLowerCase();
            return fullName.includes(searchTerm);
        });
        this.renderUnitDropdown(filtered);
        this.elements.dispatchUnitDropdown.classList.remove('hidden');
    }

    renderUnitDropdown(units) {
        if (units.length === 0) {
            this.elements.dispatchUnitDropdown.innerHTML = '<div class="px-4 py-2 text-gray-500">无匹配单位</div>';
            return;
        }

        this.elements.dispatchUnitDropdown.innerHTML = units.map(unit => `
            <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer" onclick="window.workplace.controllers.organization.selectUnit('${this.getUnitFullName(unit).replace(/'/g, "\\'")}')">
                <div class="font-medium text-gray-800">${this.getUnitFullName(unit)}</div>
            </div>
        `).join('');
    }

    selectUnit(fullName) {
        this.elements.inputDispatchUnit.value = fullName;
        this.elements.inputDispatchUnitSearch.value = fullName;
        this.hideUnitDropdown();
    }

    filterUnitsCheckboxList() {
        const searchTerm = this.elements.inputUnitsFilter.value.toLowerCase();
        const labels = this.elements.unitsCheckboxList.querySelectorAll('label');

        labels.forEach(label => {
            const text = label.textContent.toLowerCase();
            const match = text.includes(searchTerm);
            label.style.display = match ? 'flex' : 'none';
        });
    }

    openDispatchModal(perm = null) {
        this.elements.unitsCheckboxList.innerHTML = '';
        this.units.forEach(unit => {
            const fullName = this.getUnitFullName(unit);
            const label = document.createElement('label');
            label.className = 'flex items-center wp-checkbox mb-2';
            label.innerHTML = `
                <input type="checkbox" value="${fullName}" class="unit-checkbox checkbox-input">
                <span class="wp-checkbox-label">${fullName}</span>
            `;
            const checkbox = label.querySelector('input');
            checkbox.addEventListener('change', () => this.updateSelectedUnitsList());
            this.elements.unitsCheckboxList.appendChild(label);
        });

        this.elements.inputDispatchUnitSearch.value = '';
        this.elements.inputDispatchUnit.value = '';
        
        const allRadio = this.container.querySelector('input[name="dispatch-scope-type"][value="all"]');
        allRadio.checked = true;
        this.onScopeTypeChange();

        if (perm) {
            this.elements.dispatchModalTitle.textContent = '编辑下发权限';
            // 兼容中文字段名和英文字段名
            this.elements.dispatchPermissionId.value = perm['序号'] || perm.id;
            const unitFullName = perm['单位全称'] || perm.unit_full_name || '';
            this.elements.inputDispatchUnitSearch.value = unitFullName;
            this.elements.inputDispatchUnit.value = unitFullName;

            try {
                const dispatchScope = perm['下发范围'] || perm.dispatch_scope || '[]';
                const scopeArray = JSON.parse(dispatchScope);
                if (scopeArray.includes('ALLDEPARTMENT')) {
                    allRadio.checked = true;
                } else {
                    const specificRadio = this.container.querySelector('input[name="dispatch-scope-type"][value="specific"]');
                    specificRadio.checked = true;
                    
                    const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox');
                    checkboxes.forEach(cb => {
                        if (scopeArray.includes(cb.value)) {
                            cb.checked = true;
                        }
                    });
                }
                this.onScopeTypeChange();
                this.updateSelectedUnitsList();
            } catch (e) {
                console.error('解析 dispatch_scope 失败', e);
            }
        } else {
            this.elements.dispatchModalTitle.textContent = '新增下发权限';
            this.elements.dispatchPermissionId.value = '';
            this.updateSelectedUnitsList();
        }

        this.elements.dispatchModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.dispatchModal.querySelector('.wp-modal-container'));
    }

    closeDispatchModal() {
        if (!this.elements.dispatchModal.classList.contains('hidden')) {
            WpAnimation.popOut(this.elements.dispatchModal.querySelector('.wp-modal-container')).then(() => {
                this.elements.dispatchModal.classList.add('hidden');
            });
        }
    }

    onScopeTypeChange() {
        const scopeType = this.container.querySelector('input[name="dispatch-scope-type"]:checked').value;
        if (scopeType === 'specific') {
            this.elements.specificUnitsContainer.classList.remove('hidden');
        } else {
            this.elements.specificUnitsContainer.classList.add('hidden');
        }
    }

    updateSelectedUnitsList() {
        const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox:checked');
        const selectedCount = checkboxes.length;
        this.elements.selectedUnitsCount.textContent = selectedCount;

        if (selectedCount === 0) {
            this.elements.selectedUnitsList.innerHTML = '<div class="text-gray-500 text-sm py-2">暂无已选单位</div>';
            return;
        }

        let html = '';
        checkboxes.forEach(cb => {
            html += `
                <div class="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm mb-2">
                    <span class="text-sm text-gray-700 truncate mr-2">${cb.value}</span>
                    <button class="text-red-500 hover:text-red-700 focus:outline-none" onclick="window.workplace.controllers.organization.removeSelectedUnit('${cb.value}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        this.elements.selectedUnitsList.innerHTML = html;
    }

    removeSelectedUnit(value) {
        const checkbox = this.elements.unitsCheckboxList.querySelector(`.unit-checkbox[value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
            this.updateSelectedUnitsList();
        }
    }

    clearSelectedUnits() {
        const checkboxes = this.elements.unitsCheckboxList.querySelectorAll('.unit-checkbox:checked');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateSelectedUnitsList();
    }

    editDispatchPermission(id) {
        const perm = this.dispatchPermissions.find(p => (p['序号'] || p.id) == id);
        if (perm) {
            this.openDispatchModal(perm);
        }
    }

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
            unit_name: unitFullName,  // 后端期望的参数名是unit_name，不是unit_full_name
            dispatch_scope: JSON.stringify(dispatchScope)
        };
        if (id) args.id = parseInt(id);

        console.log('[OrganizationController] 保存下发权限参数:', { order, args });
        const result = await OrganizationTools.saveDispatchPermission(order, args);
        console.log('[OrganizationController] 保存下发权限结果:', result);

        if (result.success) {
            this.closeDispatchModal();
            await this.loadDispatchPermissions();
            if(window.workplace) window.workplace.showNotification(id ? '下发权限更新成功' : '下发权限创建成功', 'bottom', 3000);
        } else {
            alert('保存失败: ' + result.error);
        }
    }

    deleteDispatchPermission(id) {
        this.deleteType = 'dispatch';
        this.deleteId = id;
        this.elements.deleteModalMessage.textContent = '确定要删除这个下发权限吗？此操作不可恢复。';
        this.elements.deleteModal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.deleteModal.querySelector('.wp-modal-container'));
    }

    closeDeleteModal() {
        if (!this.elements.deleteModal.classList.contains('hidden')) {
            this.deleteType = null;
            this.deleteId = null;
            WpAnimation.popOut(this.elements.deleteModal.querySelector('.wp-modal-container')).then(() => {
                this.elements.deleteModal.classList.add('hidden');
            });
        }
    }

    async confirmDelete() {
        console.log('[OrganizationController] 确认删除:', this.deleteType, this.deleteId);
        if (!this.deleteType || !this.deleteId) {
            this.closeDeleteModal();
            return;
        }

        let result;
        if (this.deleteType === 'unit') {
            console.log('[OrganizationController] 删除单位:', this.deleteId);
            result = await OrganizationTools.deleteUnit(this.deleteId);
        } else {
            console.log('[OrganizationController] 删除下发权限:', this.deleteId);
            result = await OrganizationTools.deleteDispatchPermission(this.deleteId);
        }

        console.log('[OrganizationController] 删除结果:', result);
        if (result.success) {
            // 先保存deleteType，因为closeDeleteModal会重置它
            const deleteType = this.deleteType;
            
            this.closeDeleteModal();
            
            if (deleteType === 'unit') {
                console.log('[OrganizationController] 删除单位成功，重新加载单位列表，deleteType=', deleteType);
                // 删除后重置分页到第一页
                await this.loadUnits(false, true);
                console.log('[OrganizationController] 单位列表重新加载完成');
            } else {
                console.log('[OrganizationController] 删除下发权限成功，重新加载下发权限列表，deleteType=', deleteType);
                // 删除后重置分页到第一页
                await this.loadDispatchPermissions(false, true);
            }
            if(window.workplace) window.workplace.showNotification('删除成功', 'bottom', 3000);
        } else {
            alert('删除失败: ' + result.error);
        }
    }

    closeAllModals() {
        this.closeUnitModal();
        this.closeDispatchModal();
        this.closeDeleteModal();
    }
}

window.OrganizationController = OrganizationController;
