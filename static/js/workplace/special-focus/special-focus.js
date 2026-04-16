/**
 * 专项关注管理控制器
 */

class SpecialFocusController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;

        this.specialFocusList = [];
        this.filteredList = [];
        
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;
        
        this.deleteId = null;

        this.elements = {};
        
        // 动画和数据状态
        this.initialAnimationPlayed = false;
        this.needRefresh = true;
        this.animationAborted = false;  // 动画中断标志
    }

    async init(container) {
        this.container = container;
        console.log('[SpecialFocusController] 初始化专项关注管理页面');

        this.container.innerHTML = SpecialFocusHtml.generateHTML();

        this.hideAllElements();
        this.getElements();
        this.bindEvents();

        await this.loadSpecialFocusList(true);

        this.isInitialized = true;
        console.log('[SpecialFocusController] 专项关注页面初始化完成');
    }

    hideAllElements() {
        const selectors = [
            '#special-focus-header',
            '.search-filter-panel',
            '#special-focus-table-body tr',
            '#special-focus-pagination'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });
    }

    async show() {
        console.log('[SpecialFocusController] 页面显示');
        this.ensureElementsVisible();
        
        // 异步加载数据（不阻塞页面切换）
        this.loadSpecialFocusList().catch(err => {
            console.error('[SpecialFocusController] 加载专项关注列表失败:', err);
        });
    }

    /**
     * 停止所有动画
     * 当页面切换时立即调用，确保动画不会阻塞页面切换
     */
    stopAnimation() {
        console.log('[SpecialFocusController] 停止动画');
        // 立即停止所有 WpAnimation 动画
        if (typeof WpAnimation !== 'undefined' && typeof WpAnimation.stopAll === 'function') {
            WpAnimation.stopAll();
        }
        // 立即重置所有元素到可见状态
        this.ensureElementsVisible();
    }

    hide() {
        console.log('[SpecialFocusController] 页面隐藏');
        this.closeModal();
        this.closeDeleteModal();
    }

    ensureElementsVisible() {
        const selectors = [
            '#special-focus-header',
            '.search-filter-panel',
            '#special-focus-table-body tr',
            '#special-focus-pagination'
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
        const header = this.container.querySelector('#special-focus-header');
        const searchPanel = this.container.querySelector('.search-filter-panel');
        const tableRows = this.container.querySelectorAll('#special-focus-table-body tr');
        const pagination = this.container.querySelector('#special-focus-pagination');

        if (header) await WpAnimation.moveAndFadeIn(header, 'down', 30, 800, 0);
        if (searchPanel) await WpAnimation.moveAndFadeIn(searchPanel, 'down', 20, 600, 0);
        if (pagination) await WpAnimation.moveAndFadeIn(pagination, 'down', 15, 500, 0);

        if (tableRows.length > 0) {
            await WpAnimation.moveAndFadeIn(tableRows, 'left', 30, 500, 50);
        }
    }

    async animateTableRows() {
        const rows = this.container.querySelectorAll('#special-focus-table-body tr');
        if (rows.length > 0) {
            rows.forEach(row => row.style.opacity = '0');
            await WpAnimation.moveAndFadeIn(rows, 'left', 30, 500, 50);
        }
    }

    getElements() {
        this.elements = {
            searchInput: this.container.querySelector('#search-input'),
            btnAdd: this.container.querySelector('#btn-add-special-focus'),
            tableBody: this.container.querySelector('#special-focus-table-body'),
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),

            modal: this.container.querySelector('#special-focus-modal'),
            modalTitle: this.container.querySelector('#modal-title'),
            specialFocusId: this.container.querySelector('#special-focus-id'),
            inputTitle: this.container.querySelector('#input-title'),
            inputDescription: this.container.querySelector('#input-description'),
            btnCancel: this.container.querySelector('#btn-cancel'),
            btnCancelIcon: this.container.querySelector('#btn-cancel-icon'),
            btnSave: this.container.querySelector('#btn-save'),

            deleteModal: this.container.querySelector('#delete-modal'),
            btnCancelDelete: this.container.querySelector('#btn-cancel-delete'),
            btnConfirmDelete: this.container.querySelector('#btn-confirm-delete')
        };
    }

    bindEvents() {
        this.elements.searchInput.addEventListener('input', () => this.filterSpecialFocus());
        this.elements.btnAdd.addEventListener('click', () => this.openModal());

        this.elements.btnCancel.addEventListener('click', () => this.closeModal());
        this.elements.btnCancelIcon.addEventListener('click', () => this.closeModal());
        this.elements.btnSave.addEventListener('click', () => this.saveSpecialFocus());

        this.elements.btnCancelDelete.addEventListener('click', () => this.closeDeleteModal());
        this.elements.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());

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
    }

    async loadSpecialFocusList(skipAnimation = false) {
        this.specialFocusList = await SpecialFocusTools.loadSpecialFocusList();
        this.filteredList = [...this.specialFocusList];
        this.renderTable(skipAnimation);
    }

    filterSpecialFocus() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        this.filteredList = this.specialFocusList.filter(item => {
            return !searchTerm ||
                   item['专项关注标题'].toLowerCase().includes(searchTerm) ||
                   (item['描述'] && item['描述'].toLowerCase().includes(searchTerm));
        });
        this.currentPage = 1;
        this.renderTable();
    }

    renderTable(skipAnimation = false) {
        this.totalCount = this.filteredList.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredList.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-star text-4xl mb-3 text-gray-300"></i>
                            <p>暂无专项关注数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.elements.paginationInfo.textContent = '共 0 条记录';
            this.elements.paginationControls.innerHTML = '';
            return;
        }

        this.elements.tableBody.innerHTML = pageData.map((item, index) => {
            const dateStr = item['创建时间'] ? new Date(item['创建时间']).toLocaleString() : '-';
            return `
                <tr style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td>${startIndex + index + 1}</td>
                    <td class="font-medium text-gray-800">${item['专项关注标题']}</td>
                    <td class="truncate max-w-md" title="${item['描述'] || ''}">${item['描述'] || '-'}</td>
                    <td><span class="text-sm text-gray-500">${dateStr}</span></td>
                    <td class="text-center">
                        <button class="wp-icon-btn text-blue-500 hover:bg-blue-50" onclick="window.workplace.controllers['special-focus'].editSpecialFocus(${item['序号']})" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="wp-icon-btn text-red-500 hover:bg-red-50" onclick="window.workplace.controllers['special-focus'].deleteSpecialFocus(${item['序号']})" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.elements.paginationInfo.textContent = `共 ${this.totalCount} 条记录，第 ${this.currentPage}/${this.totalPages} 页`;
        this.renderPaginationControls();

        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    renderPaginationControls() {
        const controls = this.elements.paginationControls;
        if (!controls) return;

        let html = '';
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${prevDisabled} onclick="window.workplace.controllers['special-focus'].goToPage(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers['special-focus'].goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="wp-page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            html += `<button class="wp-page-btn ${activeClass}" onclick="window.workplace.controllers['special-focus'].goToPage(${i})">${i}</button>`;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += `<span class="wp-page-ellipsis">...</span>`;
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers['special-focus'].goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${nextDisabled} onclick="window.workplace.controllers['special-focus'].goToPage(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

        controls.innerHTML = html;
    }

    goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
        this.currentPage = pageNum;
        this.renderTable();
    }

    onPageSizeChange() {
        if (this.elements.pageSizeSelect) {
            this.pageSize = parseInt(this.elements.pageSizeSelect.value);
            this.currentPage = 1;
            this.renderTable();
        }
    }

    openModal(item = null) {
        if (item) {
            this.elements.modalTitle.textContent = '编辑专项关注';
            this.elements.specialFocusId.value = item['序号'];
            this.elements.inputTitle.value = item['专项关注标题'];
            this.elements.inputDescription.value = item['描述'] || '';
        } else {
            this.elements.modalTitle.textContent = '新增专项关注';
            this.elements.specialFocusId.value = '';
            this.elements.inputTitle.value = '';
            this.elements.inputDescription.value = '';
        }

        this.elements.modal.classList.remove('hidden');
        WpAnimation.popIn(this.elements.modal.querySelector('.wp-modal-container'));
    }

    closeModal() {
        if (!this.elements.modal.classList.contains('hidden')) {
            WpAnimation.popOut(this.elements.modal.querySelector('.wp-modal-container')).then(() => {
                this.elements.modal.classList.add('hidden');
            });
        }
    }

    editSpecialFocus(id) {
        const item = this.specialFocusList.find(i => i.id === id);
        if (item) {
            this.openModal(item);
        }
    }

    async saveSpecialFocus() {
        const id = this.elements.specialFocusId.value;
        const title = this.elements.inputTitle.value.trim();
        const description = this.elements.inputDescription.value.trim();

        if (!title) {
            alert('专项关注标题不能为空');
            return;
        }

        const order = id ? 'update_special_focus' : 'create_special_focus';
        const args = { title, description };
        if (id) args.id = parseInt(id);

        const result = await SpecialFocusTools.saveSpecialFocus(order, args);

        if (result.success) {
            this.closeModal();
            await this.loadSpecialFocusList();
            if(window.workplace) window.workplace.showNotification(id ? '更新成功' : '创建成功', 'bottom', 3000);
        } else {
            alert('保存失败: ' + result.error);
        }
    }

    deleteSpecialFocus(id) {
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

        const result = await SpecialFocusTools.deleteSpecialFocus(this.deleteId);

        if (result.success) {
            this.closeDeleteModal();
            await this.loadSpecialFocusList();
            if(window.workplace) window.workplace.showNotification('删除成功', 'bottom', 3000);
        } else {
            alert('删除失败: ' + result.error);
        }
    }
}

window.SpecialFocusController = SpecialFocusController;
