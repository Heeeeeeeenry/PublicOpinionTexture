/**
 * 信件页面控制器
 *
 * 负责信件列表的显示、搜索、筛选和分页功能
 * 使用通用动画库 WpAnimation 实现动画效果
 * 使用通用样式类
 */

class LettersController {
    /**
     * 构造函数
     */
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;

        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;

        this.filters = {
            '信件一级分类': '',
            '信件二级分类': '',
            '信件三级分类': '',
            '信件状态': '',
            '搜索关键字': ''
        };

        this.categoryData = {};
        this.elements = {};
    }

    /**
     * 初始化页面
     */
    async init(container) {
        this.container = container;
        console.log('[LettersController] 初始化信件页面');

        this.container.innerHTML = LettersTools.generateHTML();

        this.hideAllElements();

        this.getElements();

        this.bindEvents();

        this.categoryData = await LettersTools.loadCategories();
        this.initCategorySelectors();

        // 首次加载数据在 show() 中执行，避免重复请求

        this.isInitialized = true;
        console.log('[LettersController] 信件页面初始化完成');
    }

    /**
     * 隐藏所有元素
     */
    hideAllElements() {
        const selectors = [
            '#letters-header',
            '#letters-filter-panel',
            '#letters-list-body tr',
            '#letters-pagination'
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
        console.log('[LettersController] 页面显示');
        this.ensureElementsVisible();

        // 每次显示页面时加载最新数据
        if (!this.animationPlayed) {
            // 首次加载，执行入场动画
            await this.loadLetters(true);
            await this.playEntranceAnimation();
            this.animationPlayed = true;
        } else {
            // 非首次加载，只刷新数据
            await this.loadLetters();
        }
    }

    /**
     * 隐藏页面
     */
    hide() {
        console.log('[LettersController] 页面隐藏');
    }

    /**
     * 刷新数据
     */
    async refresh() {
        console.log('[LettersController] 刷新数据');
        if (!this.isInitialized) return;
        await this.loadLetters();
    }

    /**
     * 确保所有元素可见
     */
    ensureElementsVisible() {
        const selectors = [
            '#letters-header',
            '#letters-filter-panel',
            '#letters-list-body tr',
            '#letters-pagination'
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
     * 使用通用动画库 WpAnimation
     */
    async playEntranceAnimation() {
        const header = this.container.querySelector('#letters-header');
        const filterPanel = this.container.querySelector('#letters-filter-panel');
        const tableRows = this.container.querySelectorAll('#letters-list-body tr');
        const pagination = this.container.querySelector('#letters-pagination');

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
        const rows = this.container.querySelectorAll('#letters-list-body tr');
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
            level1Select: document.getElementById('letters-filter-level1'),
            level2Select: document.getElementById('letters-filter-level2'),
            level3Select: document.getElementById('letters-filter-level3'),
            searchInput: document.getElementById('letters-search-input'),
            statusFilters: document.getElementById('letters-status-filters'),
            listBody: document.getElementById('letters-list-body'),
            emptyState: document.getElementById('letters-empty-state'),
            totalCount: document.getElementById('letters-total-count'),
            paginationInfo: document.getElementById('pagination-info'),
            paginationControls: document.getElementById('pagination-controls'),
            pageSizeSelect: document.getElementById('page-size-select')
        };
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        if (this.elements.statusFilters) {
            const buttons = this.elements.statusFilters.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    this.filters['信件状态'] = btn.dataset.status;
                    this.currentPage = 1;
                    this.loadLetters();
                });
            });
        }

        if (this.elements.searchInput) {
            let debounceTimer;
            this.elements.searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchLetters();
                }, 500);
            });

            this.elements.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(debounceTimer);
                    this.searchLetters();
                }
            });
        }
    }

    /**
     * 初始化分类选择器
     */
    initCategorySelectors() {
        if (!this.elements.level1Select) return;

        this.elements.level1Select.innerHTML = '<option value="">全部</option>';
        this.elements.level2Select.innerHTML = '<option value="">全部</option>';
        this.elements.level3Select.innerHTML = '<option value="">全部</option>';

        Object.keys(this.categoryData).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.elements.level1Select.appendChild(option);
        });
    }

    /**
     * 分类选择变化处理
     */
    onCategoryChange(level) {
        const level1Select = this.elements.level1Select;
        const level2Select = this.elements.level2Select;
        const level3Select = this.elements.level3Select;

        if (level === 1) {
            const selectedLevel1 = level1Select.value;
            this.filters['信件一级分类'] = selectedLevel1;
            this.filters['信件二级分类'] = '';
            this.filters['信件三级分类'] = '';

            level2Select.innerHTML = '<option value="">全部</option>';
            level3Select.innerHTML = '<option value="">全部</option>';

            if (selectedLevel1 && this.categoryData[selectedLevel1]) {
                Object.keys(this.categoryData[selectedLevel1]).forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    level2Select.appendChild(option);
                });
            }
        } else if (level === 2) {
            const selectedLevel1 = level1Select.value;
            const selectedLevel2 = level2Select.value;
            this.filters['信件二级分类'] = selectedLevel2;
            this.filters['信件三级分类'] = '';

            level3Select.innerHTML = '<option value="">全部</option>';

            if (selectedLevel1 && selectedLevel2 &&
                this.categoryData[selectedLevel1] &&
                this.categoryData[selectedLevel1][selectedLevel2]) {
                this.categoryData[selectedLevel1][selectedLevel2].forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    level3Select.appendChild(option);
                });
            }
        } else if (level === 3) {
            this.filters['信件三级分类'] = level3Select.value;
        }

        this.currentPage = 1;
        this.loadLetters();
    }

    /**
     * 执行搜索
     */
    searchLetters() {
        if (this.elements.searchInput) {
            this.filters['搜索关键字'] = this.elements.searchInput.value.trim();
            this.currentPage = 1;
            this.loadLetters();
        }
    }

    /**
     * 每页显示数量变化处理
     */
    onPageSizeChange() {
        if (this.elements.pageSizeSelect) {
            this.pageSize = parseInt(this.elements.pageSizeSelect.value);
            this.currentPage = 1;
            this.loadLetters();
        }
    }

    /**
     * 加载信件列表
     */
    async loadLetters(skipAnimation = false) {
        const args = {
            'limit': this.pageSize,
            'page': this.currentPage,
            'order_by': '来信时间',
            'order_desc': true
        };

        if (this.filters['信件一级分类']) {
            args['信件一级分类'] = this.filters['信件一级分类'];
        }
        if (this.filters['信件二级分类']) {
            args['信件二级分类'] = this.filters['信件二级分类'];
        }
        if (this.filters['信件三级分类']) {
            args['信件三级分类'] = this.filters['信件三级分类'];
        }
        if (this.filters['信件状态']) {
            args['信件状态'] = this.filters['信件状态'];
        }
        if (this.filters['搜索关键字']) {
            args['搜索关键字'] = this.filters['搜索关键字'];
        }

        const result = await LettersTools.loadLetters(args);

        this.totalCount = result.total;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;

        this.renderLetters(result.data, skipAnimation);
        this.updatePagination();
    }

    /**
     * 渲染信件列表
     */
    renderLetters(letters, skipAnimation = false) {
        if (!this.elements.listBody) return;

        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = this.totalCount;
        }

        if (letters.length === 0) {
            this.showEmptyState();
            return;
        }

        if (this.elements.emptyState) {
            this.elements.emptyState.classList.add('hidden');
        }

        const searchKeyword = this.filters['搜索关键字'];

        this.elements.listBody.innerHTML = letters.map(letter => 
            LettersTools.generateLetterRow(letter, searchKeyword)
        ).join('');

        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        if (this.elements.listBody) {
            this.elements.listBody.innerHTML = '';
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.remove('hidden');
        }
        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = '0';
        }
    }

    /**
     * 更新分页显示
     */
    updatePagination() {
        if (this.elements.paginationInfo) {
            this.elements.paginationInfo.textContent = `共 ${this.totalCount} 条记录，第 ${this.currentPage}/${this.totalPages} 页`;
        }
        if (this.elements.paginationControls) {
            this.elements.paginationControls.innerHTML = LettersTools.generatePaginationHTML(
                this.currentPage, 
                this.totalPages
            );
        }
    }

    /**
     * 跳转到指定页
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadLetters();
    }

    /**
     * 上一页
     */
    goToPrevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadLetters();
        }
    }

    /**
     * 下一页
     */
    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadLetters();
        }
    }

    /**
     * 查看信件详情
     */
    async viewLetterDetail(letterNumber) {
        const letterData = await LettersTools.loadLetterDetail(letterNumber);

        if (letterData) {
            this.showLetterDetailModal(letterData);
        }
    }

    /**
     * 显示信件详情弹窗
     */
    showLetterDetailModal(letterData) {
        const modal = this.container.querySelector('#letter-detail-modal');
        const container = modal.querySelector('.letter-detail-container');

        this.fillBasicInfo(letterData);
        this.fillFlowRecords(letterData['流转记录'] || []);
        this.fillAttachmentFiles(letterData['信件编号']);

        modal.classList.remove('hidden');

        WpAnimation.fadeIn(modal, 300, 0);
        WpAnimation.moveAndFadeIn(container, 'down', 20, 400, 0);

        const closeBtn = modal.querySelector('#btn-close-detail');
        closeBtn.onclick = () => this.closeLetterDetailModal();

        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeLetterDetailModal();
            }
        };

        this.bindTabSwitchEvents();
        this.bindEditableInputs();

        this.switchTab('basic');
    }

    /**
     * 关闭信件详情弹窗
     */
    async closeLetterDetailModal() {
        const modal = this.container.querySelector('#letter-detail-modal');
        const container = modal.querySelector('.letter-detail-container');

        await WpAnimation.moveAndFadeOut(container, 'up', 20, 300, 0);
        await WpAnimation.fadeOut(modal, 200, 0);

        modal.classList.add('hidden');
    }

    /**
     * 填充基本信息
     */
    fillBasicInfo(letterData) {
        this.setTextContent('detail-letter-number', letterData['信件编号']);
        this.setTextContent('detail-name', letterData['群众姓名']);
        this.setTextContent('detail-phone', letterData['手机号'] || '-');
        this.setTextContent('detail-idcard', letterData['身份证号'] || '-');
        this.setTextContent('detail-time', letterData['来信时间']);
        this.setTextContent('detail-channel', letterData['来信渠道']);
        this.setTextContent('detail-level1', letterData['信件一级分类']);
        this.setTextContent('detail-level2', letterData['信件二级分类']);
        this.setTextContent('detail-level3', letterData['信件三级分类']);
        this.setTextContent('detail-content', letterData['诉求内容']);
        this.setTextContent('detail-status', letterData['当前信件状态'] || '-');
        this.setTextContent('detail-unit', letterData['当前信件处理单位'] || '-');

        const specialFocusContainer = this.container.querySelector('#detail-special-focus');
        if (specialFocusContainer) {
            let tags = letterData['专项关注标签'] || [];
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    tags = [];
                }
            }
            if (!Array.isArray(tags)) {
                tags = [];
            }
            if (tags.length > 0) {
                specialFocusContainer.innerHTML = tags.map(tag =>
                    `<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">${tag}</span>`
                ).join('');
            } else {
                specialFocusContainer.innerHTML = '<span class="text-sm text-gray-400">无</span>';
            }
        }
    }

    /**
     * 填充流转记录
     */
    fillFlowRecords(flowRecords) {
        const container = this.container.querySelector('#detail-flow-list');
        if (container) {
            container.innerHTML = LettersTools.generateFlowRecordsHTML(flowRecords);
        }
    }

    /**
     * 填充附件列表
     */
    async fillAttachmentFiles(letterNumber) {
        const container = this.container.querySelector('#detail-files-list');
        if (!container) return;

        container.innerHTML = '<div class="wp-empty-state"><i class="fas fa-spinner fa-spin text-2xl mb-3"></i><p>加载中...</p></div>';

        const filesData = await LettersTools.loadAttachmentFiles(letterNumber);
        container.innerHTML = LettersTools.generateFilesHTML(filesData);
    }

    /**
     * 设置文本内容
     */
    setTextContent(elementId, text) {
        const element = this.container.querySelector(`#${elementId}`);
        if (element) {
            const value = text || '-';
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.value = value;
            } else {
                element.textContent = value;
            }
        }
    }

    /**
     * 绑定标签页切换事件
     */
    bindTabSwitchEvents() {
        const tabBtns = this.container.querySelectorAll('.wp-tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            };
        });
    }

    /**
     * 切换标签页
     */
    async switchTab(tabName) {
        const tabBtns = this.container.querySelectorAll('.wp-tab-btn');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const tabContents = this.container.querySelectorAll('.wp-tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = this.container.querySelector(`#tab-${tabName}`);
        if (targetContent) {
            targetContent.classList.add('active');
            await WpAnimation.fadeIn(targetContent, 300, 0);
        }
    }

    /**
     * 绑定可编辑输入框的点击事件
     */
    bindEditableInputs() {
        const editableInputs = this.container.querySelectorAll('.wp-editable-field');

        editableInputs.forEach(input => {
            input.addEventListener('mouseenter', () => {
                if (input.readOnly) {
                    input.style.background = '#eff6ff';
                }
            });

            input.addEventListener('mouseleave', () => {
                if (input.readOnly) {
                    input.style.background = 'transparent';
                }
            });

            input.addEventListener('click', function(e) {
                e.stopPropagation();
                this.readOnly = false;
                this.focus();
                this.style.background = '#eff6ff';
            });

            input.addEventListener('blur', function() {
                this.readOnly = true;
                this.style.background = 'transparent';
            });

            input.addEventListener('keydown', function(e) {
                if (this.tagName === 'TEXTAREA') {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        this.blur();
                    }
                } else {
                    if (e.key === 'Enter') {
                        this.blur();
                    }
                }
            });
        });
    }
}

window.LettersController = LettersController;
