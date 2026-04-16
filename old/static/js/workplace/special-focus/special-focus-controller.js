/**
 * 专项关注管理控制器
 *
 * 负责专项关注管理页面的初始化、数据加载、增删改查操作
 * 使用 anime.js 实现入场动画和交互动画
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
 */

class SpecialFocusController {
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
        this.specialFocusList = [];
        this.filteredList = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;
        this.deleteId = null;
        this.needRefresh = true;  // 初始需要刷新

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
            '.special-focus-header',
            '.search-filter-panel',
            '#special-focus-table-body tr',
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
        console.log('[SpecialFocusController] 初始化专项关注管理页面');

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

        // 第4步：加载数据（首次进入时跳过动画，等待入场动画）
        await this.loadSpecialFocusList(true);

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
                '.special-focus-header',
                '.search-filter-panel',
                '#special-focus-table-body tr',
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
        console.log('[SpecialFocusController] 页面显示');

        // 确保所有元素可见
        this.ensureElementsVisible();

        // 页面切换时跳过动画
        // 只有在数据过期或需要刷新时才重新加载
        if (this.needRefresh || !this.specialFocusList || this.specialFocusList.length === 0) {
            await this.loadSpecialFocusList(true);  // skipAnimation = true
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
        console.log('[SpecialFocusController] 页面隐藏');
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
        console.log('[SpecialFocusController] 刷新数据');
        if (!this.isInitialized) return;

        await this.loadSpecialFocusList();
    }

    /**
     * 获取 DOM 元素引用
     */
    getElements() {
        this.elements = {
            // 搜索和按钮
            searchInput: this.container.querySelector('#search-input'),
            btnAdd: this.container.querySelector('#btn-add-special-focus'),

            // 表格
            tableBody: this.container.querySelector('#special-focus-table-body'),

            // 分页
            paginationInfo: this.container.querySelector('#pagination-info'),
            paginationControls: this.container.querySelector('#pagination-controls'),
            pageSizeSelect: this.container.querySelector('#page-size-select'),

            // 弹窗
            modal: this.container.querySelector('#special-focus-modal'),
            modalTitle: this.container.querySelector('#modal-title'),
            specialFocusId: this.container.querySelector('#special-focus-id'),
            inputTitle: this.container.querySelector('#input-title'),
            inputDescription: this.container.querySelector('#input-description'),
            btnCancel: this.container.querySelector('#btn-cancel'),
            btnSave: this.container.querySelector('#btn-save'),

            // 删除弹窗
            deleteModal: this.container.querySelector('#delete-modal'),
            btnCancelDelete: this.container.querySelector('#btn-cancel-delete'),
            btnConfirmDelete: this.container.querySelector('#btn-confirm-delete'),

            // 动画元素
            header: this.container.querySelector('.special-focus-header'),
            searchPanel: this.container.querySelector('.search-filter-panel'),
            tableRows: () => this.container.querySelectorAll('#special-focus-table-body tr'),
            paginationPanel: this.container.querySelector('.pagination-panel')
        };
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        // 搜索输入
        this.elements.searchInput.addEventListener('input', () => {
            this.filterSpecialFocus();
        });

        // 新增按钮
        this.elements.btnAdd.addEventListener('click', () => {
            this.openModal();
        });

        // 弹窗按钮
        this.elements.btnCancel.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.btnSave.addEventListener('click', () => {
            this.saveSpecialFocus();
        });

        // 删除弹窗按钮
        this.elements.btnCancelDelete.addEventListener('click', () => {
            this.closeDeleteModal();
        });

        this.elements.btnConfirmDelete.addEventListener('click', () => {
            this.confirmDelete();
        });

        // 点击弹窗外部关闭
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });

        this.elements.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.elements.deleteModal) {
                this.closeDeleteModal();
            }
        });

        // 每页数量选择
        if (this.elements.pageSizeSelect) {
            this.elements.pageSizeSelect.addEventListener('change', () => {
                this.onPageSizeChange();
            });
        }
    }

    /**
     * 隐藏表格行（防止动画前闪烁）
     */
    hideTableRows() {
        const rows = this.container.querySelectorAll('#special-focus-table-body tr');
        rows.forEach(row => {
            row.style.opacity = '0';
        });
    }

    /**
     * 确保所有元素可见
     */
    ensureElementsVisible() {
        const elements = [
            this.elements.header,
            this.elements.searchPanel,
            this.elements.paginationPanel
        ];

        elements.forEach(el => {
            if (el) {
                el.style.opacity = '1';
                el.style.transform = 'none';
            }
        });
    }

    /**
     * 播放入场动画
     *
     * @returns {Promise} 动画完成后的 Promise
     */
    async playEntranceAnimation() {
        return new Promise((resolve) => {
            const tl = anime.timeline({
                easing: 'easeOutCubic',
                complete: () => {
                    this.animationCompleted = true;
                    this.currentAnimation = null;
                    resolve();
                }
            });

            // 保存动画实例
            this.currentAnimation = tl;

            // 1. 标题栏动画
            tl.add({
                targets: this.container.querySelectorAll('.special-focus-header'),
                opacity: [0, 1],
                translateY: [-20, 0],
                duration: 600
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
            // 4. 表格行动画（同时从左向右划入）
            .add({
                targets: this.container.querySelectorAll('#special-focus-table-body tr'),
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 500
            }, '-=300');
        });
    }

    /**
     * 加载专项关注列表
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    async loadSpecialFocusList(skipAnimation = false) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_special_focus_list',
                    args: {
                        limit: this.pageSize,
                        page: this.currentPage
                    }
                })
            });
            const result = await response.json();

            if (result.success) {
                this.specialFocusList = result.data || [];
                this.filteredList = [...this.specialFocusList];
                this.totalCount = result.total || 0;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
                this.renderTable(skipAnimation);
                this.renderPagination();
            } else {
                console.error('[SpecialFocusController] 加载专项关注列表失败:', result.error);
            }
        } catch (error) {
            console.error('[SpecialFocusController] 加载专项关注列表出错:', error);
        }
    }

    /**
     * 筛选专项关注
     */
    filterSpecialFocus() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();

        this.filteredList = this.specialFocusList.filter(item => {
            const title = (item.专项关注标题 || '').toLowerCase();
            const description = (item.描述 || '').toLowerCase();
            return title.includes(searchTerm) || description.includes(searchTerm);
        });

        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
    }

    /**
     * 渲染表格
     * @param {boolean} skipAnimation - 是否跳过动画（首次进入页面时由入场动画控制）
     */
    renderTable(skipAnimation = false) {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.filteredList.slice(start, end);

        if (pageData.length === 0) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2"></i>
                        <p>暂无数据</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.elements.tableBody.innerHTML = pageData.map(item => `
            <tr class="hover:bg-gray-50 transition" data-id="${item.序号}" style="opacity: ${skipAnimation ? '0' : '1'};">
                <td class="px-6 py-4 text-sm text-gray-900">${item.序号}</td>
                <td class="px-6 py-4 text-sm text-gray-900 font-medium">${this.escapeHtml(item.专项关注标题)}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${this.escapeHtml(item.描述 || '-')}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(item.创建时间)}</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-blue-600 hover:text-blue-800 mr-3 transition" onclick="specialFocusController.editSpecialFocus(${item.序号})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-800 transition" onclick="specialFocusController.deleteSpecialFocus(${item.序号})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // 只有非首次进入页面时才立即执行动画
        if (!skipAnimation) {
            anime({
                targets: this.elements.tableRows(),
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 400,
                easing: 'easeOutCubic'
            });
        }
    }

    /**
     * 渲染分页
     */
    renderPagination() {
        const total = this.filteredList.length;
        this.totalPages = Math.ceil(total / this.pageSize) || 1;

        this.elements.paginationInfo.textContent = `共 ${total} 条记录`;

        let html = '';

        // 上一页
        html += `
            <button class="px-3 py-1 rounded-lg border ${this.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    ${this.currentPage === 1 ? 'disabled' : ''} onclick="specialFocusController.goToPage(${this.currentPage - 1})">
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
            html += `<button class="px-3 py-1 rounded-lg border bg-white text-gray-700 hover:bg-gray-50" onclick="specialFocusController.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="px-2 text-gray-400">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="px-3 py-1 rounded-lg border ${i === this.currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                        onclick="specialFocusController.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += `<span class="px-2 text-gray-400">...</span>`;
            }
            html += `<button class="px-3 py-1 rounded-lg border bg-white text-gray-700 hover:bg-gray-50" onclick="specialFocusController.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        // 下一页
        html += `
            <button class="px-3 py-1 rounded-lg border ${this.currentPage === this.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                    ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="specialFocusController.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        this.elements.paginationControls.innerHTML = html;
    }

    /**
     * 跳转到指定页
     */
    async goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        await this.loadSpecialFocusList();
    }

    /**
     * 跳转到上一页
     */
    async goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadSpecialFocusList();
        }
    }

    /**
     * 跳转到下一页
     */
    async goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadSpecialFocusList();
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
            await this.loadSpecialFocusList();
        }
    }

    /**
     * 打开弹窗
     */
    openModal(item = null) {
        if (item) {
            this.elements.modalTitle.textContent = '编辑专项关注';
            this.elements.specialFocusId.value = item.序号;
            this.elements.inputTitle.value = item.专项关注标题 || '';
            this.elements.inputDescription.value = item.描述 || '';
        } else {
            this.elements.modalTitle.textContent = '新增专项关注';
            this.elements.specialFocusId.value = '';
            this.elements.inputTitle.value = '';
            this.elements.inputDescription.value = '';
        }

        this.elements.modal.classList.remove('hidden');
        this.elements.modal.classList.add('flex');

        // 弹窗动画
        anime({
            targets: this.elements.modal.querySelector('.bg-white'),
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 300,
            easing: 'easeOutCubic'
        });
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        anime({
            targets: this.elements.modal.querySelector('.bg-white'),
            opacity: [1, 0],
            scale: [1, 0.9],
            duration: 200,
            easing: 'easeInCubic',
            complete: () => {
                this.elements.modal.classList.add('hidden');
                this.elements.modal.classList.remove('flex');
            }
        });
    }

    /**
     * 保存专项关注
     */
    async saveSpecialFocus() {
        const id = this.elements.specialFocusId.value;
        const title = this.elements.inputTitle.value.trim();
        const description = this.elements.inputDescription.value.trim();

        if (!title) {
            alert('请输入专项关注标题');
            return;
        }

        try {
            const order = id ? 'update_special_focus' : 'create_special_focus';
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: order,
                    args: {
                        id: id ? parseInt(id) : undefined,
                        title: title,
                        description: description
                    }
                })
            });
            const result = await response.json();

            if (result.success) {
                this.closeModal();
                await this.loadSpecialFocusList();
            } else {
                alert(result.error || '保存失败');
            }
        } catch (error) {
            console.error('[SpecialFocusController] 保存专项关注出错:', error);
            alert('保存失败，请稍后重试');
        }
    }

    /**
     * 编辑专项关注
     */
    editSpecialFocus(id) {
        const item = this.specialFocusList.find(s => s.序号 === id);
        if (item) {
            this.openModal(item);
        }
    }

    /**
     * 删除专项关注
     */
    deleteSpecialFocus(id) {
        this.deleteId = id;
        this.elements.deleteModal.classList.remove('hidden');
        this.elements.deleteModal.classList.add('flex');

        // 弹窗动画
        anime({
            targets: this.elements.deleteModal.querySelector('.bg-white'),
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 300,
            easing: 'easeOutCubic'
        });
    }

    /**
     * 关闭删除弹窗
     */
    closeDeleteModal() {
        anime({
            targets: this.elements.deleteModal.querySelector('.bg-white'),
            opacity: [1, 0],
            scale: [1, 0.9],
            duration: 200,
            easing: 'easeInCubic',
            complete: () => {
                this.elements.deleteModal.classList.add('hidden');
                this.elements.deleteModal.classList.remove('flex');
                this.deleteId = null;
            }
        });
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
                    order: 'delete_special_focus',
                    args: {
                        id: this.deleteId
                    }
                })
            });
            const result = await response.json();

            if (result.success) {
                this.closeDeleteModal();
                await this.loadSpecialFocusList();
            } else {
                alert(result.error || '删除失败');
            }
        } catch (error) {
            console.error('[SpecialFocusController] 删除专项关注出错:', error);
            alert('删除失败，请稍后重试');
        }
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 格式化日期
     */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 创建全局实例
const specialFocusController = new SpecialFocusController();
