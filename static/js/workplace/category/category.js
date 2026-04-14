/**
 * 分类管理控制器
 */

class CategoryController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;

        this.categories = [];
        this.filteredCategories = [];
        
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;
        
        this.deleteId = null;
        this.level1Options = new Set();

        this.elements = {};
    }

    async init(container) {
        this.container = container;
        console.log('[CategoryController] 初始化分类管理页面');

        this.container.innerHTML = CategoryHtml.generateHTML();

        this.hideAllElements();
        this.getElements();
        this.bindEvents();

        await this.loadCategories(true);

        this.isInitialized = true;
        console.log('[CategoryController] 分类管理页面初始化完成');
    }

    hideAllElements() {
        const selectors = [
            '#category-header',
            '.search-filter-panel',
            '#category-table-body tr',
            '#category-pagination'
        ];

        selectors.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.opacity = '0';
            });
        });
    }

    async show() {
        console.log('[CategoryController] 页面显示');
        this.ensureElementsVisible();

        if (!this.animationPlayed) {
            await this.loadCategories(true);
            await this.playEntranceAnimation();
            this.animationPlayed = true;
        } else {
            await this.loadCategories(false);
        }
    }

    hide() {
        console.log('[CategoryController] 页面隐藏');
        this.closeModal();
        this.closeDeleteModal();
    }

    ensureElementsVisible() {
        const selectors = [
            '#category-header',
            '.search-filter-panel',
            '#category-table-body tr',
            '#category-pagination'
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
        const header = this.container.querySelector('#category-header');
        const searchPanel = this.container.querySelector('.search-filter-panel');
        const tableRows = this.container.querySelectorAll('#category-table-body tr');
        const pagination = this.container.querySelector('#category-pagination');

        if (header) await WpAnimation.moveAndFadeIn(header, 'down', 30, 800, 0);
        if (searchPanel) await WpAnimation.moveAndFadeIn(searchPanel, 'down', 20, 600, 0);
        if (pagination) await WpAnimation.moveAndFadeIn(pagination, 'down', 15, 500, 0);

        if (tableRows.length > 0) {
            await WpAnimation.moveAndFadeIn(tableRows, 'left', 30, 500, 50);
        }
    }

    async animateTableRows() {
        const rows = this.container.querySelectorAll('#category-table-body tr');
        if (rows.length > 0) {
            rows.forEach(row => row.style.opacity = '0');
            await WpAnimation.moveAndFadeIn(rows, 'left', 30, 500, 50);
        }
    }

    getElements() {
        this.elements = {
            searchInput: this.container.querySelector('#search-input'),
            filterLevel1: this.container.querySelector('#filter-level1'),
            btnAdd: this.container.querySelector('#btn-add-category'),
            tableBody: this.container.querySelector('#category-table-body'),
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),

            modal: this.container.querySelector('#category-modal'),
            modalTitle: this.container.querySelector('#modal-title'),
            categoryId: this.container.querySelector('#category-id'),
            inputLevel1: this.container.querySelector('#input-level1'),
            inputLevel2: this.container.querySelector('#input-level2'),
            inputLevel3: this.container.querySelector('#input-level3'),
            btnCancel: this.container.querySelector('#btn-cancel'),
            btnCancelIcon: this.container.querySelector('#btn-cancel-icon'),
            btnSave: this.container.querySelector('#btn-save'),

            deleteModal: this.container.querySelector('#delete-modal'),
            btnCancelDelete: this.container.querySelector('#btn-cancel-delete'),
            btnConfirmDelete: this.container.querySelector('#btn-confirm-delete')
        };
    }

    bindEvents() {
        this.elements.searchInput.addEventListener('input', () => this.filterCategories());
        this.elements.filterLevel1.addEventListener('change', () => this.filterCategories());
        this.elements.btnAdd.addEventListener('click', () => this.openModal());

        this.elements.btnCancel.addEventListener('click', () => this.closeModal());
        this.elements.btnCancelIcon.addEventListener('click', () => this.closeModal());
        this.elements.btnSave.addEventListener('click', () => this.saveCategory());

        this.elements.btnCancelDelete.addEventListener('click', () => this.closeDeleteModal());
        this.elements.btnConfirmDelete.addEventListener('click', () => this.confirmDelete());

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

    async loadCategories(skipAnimation = false) {
        this.categories = await CategoryTools.loadCategories();
        this.filteredCategories = [...this.categories];
        this.updateLevel1Filter();
        this.renderTable(skipAnimation);
    }

    updateLevel1Filter() {
        this.level1Options.clear();
        this.categories.forEach(cat => {
            if (cat['一级分类']) this.level1Options.add(cat['一级分类']);
        });

        const currentValue = this.elements.filterLevel1.value;
        this.elements.filterLevel1.innerHTML = '<option value="">全部一级分类</option>';
        
        Array.from(this.level1Options).sort().forEach(level1 => {
            const option = document.createElement('option');
            option.value = level1;
            option.textContent = level1;
            this.elements.filterLevel1.appendChild(option);
        });

        if (this.level1Options.has(currentValue)) {
            this.elements.filterLevel1.value = currentValue;
        }
    }

    filterCategories() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const level1Filter = this.elements.filterLevel1.value;

        this.filteredCategories = this.categories.filter(cat => {
            const matchSearch = !searchTerm || 
                (cat['一级分类'] && cat['一级分类'].toLowerCase().includes(searchTerm)) ||
                (cat['二级分类'] && cat['二级分类'].toLowerCase().includes(searchTerm)) ||
                (cat['三级分类'] && cat['三级分类'].toLowerCase().includes(searchTerm));
                
            const matchLevel1 = !level1Filter || cat['一级分类'] === level1Filter;

            return matchSearch && matchLevel1;
        });

        this.currentPage = 1;
        this.renderTable();
    }

    renderTable(skipAnimation = false) {
        this.totalCount = this.filteredCategories.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredCategories.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-tags text-4xl mb-3 text-gray-300"></i>
                            <p>暂无分类数据</p>
                        </div>
                    </td>
                </tr>
            `;
            this.elements.paginationInfo.textContent = '共 0 条记录';
            this.elements.paginationControls.innerHTML = '';
            return;
        }

        this.elements.tableBody.innerHTML = pageData.map((cat, index) => `
            <tr style="opacity: ${skipAnimation ? '0' : '1'};">
                <td>${startIndex + index + 1}</td>
                <td class="font-medium text-gray-800">${cat['一级分类'] || '-'}</td>
                <td>${cat['二级分类'] || '-'}</td>
                <td>${cat['三级分类'] || '-'}</td>
                <td class="text-center">
                    <button class="wp-icon-btn text-blue-500 hover:bg-blue-50" onclick="window.workplace.controllers.category.editCategory(${cat['序号']})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="wp-icon-btn text-red-500 hover:bg-red-50" onclick="window.workplace.controllers.category.deleteCategory(${cat['序号']})" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

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
        html += `<button class="wp-page-btn" ${prevDisabled} onclick="window.workplace.controllers.category.goToPage(${this.currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.category.goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="wp-page-ellipsis">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            html += `<button class="wp-page-btn ${activeClass}" onclick="window.workplace.controllers.category.goToPage(${i})">${i}</button>`;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += `<span class="wp-page-ellipsis">...</span>`;
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.category.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        html += `<button class="wp-page-btn" ${nextDisabled} onclick="window.workplace.controllers.category.goToPage(${this.currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

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

    openModal(cat = null) {
        if (cat) {
            this.elements.modalTitle.textContent = '编辑分类';
            this.elements.categoryId.value = cat['序号'];
            this.elements.inputLevel1.value = cat['一级分类'] || '';
            this.elements.inputLevel2.value = cat['二级分类'] || '';
            this.elements.inputLevel3.value = cat['三级分类'] || '';
        } else {
            this.elements.modalTitle.textContent = '新增分类';
            this.elements.categoryId.value = '';
            this.elements.inputLevel1.value = '';
            this.elements.inputLevel2.value = '';
            this.elements.inputLevel3.value = '';
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

    editCategory(id) {
        const cat = this.categories.find(c => c.id === id);
        if (cat) {
            this.openModal(cat);
        }
    }

    async saveCategory() {
        const id = this.elements.categoryId.value;
        const level1 = this.elements.inputLevel1.value.trim();
        const level2 = this.elements.inputLevel2.value.trim();
        const level3 = this.elements.inputLevel3.value.trim();

        if (!level1 || !level2 || !level3) {
            alert('一、二、三级分类都必须填写');
            return;
        }

        const order = id ? 'category_update' : 'category_create';
        const args = { level1, level2, level3 };
        if (id) args.id = parseInt(id);

        const result = await CategoryTools.saveCategory(order, args);

        if (result.success) {
            this.closeModal();
            await this.loadCategories();
            if(window.workplace) window.workplace.showNotification(id ? '更新成功' : '创建成功', 'bottom', 3000);
        } else {
            alert('保存失败: ' + result.error);
        }
    }

    deleteCategory(id) {
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

        const result = await CategoryTools.deleteCategory(this.deleteId);

        if (result.success) {
            this.closeDeleteModal();
            await this.loadCategories();
            if(window.workplace) window.workplace.showNotification('删除成功', 'bottom', 3000);
        } else {
            alert('删除失败: ' + result.error);
        }
    }
}

window.CategoryController = CategoryController;
