/**
 * 分类管理控制器
 *
 * 负责分类管理页面的初始化、数据加载、增删改查操作
 * 使用 anime.js 实现入场动画和交互动画
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
 */

class CategoryController {
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
        this.categories = [];
        this.filteredCategories = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;
        this.deleteId = null;
        this.level1Options = new Set();

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
            '.category-header',
            '.search-filter-panel',
            '#category-table-body tr',
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
        console.log('[CategoryController] 初始化分类管理页面');

        // 第1步：先隐藏所有元素，防止闪烁
        this.hideAllElements();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第2步：获取 DOM 元素
        this.getElements();

        // 第3步：绑定事件
        this.bindEvents();

        // 检查是否被中断
        if (this.initAborted) return;

        // 第4步：加载分类数据（首次进入时跳过动画，等待入场动画）
        await this.loadCategories(true);

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
    }

    /**
     * 隐藏所有元素（初始化前调用，防止闪烁）
     */
    hideAllElements() {
        if (this.container) {
            const selectors = [
                '.category-header',
                '.search-filter-panel',
                '#category-table-body tr',
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
        console.log('[CategoryController] 页面显示');

        // 确保所有元素可见
        this.ensureElementsVisible();

        // 重新加载数据并执行表格动画
        await this.loadCategories();
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[CategoryController] 页面隐藏');
        // 关闭可能打开的弹窗
        if (this.elements.modal) {
            this.closeModal();
        }
        if (this.elements.deleteModal) {
            this.closeDeleteModal();
        }
    }

    /**
     * 刷新数据
     *
     * 再次打开页面时调用，只刷新数据，不执行动画
     */
    async refresh() {
        console.log('[CategoryController] 刷新数据');
        if (!this.isInitialized) return;

        await this.loadCategories();
    }

    /**
     * 确保所有元素可见（用于非首次访问）
     */
    ensureElementsVisible() {
        const selectors = [
            '.category-header',
            '.search-filter-panel',
            '#category-table-body tr',
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
        const header = this.container.querySelector('.category-header');
        const searchPanel = this.container.querySelector('.search-filter-panel');
        const tableRows = this.container.querySelectorAll('#category-table-body tr');
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
                targets: this.container.querySelectorAll('.category-header'),
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
                targets: this.container.querySelectorAll('#category-table-body tr'),
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
        this.elements = {
            tableBody: this.container.querySelector('#category-table-body'),
            searchInput: this.container.querySelector('#search-input'),
            filterLevel1: this.container.querySelector('#filter-level1'),
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),
            btnAdd: this.container.querySelector('#btn-add-category')
        };

        this.elements.modal = document.querySelector('#category-modal');
        this.elements.modalTitle = document.querySelector('#modal-title');
        this.elements.categoryId = document.querySelector('#category-id');
        this.elements.inputLevel1 = document.querySelector('#input-level1');
        this.elements.inputLevel2 = document.querySelector('#input-level2');
        this.elements.inputLevel3 = document.querySelector('#input-level3');
        this.elements.btnSave = document.querySelector('#btn-save');
        this.elements.btnCancel = document.querySelector('#btn-cancel');
        this.elements.deleteModal = document.querySelector('#delete-modal');
        this.elements.btnCancelDelete = document.querySelector('#btn-cancel-delete');
        this.elements.btnConfirmDelete = document.querySelector('#btn-confirm-delete');
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => {
                this.filterCategories();
            });
        }

        if (this.elements.filterLevel1) {
            this.elements.filterLevel1.addEventListener('change', () => {
                this.filterCategories();
            });
        }

        if (this.elements.btnAdd) {
            this.elements.btnAdd.addEventListener('click', () => {
                this.openModal();
            });
        }

        if (this.elements.btnSave) {
            this.elements.btnSave.addEventListener('click', () => {
                this.saveCategory();
            });
        }

        if (this.elements.btnCancel) {
            this.elements.btnCancel.addEventListener('click', () => {
                this.closeModal();
            });
        }

        if (this.elements.btnCancelDelete) {
            this.elements.btnCancelDelete.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        if (this.elements.btnConfirmDelete) {
            this.elements.btnConfirmDelete.addEventListener('click', () => {
                this.confirmDelete();
            });
        }

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

        // 每页数量选择
        if (this.elements.pageSizeSelect) {
            this.elements.pageSizeSelect.addEventListener('change', () => {
                this.onPageSizeChange();
            });
        }
    }

    /**
     * 加载分类数据
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    async loadCategories(skipAnimation = false) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'category_list',
                    args: {
                        limit: this.pageSize,
                        page: this.currentPage
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.categories = data.data;
                this.filteredCategories = [...this.categories];
                this.totalCount = data.total || 0;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
                this.updateLevel1Filter();
                this.renderTable(skipAnimation);
                this.renderPagination();
            } else {
                console.error('[CategoryController] 加载分类失败:', data.error);
                alert('加载分类数据失败: ' + data.error);
            }
        } catch (error) {
            console.error('[CategoryController] 加载分类出错:', error);
            alert('加载分类数据出错');
        }
    }

    /**
     * 更新一级分类筛选选项
     */
    updateLevel1Filter() {
        this.level1Options.clear();
        this.categories.forEach(cat => {
            this.level1Options.add(cat.一级分类);
        });

        const currentValue = this.elements.filterLevel1.value;
        this.elements.filterLevel1.innerHTML = '<option value="">全部一级分类</option>';

        this.level1Options.forEach(level1 => {
            const option = document.createElement('option');
            option.value = level1;
            option.textContent = level1;
            this.elements.filterLevel1.appendChild(option);
        });

        this.elements.filterLevel1.value = currentValue;
    }

    /**
     * 筛选分类
     */
    filterCategories() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const level1Filter = this.elements.filterLevel1.value;

        this.filteredCategories = this.categories.filter(cat => {
            const matchSearch = !searchTerm ||
                cat.一级分类.toLowerCase().includes(searchTerm) ||
                cat.二级分类.toLowerCase().includes(searchTerm) ||
                cat.三级分类.toLowerCase().includes(searchTerm);

            const matchLevel1 = !level1Filter || cat.一级分类 === level1Filter;

            return matchSearch && matchLevel1;
        });

        this.currentPage = 1;
        this.renderTable();
    }

    /**
     * 渲染表格
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    renderTable(skipAnimation = false) {
        const pageData = this.filteredCategories;

        if (pageData.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-3"></i>
                        <p>暂无数据</p>
                    </td>
                </tr>
            `;
        } else {
            this.elements.tableBody.innerHTML = pageData.map(cat => `
                <tr class="hover:bg-gray-50 transition" style="opacity: ${skipAnimation ? '0' : '1'};">
                    <td class="px-6 py-4 text-sm text-gray-600">${cat.序号}</td>
                    <td class="px-6 py-4 text-sm text-gray-800 font-medium">${cat.一级分类}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${cat.二级分类}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${cat.三级分类}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-blue-600 hover:text-blue-800 mx-1" onclick="window.workplaceController.controllers.category.editCategory(${cat.序号})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-800 mx-1" onclick="window.workplaceController.controllers.category.deleteCategory(${cat.序号})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        this.renderPagination();

        // 执行表格行动画（同时从左向右划入）
        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    /**
     * 动画化表格行（同时从左向右划入）
     */
    animateTableRows() {
        const rows = this.container.querySelectorAll('#category-table-body tr');
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
                        onclick="window.workplaceController.controllers.category.goToPrevPage()" 
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
                html += `<button class="page-number" onclick="window.workplaceController.controllers.category.goToPage(1)">1</button>`;
                if (startPage > 2) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                html += `
                    <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                            onclick="window.workplaceController.controllers.category.goToPage(${i})">
                        ${i}
                    </button>
                `;
            }

            if (endPage < this.totalPages) {
                if (endPage < this.totalPages - 1) {
                    html += `<span class="page-ellipsis">...</span>`;
                }
                html += `<button class="page-number" onclick="window.workplaceController.controllers.category.goToPage(${this.totalPages})">${this.totalPages}</button>`;
            }

            // 下一页按钮
            html += `
                <button class="page-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                        onclick="window.workplaceController.controllers.category.goToNextPage()" 
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
        await this.loadCategories();
    }

    /**
     * 跳转到上一页
     */
    async goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadCategories();
        }
    }

    /**
     * 跳转到下一页
     */
    async goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadCategories();
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
            await this.loadCategories();
        }
    }

    /**
     * 打开新增/编辑弹窗
     */
    openModal(category = null) {
        if (category) {
            this.elements.modalTitle.textContent = '编辑分类';
            this.elements.categoryId.value = category.序号;
            this.elements.inputLevel1.value = category.一级分类;
            this.elements.inputLevel2.value = category.二级分类;
            this.elements.inputLevel3.value = category.三级分类;
        } else {
            this.elements.modalTitle.textContent = '新增分类';
            this.elements.categoryId.value = '';
            this.elements.inputLevel1.value = '';
            this.elements.inputLevel2.value = '';
            this.elements.inputLevel3.value = '';
        }

        this.elements.modal.classList.remove('hidden');
        this.elements.modal.classList.add('flex');

        anime({
            targets: '#category-modal > div',
            opacity: [0, 1],
            scale: [0.9, 1],
            translateY: [20, 0],
            duration: 400,
            easing: 'easeOutExpo'
        });
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.elements.modal.classList.remove('flex');
    }

    /**
     * 编辑分类
     */
    editCategory(id) {
        const category = this.categories.find(c => c.序号 === id);
        if (category) {
            this.openModal(category);
        }
    }

    /**
     * 保存分类
     */
    async saveCategory() {
        const id = this.elements.categoryId.value;
        const level1 = this.elements.inputLevel1.value.trim();
        const level2 = this.elements.inputLevel2.value.trim();
        const level3 = this.elements.inputLevel3.value.trim();

        if (!level1 || !level2 || !level3) {
            alert('请填写完整的分类信息');
            return;
        }

        try {
            const order = id ? 'category_update' : 'category_create';
            const args = {
                一级分类: level1,
                二级分类: level2,
                三级分类: level3
            };

            if (id) {
                args.id = parseInt(id);
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
                await this.loadCategories();
                alert(id ? '分类更新成功' : '分类创建成功');
            } else {
                alert('保存失败: ' + data.error);
            }
        } catch (error) {
            console.error('[CategoryController] 保存分类出错:', error);
            alert('保存分类出错');
        }
    }

    /**
     * 删除分类
     */
    deleteCategory(id) {
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

        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'category_delete',
                    args: { id: this.deleteId }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.closeDeleteModal();
                await this.loadCategories();
                alert('分类删除成功');
            } else {
                alert('删除失败: ' + data.error);
            }
        } catch (error) {
            console.error('[CategoryController] 删除分类出错:', error);
            alert('删除分类出错');
        }
    }
}

// 导出控制器类到全局
window.CategoryController = CategoryController;
