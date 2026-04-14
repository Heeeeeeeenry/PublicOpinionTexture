/**
 * 所有信件页面控制器
 *
 * 负责信件列表的显示、搜索、筛选和分页功能
 * 使用 anime.js 实现入场动画和交互动画
 *
 * 接口规范：
 * - init(container): 首次初始化页面
 * - show(): 显示页面（再次打开时调用）
 * - hide(): 隐藏页面
 * - refresh(): 刷新数据
 */

class LettersController {
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

        // 分页状态
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalCount = 0;
        this.totalPages = 1;

        // 筛选状态
        this.filters = {
            '信件一级分类': '',
            '信件二级分类': '',
            '信件三级分类': '',
            '信件状态': '',
            '搜索关键字': ''
        };

        // 分类数据（从数据库加载）
        this.categoryData = {};

        // DOM 元素引用
        this.elements = {};
    }

    /**
     * 停止当前动画
     */
    stopAnimation() {
        this.initAborted = true;
        
        if (this.currentAnimation) {
            this.currentAnimation.pause();
            this.currentAnimation = null;
        }
        this.resetElementsVisibility();
    }

    /**
     * 重置元素可见性
     */
    resetElementsVisibility() {
        if (!this.container) return;

        const selectors = [
            '.letters-header',
            '.letters-filter-panel',
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
     * 初始化页面
     */
    async init(container) {
        this.container = container;
        this.initAborted = false;
        console.log('[LettersController] 初始化所有信件页面');

        // 第1步：隐藏所有元素
        this.hideAllElements();

        if (this.initAborted) return;

        // 第2步：获取DOM元素
        this.getElements();

        if (this.initAborted) return;

        // 第3步：绑定事件
        this.bindEvents();

        // 第4步：从数据库加载分类数据并初始化分类选择器
        await this.loadCategories();

        if (this.initAborted) return;

        // 第5步：加载信件列表（首次进入时跳过动画）
        await this.loadLetters(true);

        if (this.initAborted) return;

        // 第6步：执行入场动画
        if (!this.animationPlayed || !this.animationCompleted) {
            this.animationPlayed = true;
            this.animationCompleted = false;
            await this.playEntranceAnimation();
        }

        if (this.initAborted) return;

        this.isInitialized = true;
        console.log('[LettersController] 所有信件页面初始化完成');
    }

    /**
     * 隐藏所有元素
     */
    hideAllElements() {
        if (this.container) {
            const selectors = [
                '.letters-header',
                '.letters-filter-panel',
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
    }

    /**
     * 显示页面
     */
    async show() {
        console.log('[LettersController] 页面显示');
        this.ensureElementsVisible();
        await this.loadLetters();
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
            '.letters-header',
            '.letters-filter-panel',
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
     */
    async playEntranceAnimation() {
        // 确保元素先隐藏
        const header = this.container.querySelector('.letters-header');
        const filterPanel = this.container.querySelector('.letters-filter-panel');
        const tableRows = this.container.querySelectorAll('#letters-list-body tr');
        const pagination = this.container.querySelector('#letters-pagination');

        if (header) header.style.opacity = '0';
        if (filterPanel) filterPanel.style.opacity = '0';
        if (pagination) pagination.style.opacity = '0';
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

            this.currentAnimation = tl;

            // 1. 搜索筛选面板动画
            tl.add({
                targets: this.container.querySelectorAll('.letters-header'),
                opacity: [0, 1],
                translateY: [30, 0],
                scale: [0.95, 1],
                duration: 800
            })
            // 2. 筛选面板动画
            .add({
                targets: this.container.querySelectorAll('.letters-filter-panel'),
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 600
            }, '-=400')
            // 3. 分页信息动画
            .add({
                targets: this.container.querySelectorAll('#letters-pagination'),
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 500
            }, '-=300')
            // 4. 表格行同时从左向右划入
            .add({
                targets: this.container.querySelectorAll('#letters-list-body tr'),
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 500
            }, '-=300');
        });
    }

    /**
     * 动画化表格行
     */
    animateTableRows() {
        const rows = this.container.querySelectorAll('#letters-list-body tr');
        if (rows.length > 0) {
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
     * 获取DOM元素引用
     */
    getElements() {
        this.elements = {
            level1Select: document.getElementById('letters-filter-level1'),
            level2Select: document.getElementById('letters-filter-level2'),
            level3Select: document.getElementById('letters-filter-level3'),
            searchInput: document.getElementById('letters-search-input'),
            searchBtn: document.getElementById('letters-search-btn'),
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
        // 状态筛选按钮
        if (this.elements.statusFilters) {
            const buttons = this.elements.statusFilters.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => {
                        b.classList.remove('bg-blue-600', 'text-white');
                        b.classList.add('bg-gray-100', 'text-gray-600');
                    });
                    btn.classList.remove('bg-gray-100', 'text-gray-600');
                    btn.classList.add('bg-blue-600', 'text-white');

                    this.filters['信件状态'] = btn.dataset.status;
                    this.currentPage = 1;
                    this.loadLetters();
                });
            });
        }

        // 搜索框输入监听（自动搜索，带防抖）
        if (this.elements.searchInput) {
            let debounceTimer;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchLetters();
                }, 500);
            });

            // 回车键立即搜索
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
     * 从数据库加载分类数据
     */
    async loadCategories() {
        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_categories',
                    args: {}
                })
            });

            const result = await response.json();

            if (result.success) {
                this.categoryData = result.data;
                this.initCategorySelectors();
            } else {
                console.error('[LettersController] 加载分类数据失败:', result.error);
            }
        } catch (error) {
            console.error('[LettersController] 加载分类数据失败:', error);
        }
    }

    /**
     * 初始化分类选择器
     */
    initCategorySelectors() {
        if (!this.elements.level1Select) return;

        // 清空现有选项（保留"全部"选项）
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
     * 搜索框按键处理
     */
    onSearchKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.searchLetters();
        }
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
        try {
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

            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_list',
                    args: args
                })
            });

            const result = await response.json();

            if (result.success) {
                this.totalCount = result.total || result.data.length;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
                this.renderLetters(result.data || [], skipAnimation);
                this.updatePagination();
            } else {
                console.error('[LettersController] 加载信件列表失败:', result.error);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('[LettersController] 加载信件列表失败:', error);
            this.showEmptyState();
        }
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

        this.elements.listBody.innerHTML = letters.map((letter) => {
            const statusClass = this.getStatusClass(letter['当前信件状态']);
            const statusText = letter['当前信件状态'] || '未知';

            // 来信时间现在已经是字符串格式，直接使用
            const time = letter['来信时间'] || '-';

            let content = letter['诉求内容'] || '-';
            if (this.filters['搜索关键字']) {
                content = this.highlightKeywords(content, this.filters['搜索关键字']);
            }

            return `
                <tr class="hover:bg-gray-50 transition cursor-pointer" style="opacity: ${skipAnimation ? '0' : '1'};" onclick="window.workplaceController.controllers.letters.viewLetterDetail('${letter['信件编号']}')">
                    <td class="px-6 py-4">
                        <span class="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${letter['信件编号'] || '-'}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-medium text-blue-600">${letter['信件一级分类'] || '未分类'}</span>
                            ${letter['信件二级分类'] ? `<span class="text-xs text-gray-500">${letter['信件二级分类']}</span>` : ''}
                            ${letter['信件三级分类'] ? `<span class="text-xs text-gray-500">${letter['信件三级分类']}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <span class="font-medium text-gray-800">${letter['群众姓名'] || '匿名'}</span>
                            ${letter['手机号'] ? `<span class="text-xs text-gray-400">${letter['手机号']}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-600 line-clamp-2">${content}</div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm text-gray-500">${time}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="${statusClass}">${statusText}</span>
                    </td>
                </tr>
            `;
        }).join('');

        if (!skipAnimation) {
            this.animateTableRows();
        }
    }

    /**
     * 获取状态对应的CSS类
     */
    getStatusClass(status) {
        const baseClass = 'px-3 py-1 rounded-full text-xs font-medium';
        
        if (!status) return `${baseClass} bg-gray-100 text-gray-600`;

        if (status === '预处理') 
            return `${baseClass} bg-gray-100 text-gray-600`;
        if (status === '已办结') 
            return `${baseClass} bg-green-100 text-green-700`;
        if (status.includes('处理') || status.includes('办理')) 
            return `${baseClass} bg-yellow-100 text-yellow-700`;
        if (status.includes('签收') || status.includes('下发') || status.includes('退回')) 
            return `${baseClass} bg-blue-100 text-blue-700`;
        if (status.includes('反馈')) 
            return `${baseClass} bg-teal-100 text-teal-700`;

        return `${baseClass} bg-gray-100 text-gray-600`;
    }

    /**
     * 高亮搜索关键字
     */
    highlightKeywords(text, keywords) {
        if (!keywords) return text;

        const keywordList = keywords.split('|').map(k => k.trim()).filter(k => k);
        if (keywordList.length === 0) return text;

        let displayText = text.length > 100 ? text.substring(0, 100) + '...' : text;

        keywordList.forEach(keyword => {
            if (keyword) {
                const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayText = displayText.replace(regex, '<mark class="bg-yellow-100 text-yellow-700 px-1 rounded">$1</mark>');
            }
        });

        return displayText;
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
            this.elements.paginationControls.innerHTML = this.generatePageNumbers();
        }
    }

    /**
     * 生成页码HTML
     */
    generatePageNumbers() {
        let html = '';

        // 上一页按钮
        html += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.letters.goToPrevPage()" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
                上一页
            </button>
        `;

        // 页码按钮
        const maxVisible = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(this.totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            html += `<button class="page-number" onclick="window.workplaceController.controllers.letters.goToPage(1)">1</button>`;
            if (start > 2) {
                html += `<span class="page-ellipsis">...</span>`;
            }
        }

        for (let i = start; i <= end; i++) {
            html += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        onclick="window.workplaceController.controllers.letters.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (end < this.totalPages) {
            if (end < this.totalPages - 1) {
                html += `<span class="page-ellipsis">...</span>`;
            }
            html += `<button class="page-number" onclick="window.workplaceController.controllers.letters.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }

        // 下一页按钮
        html += `
            <button class="page-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                    onclick="window.workplaceController.controllers.letters.goToNextPage()" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                下一页
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        return html;
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
        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_detail',
                    args: {
                        '信件编号': letterNumber
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('[LettersController] 信件详情:', result.data);
                this.showLetterDetailModal(result.data);
            } else {
                console.error('[LettersController] 获取信件详情失败:', result.error);
            }
        } catch (error) {
            console.error('[LettersController] 获取信件详情失败:', error);
        }
    }

    /**
     * 显示信件详情弹窗
     */
    showLetterDetailModal(letterData) {
        const modal = this.container.querySelector('#letter-detail-modal');
        const container = modal.querySelector('.letter-detail-container');

        // 填充基本信息
        this.fillBasicInfo(letterData);

        // 填充流转记录
        this.fillFlowRecords(letterData['流转记录'] || []);

        // 填充附件列表
        this.fillAttachmentFiles(letterData['信件编号']);

        // 显示弹窗
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // 使用anime.js实现弹窗动画
        anime({
            targets: modal,
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuad'
        });

        anime({
            targets: container,
            scale: [0.9, 1],
            opacity: [0, 1],
            duration: 400,
            easing: 'easeOutBack'
        });

        // 绑定关闭事件
        const closeBtn = modal.querySelector('#btn-close-detail');
        closeBtn.onclick = () => this.closeLetterDetailModal();

        // 点击遮罩层关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeLetterDetailModal();
            }
        };

        // 绑定标签页切换事件
        this.bindTabSwitchEvents();

        // 绑定可编辑输入框的点击事件
        this.bindEditableInputs();

        // 默认显示基本信息标签页
        this.switchTab('basic');
    }

    /**
     * 绑定可编辑输入框的点击事件
     */
    bindEditableInputs() {
        const editableInputs = this.container.querySelectorAll('#detail-name, #detail-phone, #detail-idcard, #detail-time, #detail-content');

        editableInputs.forEach(input => {
            // 鼠标移入时显示淡蓝色边框
            input.addEventListener('mouseenter', () => {
                if (input.readOnly) {
                    input.classList.add('ring-2', 'ring-blue-200');
                }
            });

            // 鼠标移出时移除淡蓝色边框
            input.addEventListener('mouseleave', () => {
                if (input.readOnly) {
                    input.classList.remove('ring-2', 'ring-blue-200');
                }
            });

            // 点击时移除readonly，允许编辑（不添加蓝色背景，只添加边框）
            input.addEventListener('click', function(e) {
                e.stopPropagation();
                this.readOnly = false;
                this.focus();
                this.classList.add('ring-2', 'ring-blue-200');
            });

            // 失去焦点时恢复readonly
            input.addEventListener('blur', function() {
                this.readOnly = true;
                this.classList.remove('ring-2', 'ring-blue-200');
            });

            // 按下Enter键时失去焦点（对于textarea使用Ctrl+Enter）
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

    /**
     * 关闭信件详情弹窗
     */
    closeLetterDetailModal() {
        const modal = this.container.querySelector('#letter-detail-modal');
        const container = modal.querySelector('.letter-detail-container');

        // 使用anime.js实现关闭动画
        anime({
            targets: container,
            scale: [1, 0.9],
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInQuad'
        });

        anime({
            targets: modal,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeInQuad',
            complete: () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    }

    /**
     * 填充基本信息
     */
    fillBasicInfo(letterData) {
        // 信件编号
        this.setTextContent('detail-letter-number', letterData['信件编号']);

        // 群众信息
        this.setTextContent('detail-name', letterData['群众姓名']);
        this.setTextContent('detail-phone', letterData['手机号'] || '-');
        this.setTextContent('detail-idcard', letterData['身份证号'] || '-');

        // 信件信息
        this.setTextContent('detail-time', letterData['来信时间']);
        this.setTextContent('detail-channel', letterData['来信渠道']);
        this.setTextContent('detail-level1', letterData['信件一级分类']);
        this.setTextContent('detail-level2', letterData['信件二级分类']);
        this.setTextContent('detail-level3', letterData['信件三级分类']);
        this.setTextContent('detail-content', letterData['诉求内容']);

        // 处理信息
        const statusEl = this.container.querySelector('#detail-status');
        if (statusEl) {
            statusEl.textContent = letterData['当前信件状态'] || '-';
            // 统一使用黑色文字
            statusEl.classList.remove('text-gray-800', 'text-green-700', 'text-yellow-700', 'text-blue-700', 'text-red-700', 'text-gray-700');
            statusEl.classList.add('text-gray-800');
        }
        this.setTextContent('detail-unit', letterData['当前信件处理单位'] || '-');

        // 专项关注标签
        const specialFocusContainer = this.container.querySelector('#detail-special-focus');
        if (specialFocusContainer) {
            let tags = letterData['专项关注标签'] || [];
            // 如果tags是字符串，尝试解析为数组
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    tags = [];
                }
            }
            // 确保tags是数组
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
        if (!container) return;

        if (!flowRecords || flowRecords.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-400 py-8">暂无流转记录</div>';
            return;
        }

        // 按时间倒序排列
        const sortedRecords = [...flowRecords].reverse();

        container.innerHTML = sortedRecords.map((record, index) => {
            const isLatest = index === 0;
            const operationType = record['操作类型'] || '-';
            const operatorName = record['操作人姓名'] || '-';
            const operatorNumber = record['操作人警号'] || '-';
            const operationTime = record['操作时间'] || '-';
            const beforeStatus = record['操作前状态'] || '-';
            const afterStatus = record['操作后状态'] || '-';
            const beforeUnit = record['操作前单位'] || '-';
            const afterUnit = record['操作后单位'] || '-';
            const targetUnit = record['目标单位'] || '';
            const remark = record['备注'] || {};

            let remarkHtml = '';
            if (typeof remark === 'object') {
                remarkHtml = Object.entries(remark).map(([key, value]) => {
                    if (Array.isArray(value)) {
                        return `<div class="text-xs text-gray-500 mt-1"><span class="font-medium">${key}:</span> ${value.join(' / ')}</div>`;
                    }
                    return `<div class="text-xs text-gray-500 mt-1"><span class="font-medium">${key}:</span> ${value}</div>`;
                }).join('');
            }

            return `
                <div class="flow-item relative pb-8 ${isLatest ? 'latest' : ''}">
                    <div class="absolute left-0 top-0 w-3 h-3 rounded-full ${isLatest ? 'bg-blue-500 ring-4 ring-blue-100' : 'bg-gray-300'} -translate-x-[5px]"></div>
                    <div class="absolute left-0 top-3 bottom-0 w-0.5 bg-gray-200 -translate-x-[1px]"></div>
                    <div class="ml-6 bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-gray-800">${operationType}</span>
                            <span class="text-xs text-gray-400">${operationTime}</span>
                        </div>
                        <div class="text-xs text-gray-600 mb-2">
                            <span class="font-medium">操作人:</span> ${operatorName} (${operatorNumber})
                        </div>
                        <div class="flex items-center gap-2 text-xs mb-2">
                            <span class="px-2 py-1 bg-gray-200 text-gray-700 rounded">${beforeStatus}</span>
                            <i class="fas fa-arrow-right text-gray-400"></i>
                            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded">${afterStatus}</span>
                        </div>
                        ${targetUnit ? `<div class="text-xs text-gray-500 mb-2"><span class="font-medium">目标单位:</span> ${targetUnit}</div>` : ''}
                        ${remarkHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 填充附件列表
     */
    async fillAttachmentFiles(letterNumber) {
        const container = this.container.querySelector('#detail-files-list');
        if (!container) return;

        // 显示加载状态
        container.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</div>';

        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_files',
                    args: {
                        '信件编号': letterNumber
                    }
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                const fileCategories = [
                    { key: '市局下发附件', name: '市局下发附件', icon: 'fa-paper-plane', color: 'blue' },
                    { key: '区县局下发附件', name: '区县局下发附件', icon: 'fa-share', color: 'green' },
                    { key: '办案单位反馈附件', name: '办案单位反馈附件', icon: 'fa-reply', color: 'orange' },
                    { key: '区县局反馈附件', name: '区县局反馈附件', icon: 'fa-reply-all', color: 'purple' },
                    { key: '通话录音附件', name: '通话录音附件', icon: 'fa-phone', color: 'red' }
                ];

                let hasFiles = false;
                let html = '';

                fileCategories.forEach(category => {
                    let files = result.data[category.key] || [];
                    // 如果files是字符串，尝试解析为数组
                    if (typeof files === 'string') {
                        try {
                            files = JSON.parse(files);
                        } catch (e) {
                            files = [];
                        }
                    }
                    // 确保files是数组
                    if (!Array.isArray(files)) {
                        files = [];
                    }
                    if (files.length > 0) {
                        hasFiles = true;
                        html += `
                            <div class="bg-gray-50 rounded-xl p-4">
                                <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                    <i class="fas ${category.icon} text-${category.color}-500 mr-2"></i>
                                    ${category.name}
                                    <span class="ml-2 px-2 py-0.5 bg-${category.color}-100 text-${category.color}-700 rounded text-xs">${files.length}</span>
                                </h4>
                                <div class="space-y-2">
                                    ${files.map(file => `
                                        <div class="flex items-center justify-between bg-white rounded-lg p-3">
                                            <div class="flex items-center gap-3">
                                                <i class="fas fa-file text-gray-400"></i>
                                                <span class="text-sm text-gray-700">${file.name || file}</span>
                                            </div>
                                            <button class="text-blue-600 hover:text-blue-700 text-sm" onclick="window.open('${file.url || '#'}', '_blank')">
                                                <i class="fas fa-download mr-1"></i>下载
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                });

                if (!hasFiles) {
                    container.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-inbox text-4xl mb-3 opacity-30"></i><p>暂无附件</p></div>';
                } else {
                    container.innerHTML = html;
                }
            } else {
                container.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-inbox text-4xl mb-3 opacity-30"></i><p>暂无附件</p></div>';
            }
        } catch (error) {
            console.error('[LettersController] 获取附件列表失败:', error);
            container.innerHTML = '<div class="text-center text-red-400 py-8"><i class="fas fa-exclamation-circle text-4xl mb-3"></i><p>加载附件失败</p></div>';
        }
    }

    /**
     * 设置文本内容
     * 支持input、textarea和普通元素
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
        const tabBtns = this.container.querySelectorAll('.detail-tab-btn');
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
    switchTab(tabName) {
        // 更新按钮样式
        const tabBtns = this.container.querySelectorAll('.detail-tab-btn');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.remove('text-gray-500', 'border-transparent');
                btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
            } else {
                btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            }
        });

        // 切换内容显示
        const tabContents = this.container.querySelectorAll('.detail-tab-content');
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        const targetContent = this.container.querySelector(`#tab-${tabName}`);
        if (targetContent) {
            targetContent.classList.remove('hidden');

            // 使用anime.js实现内容切换动画
            anime({
                targets: targetContent,
                opacity: [0, 1],
                translateY: [10, 0],
                duration: 300,
                easing: 'easeOutQuad'
            });
        }
    }
}

// 导出控制器类到全局
window.LettersController = LettersController;
