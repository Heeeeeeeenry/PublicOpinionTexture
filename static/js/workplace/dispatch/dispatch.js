/**
 * 下发工作台控制器
 *
 * 负责下发工作台的初始化、主要逻辑控制和事件绑定
 * 使用通用动画WpAnimation和通用样式
 */

class DispatchController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.letters = {};
        this.units = [];
        this.selectedLetter = null;
        this.selectedUnit = null;
        this.letterInfo = {};
        this.notes = "请接收单位认真处理用户诉求，及时回复。";
        this.pollingInterval = null;
        this.isPolling = false;
        this.prompt = [];
        this.historyMessages = [];
        this.sameIdLetter = [];
        this.autoDispatchChecked = false;
        this.aiController = null;
        this.isRenderingMessages = false;
        this.renderAbortController = null;
        this.categories = [];
        this.specialFocus = [];
        this.selectedCategory = null;
        this.selectedSpecialFocus = [];
    }

    /**
     * 设置右侧详情面板的禁用状态
     * @param {boolean} disabled - 是否禁用
     */
    setDetailPanelDisabled(disabled) {
        const detailPanel = this.container.querySelector('#letter-detail-panel');
        if (!detailPanel) return;

        if (disabled) {
            detailPanel.classList.add('disabled');
            detailPanel.style.pointerEvents = 'none';
            detailPanel.style.userSelect = 'none';
            detailPanel.style.opacity = '0.6';
        } else {
            detailPanel.classList.remove('disabled');
            detailPanel.style.pointerEvents = '';
            detailPanel.style.userSelect = '';
            detailPanel.style.opacity = '1';

            const textElements = detailPanel.querySelectorAll('.wp-text-animate');
            textElements.forEach(el => {
                el.classList.remove('fading-out', 'fading-in');
                el.classList.add('visible');
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });
        }
    }

    /**
     * 初始化控制器
     * @param {HTMLElement} container - 容器元素
     */
    async init(container) {
        this.container = container;

        await this.renderHTML();

        this.prompt = await DispatchTools.getSystemPrompts();

        this.bindEvents();

        this.initAIController();

        const isFirstEnter = !this.animationPlayed;

        if (isFirstEnter) {
            const header = this.container.querySelector('#dispatch-header');
            const leftPanel = this.container.querySelector('#letter-list-panel');
            const rightPanel = this.container.querySelector('#letter-detail-panel');

            await this.playInitAnimation(header, leftPanel, rightPanel);
            this.animationPlayed = true;
        }

        await this.loadData(true);

        this.isInitialized = true;

        this.startPolling();

        await this.initDropdowns();
    }

    /**
     * 播放初始进入动画
     */
    async playInitAnimation(header, leftPanel, rightPanel) {
        header.style.opacity = '0';
        leftPanel.style.opacity = '0';
        rightPanel.style.opacity = '0';

        await WpAnimation.moveAndFadeIn(header, 'left', 30, 500, 0);
        await WpAnimation.moveAndFadeIn(leftPanel, 'left', 30, 500, 0);
        await WpAnimation.moveAndFadeIn(rightPanel, 'left', 30, 500, 0);
    }

    /**
     * 渲染HTML结构
     */
    async renderHTML() {
        this.container.innerHTML = DispatchHtml.getFullPageHtml();
    }

    /**
     * 初始化下拉框
     */
    async initDropdowns() {
        const [categories, specialFocus] = await Promise.all([
            DispatchTools.loadCategories(),
            DispatchTools.loadSpecialFocus()
        ]);

        this.categories = categories;
        this.specialFocus = specialFocus;

        this.initCategoryDropdown();
        this.initUnitDropdown();
        this.initSpecialFocusDropdown();
    }

    /**
     * 初始化信件分类下拉框
     */
    initCategoryDropdown() {
        const container = this.container.querySelector('#category-select-container');
        const input = this.container.querySelector('#category-select-input');
        const dropdown = this.container.querySelector('#category-select-dropdown');
        const searchInput = this.container.querySelector('#category-search');
        const optionsContainer = this.container.querySelector('#category-select-options');

        const formatCategoryOptions = () => {
            return this.categories.map(cat => {
                const fullPath = `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}`;
                return { type: 'option', value: fullPath, label: fullPath };
            });
        };

        this.renderDropdownOptions(optionsContainer, formatCategoryOptions());
        this.bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, (value) => {
            this.selectedCategory = value;

            const matchedCategory = this.categories.find(cat =>
                `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}` === value
            );
            if (matchedCategory && this.letterInfo) {
                this.letterInfo['信件一级分类'] = matchedCategory['一级分类'];
                this.letterInfo['信件二级分类'] = matchedCategory['二级分类'];
                this.letterInfo['信件三级分类'] = matchedCategory['三级分类'];
            }

            const categorySpan = this.container.querySelector('#detail-category');
            if (categorySpan) {
                categorySpan.textContent = value;
            }
        });
    }

    /**
     * 初始化下发单位下拉框
     */
    initUnitDropdown() {
        const container = this.container.querySelector('#unit-select-container');
        const input = this.container.querySelector('#unit-select-input');
        const dropdown = this.container.querySelector('#unit-select-dropdown');
        const searchInput = this.container.querySelector('#unit-search');
        const optionsContainer = this.container.querySelector('#unit-select-options');

        const formatUnitOptions = () => {
            if (!this.units || this.units.length === 0) {
                return [];
            }
            return this.units.map(unit => {
                const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
                return { type: 'option', value: fullPath, label: fullPath, path: fullPath };
            });
        };

        const options = formatUnitOptions();
        this.renderDropdownOptions(optionsContainer, options);

        this.bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, (value) => {
            this.selectedUnit = value;

            const matchedUnit = this.units.find(unit => {
                const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
                return fullPath === value;
            });

            if (matchedUnit && this.letterInfo) {
                const flowRecords = this.letterInfo['流转记录'] || [];
                const generateRecord = flowRecords.find(record => record['操作类型'] === '生成');
                if (generateRecord) {
                    try {
                        const remark = JSON.parse(generateRecord['备注'] || '{}');
                        const unitFullName = [matchedUnit['一级'], matchedUnit['二级'], matchedUnit['三级']].filter(Boolean).join(' / ');
                        remark['建议办理单位'] = unitFullName;
                        generateRecord['备注'] = JSON.stringify(remark);
                    } catch (e) {
                    }
                }
            }
        });
    }

    /**
     * 初始化专项关注下拉框
     */
    initSpecialFocusDropdown() {
        const container = this.container.querySelector('#focus-select-container');
        const input = this.container.querySelector('#focus-select-input');
        const dropdown = this.container.querySelector('#focus-select-dropdown');
        const searchInput = this.container.querySelector('#focus-search');
        const optionsContainer = this.container.querySelector('#focus-select-options');

        this.selectedSpecialFocus = [];

        this.renderMultiSelectOptions(optionsContainer, this.specialFocus);

        this.bindMultiSelectEvents(container, input, dropdown, searchInput, optionsContainer, (values) => {
            this.selectedSpecialFocus = values;

            if (this.letterInfo) {
                this.letterInfo['专项关注标签'] = values.filter(Boolean).join(' / ');
            }
        });
    }

    /**
     * 渲染多选下拉框选项
     */
    renderMultiSelectOptions(container, items) {
        container.innerHTML = items.map(item => `
            <div class="dispatch-select-option" data-value="${item['专项关注标题']}">
                <div class="dispatch-select-option-checkbox"></div>
                <div class="dispatch-select-option-label">${item['专项关注标题']}</div>
            </div>
        `).join('');
    }

    /**
     * 绑定多选下拉框事件
     */
    bindMultiSelectEvents(container, input, dropdown, searchInput, optionsContainer, onChange) {
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            this.container.querySelectorAll('.dispatch-searchable-select').forEach(el => {
                el.classList.remove('active');
                el.classList.remove('dropup');
            });
            if (!isActive) {
                container.classList.add('active');
                
                const rect = input.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const spaceBelow = windowHeight - rect.bottom;
                const dropdownHeight = 300;
                
                if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
                    container.classList.add('dropup');
                }
                
                searchInput.focus();
            }
        });

        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.dispatch-select-option');
            if (option) {
                const value = option.dataset.value;

                option.classList.toggle('selected');

                const selectedOptions = optionsContainer.querySelectorAll('.dispatch-select-option.selected');
                const selectedValues = Array.from(selectedOptions).map(opt => opt.dataset.value);

                if (selectedValues.length > 0) {
                    input.value = selectedValues.filter(Boolean).join(' / ');
                } else {
                    input.value = '';
                }

                onChange(selectedValues);
            }
        });

        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.dispatch-select-option');
            options.forEach(opt => {
                const label = opt.querySelector('.dispatch-select-option-label').textContent.toLowerCase();
                opt.style.display = label.includes(keyword) ? '' : 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
                container.classList.remove('dropup');
            }
        });
    }

    /**
     * 渲染下拉框选项
     */
    renderDropdownOptions(container, options) {
        container.innerHTML = options.map(opt => {
            if (opt.type === 'group') {
                return `<div class="dispatch-select-option-group">${opt.label}</div>`;
            }
            return `<div class="dispatch-select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
        }).join('');
    }

    /**
     * 绑定下拉框事件
     */
    bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, onSelect) {
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            this.container.querySelectorAll('.dispatch-searchable-select').forEach(el => {
                el.classList.remove('active');
                el.classList.remove('dropup');
            });
            if (!isActive) {
                container.classList.add('active');
                
                const rect = input.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const spaceBelow = windowHeight - rect.bottom;
                const dropdownHeight = 300;
                
                if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
                    container.classList.add('dropup');
                }
                
                searchInput.focus();
            }
        });

        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.dispatch-select-option');
            if (option) {
                const value = option.dataset.value;
                const label = option.textContent;
                input.value = label;
                onSelect(value);
                container.classList.remove('active');
                container.classList.remove('dropup');

                optionsContainer.querySelectorAll('.dispatch-select-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });

        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.dispatch-select-option');
            options.forEach(opt => {
                const text = opt.textContent.toLowerCase();
                const path = (opt.dataset.path || '').toLowerCase();
                opt.style.display = (text.includes(keyword) || path.includes(keyword)) ? '' : 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
                container.classList.remove('dropup');
            }
        });
    }

    /**
     * 根据信件信息设置下拉框值
     */
    setDropdownValues(letter) {
        const categoryInput = this.container.querySelector('#category-select-input');
        if (categoryInput) {
            const c1 = this.letterInfo?.['信件一级分类'] || letter['信件一级分类'];
            const c2 = this.letterInfo?.['信件二级分类'] || letter['信件二级分类'];
            const c3 = this.letterInfo?.['信件三级分类'] || letter['信件三级分类'];
            const categoryValue = `${c1} / ${c2} / ${c3}`;
            categoryInput.value = categoryValue;
            this.selectedCategory = categoryValue;
        }

        const unitInput = this.container.querySelector('#unit-select-input');
        if (unitInput) {
            const flowRecords = this.letterInfo?.['流转记录'];
            if (Array.isArray(flowRecords)) {
                const generateRecord = flowRecords.find(record => record['操作类型'] === '生成');
                if (generateRecord && generateRecord['备注']) {
                    const remark = generateRecord['备注'];
                    const suggestedUnits = remark['建议下发办理单位'];
                    if (suggestedUnits && suggestedUnits.length > 0) {
                        const fullUnitName = suggestedUnits.filter(Boolean).join(' / ');
                        unitInput.value = fullUnitName;
                        this.selectedUnit = fullUnitName;
                    }
                }
            }
        }

        const focusInput = this.container.querySelector('#focus-select-input');
        if (focusInput) {
            const focusTags = this.letterInfo?.['专项关注标签'];
            if (focusTags && Array.isArray(focusTags) && focusTags.length > 0) {
                focusInput.value = focusTags.filter(Boolean).join(' / ');
                this.selectedSpecialFocus = focusTags.filter(Boolean);
            } else {
                focusInput.value = '';
                this.selectedSpecialFocus = [];
            }
            this.updateFocusSelectUI();
        }
    }

    /**
     * 更新专项关注多选框UI状态
     */
    updateFocusSelectUI() {
        const optionsContainer = this.container.querySelector('#focus-select-options');
        if (!optionsContainer) return;

        const options = optionsContainer.querySelectorAll('.dispatch-select-option');
        options.forEach(opt => {
            const value = opt.dataset.value;
            if (this.selectedSpecialFocus.includes(value)) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    /**
     * 验证信件分类输入内容
     */
    validateCategoryInput(content) {
        const result = DispatchTools.validateCategoryContent(content, this.categories);
        const inputElement = this.container.querySelector('#category-select-input');

        if (result.valid) {
            const displayValue = result.correctedValue || content;
            inputElement.value = displayValue;
            this.selectedCategory = displayValue;

            if (this.letterInfo && result.matched) {
                this.letterInfo['信件一级分类'] = result.matched['一级分类'];
                this.letterInfo['信件二级分类'] = result.matched['二级分类'];
                this.letterInfo['信件三级分类'] = result.matched['三级分类'];
            }

            const categorySpan = this.container.querySelector('#detail-category');
            if (categorySpan) {
                categorySpan.textContent = displayValue;
            }

            this.flashInputBorder(inputElement);
        } else {
            DispatchTools.showValidationError(inputElement, result.message);
        }

        return result;
    }

    /**
     * 验证下发单位输入内容
     */
    validateUnitInput(content) {
        const result = DispatchTools.validateUnitContent(content, this.units);
        const inputElement = this.container.querySelector('#unit-select-input');

        if (result.valid) {
            const displayValue = result.correctedValue || content;
            inputElement.value = displayValue;
            this.selectedUnit = result.matched
                ? [result.matched['一级'], result.matched['二级'], result.matched['三级']].filter(Boolean).join(' / ')
                : content;

            if (this.letterInfo && result.matched) {
                const flowRecords = this.letterInfo['流转记录'] || [];
                const generateRecord = flowRecords.find(record => record['操作类型'] === '生成');
                if (generateRecord) {
                    try {
                        const remark = JSON.parse(generateRecord['备注'] || '{}');
                        const unitFullName = [result.matched['一级'], result.matched['二级'], result.matched['三级']].filter(Boolean).join(' / ');
                        remark['建议办理单位'] = unitFullName;
                        generateRecord['备注'] = JSON.stringify(remark);
                    } catch (e) {
                    }
                }
            }

            this.flashInputBorder(inputElement);
        } else {
            DispatchTools.showValidationError(inputElement, result.message);
        }

        return result;
    }

    /**
     * 验证专项关注输入内容
     */
    validateSpecialFocusInput(content) {
        const result = DispatchTools.validateSpecialFocusContent(content, this.specialFocus);
        const container = this.container.querySelector('#focus-select-container');
        const inputElement = this.container.querySelector('#focus-select-input');

        if (result.valid) {
            DispatchTools.autoSelectSpecialFocusOptions(
                container,
                result.matched,
                (values) => {
                    this.selectedSpecialFocus = values;
                }
            );

            if (this.letterInfo) {
                this.letterInfo['专项关注标签'] = result.matched.filter(Boolean).join(' / ');
            }

            this.flashInputBorder(inputElement);
        } else {
            DispatchTools.showValidationError(inputElement, result.message);
        }

        return result;
    }

    /**
     * 输入框闪烁效果
     */
    flashInputBorder(inputElement) {
        inputElement.style.transition = 'all 0.3s ease';
        inputElement.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.5)';
        setTimeout(() => {
            inputElement.style.boxShadow = '';
        }, 1000);
    }

    /**
     * 启动轮询
     */
    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;

        this.pollLetters();
        this.pollingInterval = setInterval(() => this.pollLetters(), 5000);
    }

    /**
     * 停止轮询
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
    }

    /**
     * 轮询获取信件列表
     */
    async pollLetters() {
        const newLetters = await DispatchTools.getLetters();

        newLetters.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        const newLettersDict = {};
        newLetters.forEach(letter => {
            newLettersDict[letter['信件编号']] = letter;
        });

        await this.handleLetterChanges(newLetters, newLettersDict);

        this.updateCount();
    }

    /**
     * 处理信件列表变化
     */
    async handleLetterChanges(newLetters, newLettersDict) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const { deleted, added, modified } = DispatchTools.compareLetters(this.letters, newLettersDict);

        if (deleted.length === 0 && added.length === 0 && modified.length === 0) {
            return;
        }

        const hadLettersBefore = Object.keys(this.letters).length > 0;
        const hasLettersNow = newLetters.length > 0;

        this.letters = newLettersDict;

        if (!hadLettersBefore && hasLettersNow) {
            panel.innerHTML = '';

            const firstLetter = newLetters[0];
            await this.animateAddLetter(firstLetter);

            this.setDetailPanelDisabled(false);
            await this.selectLetter(firstLetter);
            this.updateCount();
            return;
        } else if (hadLettersBefore && !hasLettersNow) {
            if (this.isRenderingMessages) {
                if (this.aiController) {
                    this.aiController.abortStream();
                }

                if (this.renderAbortController) {
                    this.renderAbortController.abort();
                    this.renderAbortController = null;
                }

                this.isRenderingMessages = false;
            }

            const chatMessages = this.container.querySelector('#ai-chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }

            const categoryInput = this.container.querySelector('#category-select-input');
            const unitInput = this.container.querySelector('#unit-select-input');
            const focusInput = this.container.querySelector('#focus-select-input');

            if (categoryInput) categoryInput.value = '';
            if (unitInput) unitInput.value = '';
            if (focusInput) focusInput.value = '';

            this.selectedCategory = null;
            this.selectedUnit = null;
            this.selectedSpecialFocus = [];

            this.letterInfo = {};
            this.sameIdLetter = [];
            this.historyMessages = [];

            const textElements = this.container.querySelectorAll('.wp-text-animate');
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

            this.renderLetterList();
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
            this.updateCount();
            return;
        }

        for (const letterNumber of deleted) {
            await this.animateRemoveLetter(letterNumber);
        }

        for (const letterNumber of modified) {
            const letter = newLettersDict[letterNumber];
            await this.animateModifyLetter(letter);
        }

        for (const letterNumber of added) {
            const letter = newLettersDict[letterNumber];
            await this.animateAddLetter(letter);
        }

        if (this.selectedLetter && deleted.includes(this.selectedLetter['信件编号'])) {
            if (this.isRenderingMessages) {
                if (this.aiController) {
                    this.aiController.abortStream();
                }

                if (this.renderAbortController) {
                    this.renderAbortController.abort();
                    this.renderAbortController = null;
                }

                this.isRenderingMessages = false;
            }

            const chatMessages = this.container.querySelector('#ai-chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            this.historyMessages = [];

            this.letterInfo = {};
            this.sameIdLetter = [];

            const textElements = this.container.querySelectorAll('.wp-text-animate');
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

            if (newLetters.length > 0) {
                this.selectLetter(newLetters[0]);
            } else {
                this.selectedLetter = null;
                this.setDetailPanelDisabled(true);
            }
        }

        this.updateCount();
    }

    /**
     * 动画添加信件
     */
    async animateAddLetter(letter) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const lettersArray = Object.values(this.letters);
        const insertIndex = lettersArray.findIndex(l => l['信件编号'] === letter['信件编号']);
        if (insertIndex === -1) return;

        const html = DispatchTools.renderLetterListItemHTML(letter, this.selectedLetter?.['信件编号']);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newElement = tempDiv.firstElementChild;

        const existingItems = panel.querySelectorAll('.wp-list-item');
        if (insertIndex < existingItems.length) {
            existingItems[insertIndex].insertAdjacentElement('beforebegin', newElement);
        } else {
            panel.appendChild(newElement);
        }

        newElement.addEventListener('click', () => {
            const letterNumber = newElement.dataset.letterNumber;
            const letter = this.letters[letterNumber];
            if (letter) this.selectLetter(letter);
        });

        await WpAnimation.moveAndFadeIn(newElement, 'left', 30, 400, 0);
    }

    /**
     * 动画删除信件
     */
    async animateRemoveLetter(letterNumber) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const element = panel.querySelector(`[data-letter-number="${letterNumber}"]`);
        if (!element) return;

        await WpAnimation.moveAndFadeOut(element, 'left', 30, 400, 0);

        element.remove();
    }

    /**
     * 动画修改信件
     */
    async animateModifyLetter(letter) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const element = panel.querySelector(`[data-letter-number="${letter['信件编号']}"]`);
        if (!element) return;

        await WpAnimation.moveAndFadeOut(element, 'left', 30, 300, 0);

        const html = DispatchTools.renderLetterListItemHTML(letter, this.selectedLetter?.['信件编号']);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newElement = tempDiv.firstElementChild;

        element.replaceWith(newElement);

        newElement.addEventListener('click', () => {
            const letterNumber = newElement.dataset.letterNumber;
            const letter = this.letters[letterNumber];
            if (letter) this.selectLetter(letter);
        });

        await WpAnimation.moveAndFadeIn(newElement, 'left', 30, 400, 0);
    }

    /**
     * 加载数据
     * @param {boolean} withAnimation - 是否播放动画
     */
    async loadData(withAnimation = false) {
        const [lettersArray, units] = await Promise.all([
            DispatchTools.getLetters(),
            DispatchTools.loadUnits()
        ]);

        lettersArray.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        this.letters = {};
        lettersArray.forEach(letter => {
            this.letters[letter['信件编号']] = letter;
        });

        this.units = units;

        await this.renderLetterList(withAnimation);

        const lettersList = Object.values(this.letters);
        if (lettersList.length > 0) {
            this.setDetailPanelDisabled(false);
            await this.selectLetter(lettersList[0], withAnimation);
        } else {
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
        }

        this.updateCount();
    }

    /**
     * 渲染信件列表
     * @param {boolean} withAnimation - 是否播放动画
     */
    async renderLetterList(withAnimation = false) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const selectedNumber = this.selectedLetter?.['信件编号'];
        const lettersArray = Object.values(this.letters);
        panel.innerHTML = DispatchTools.renderLetterListHTML(lettersArray, selectedNumber);

        const items = panel.querySelectorAll('.wp-list-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const letterNumber = item.dataset.letterNumber;
                const letter = this.letters[letterNumber];
                if (letter) this.selectLetter(letter);
            });
        });

        if (withAnimation && items.length > 0) {
            items.forEach(item => {
                item.style.opacity = '0';
            });
            await WpAnimation.moveAndFadeIn(items, 'left', 30, 400, 50);
        }
    }

    /**
     * 选中信件
     * @param {Object} letter - 信件对象
     * @param {boolean} withAnimation - 是否播放动画
     */
    async selectLetter(letter, withAnimation = false) {
        if (!withAnimation && this.selectedLetter && this.selectedLetter['信件编号'] === letter['信件编号']) {
            return;
        }

        if (this.isRenderingMessages) {
            if (this.aiController) {
                this.aiController.abortStream();
            }

            if (this.renderAbortController) {
                this.renderAbortController.abort();
                this.renderAbortController = null;
            }

            this.isRenderingMessages = false;
        }

        this.selectedLetter = letter;

        this.historyMessages = [];

        this.renderLetterList();

        await this.animateLetterSwitch(letter, withAnimation);
    }

    /**
     * 执行信件切换动画
     * @param {Object} letter - 信件对象
     * @param {boolean} withAnimation - 是否播放动画
     */
    async animateLetterSwitch(letter, withAnimation = false) {
        const textElements = this.container.querySelectorAll('.wp-text-animate');
        const chatMessages = this.container.querySelector('#ai-chat-messages');

        if (withAnimation) {
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);
        }

        if (chatMessages) {
            chatMessages.innerHTML = '';
        }

        this.letterInfo = {};
        this.sameIdLetter = [];

        DispatchTools.fillLetterDetail(this.container, letter);

        this.bindEditableInputs();

        if (withAnimation) {
            await WpAnimation.moveAndFadeIn(textElements, 'left', 30, 400, 30);
        }

        const fullDetail = await DispatchTools.getLetterFullDetail(letter['信件编号']);
        if (fullDetail) {
            this.letterInfo = fullDetail;

            if (fullDetail['身份证号']) {
                this.sameIdLetter = await DispatchTools.getLettersByIdCard(fullDetail['身份证号'], letter['信件编号']);
            }
        }

        this.setDropdownValues(letter);

        setTimeout(() => {
            this.renderAIChatMessages();
        }, 1000);
    }

    /**
     * 绑定可编辑输入框事件
     */
    bindEditableInputs() {
        const fieldMapping = {
            'detail-time': '来信时间',
            'detail-citizen': '群众姓名',
            'detail-phone': '手机号',
            'detail-idcard': '身份证号',
            'detail-appeal-content': '诉求内容'
        };

        const editableInputs = this.container.querySelectorAll('#detail-time, #detail-citizen, #detail-phone, #detail-idcard, #detail-appeal-content');

        editableInputs.forEach(input => {
            const fieldName = fieldMapping[input.id];

            input.addEventListener('mouseenter', () => {
                if (input.readOnly) {
                    input.classList.add('ring-2', 'ring-blue-200');
                }
            });

            input.addEventListener('mouseleave', () => {
                if (input.readOnly) {
                    input.classList.remove('ring-2', 'ring-blue-200');
                }
            });

            input.addEventListener('click', function(e) {
                e.stopPropagation();
                this.readOnly = false;
                this.focus();
                if (this.tagName === 'TEXTAREA') {
                    this.classList.add('ring-2', 'ring-blue-200');
                } else {
                    this.classList.add('bg-blue-50', 'ring-2', 'ring-blue-200');
                }
            });

            input.addEventListener('blur', () => {
                input.readOnly = true;
                input.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-200');
                if (fieldName) {
                    this.saveFieldEdit(input, fieldName);
                }
            });

            input.addEventListener('keydown', function(e) {
                if (this.tagName === 'TEXTAREA') {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        this.blur();
                    }
                } else {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        const originalFieldName = fieldMapping[this.id];
                        if (originalFieldName && this.selectedLetter) {
                            this.value = this.selectedLetter[originalFieldName] || '';
                        }
                        this.readOnly = true;
                        this.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-200');
                    }
                }
            });
        });
    }

    /**
     * 保存字段编辑
     */
    saveFieldEdit(input, fieldName) {
        const newValue = input.value.trim();

        if (this.letterInfo) {
            this.letterInfo[fieldName] = newValue;
        }

        if (this.selectedLetter) {
            this.selectedLetter[fieldName] = newValue;
        }
    }

    /**
     * 渲染AI聊天消息
     */
    async renderAIChatMessages() {
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages || !this.aiController) return;

        this.setChatInputDisabled(true);

        this.renderAbortController = new AbortController();
        const { signal } = this.renderAbortController;

        this.isRenderingMessages = true;

        try {
            chatMessages.innerHTML = '';

            if (signal.aborted) return;
            this.currentAIMessageElement = this.createAIMessageElement(chatMessages);
            this.currentAIMessageElement.querySelector('.dispatch-ai-message-text').textContent = '正在查看信件...';

            await this.delayWithAbort(2000, signal);
            if (signal.aborted) return;

            this.currentAIMessageElement = this.createAIMessageElement(chatMessages);
            this.currentAIMessageElement.querySelector('.dispatch-ai-message-text').textContent = '正在获取该群众之前写过的信件...';

            await this.delayWithAbort(2000, signal);
            if (signal.aborted) return;

            await this.autoSendMessageToAI('检查一下信件', signal);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[DispatchController] 渲染过程被中断');
            } else {
                console.error('[DispatchController] 渲染消息失败:', error);
            }
        } finally {
            this.isRenderingMessages = false;
            this.renderAbortController = null;
            this.setChatInputDisabled(false);
        }
    }

    /**
     * 可中断的延迟函数
     */
    delayWithAbort(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            const timeoutId = setTimeout(resolve, ms);

            signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
        });
    }

    /**
     * 设置AI聊天输入框状态
     */
    setChatInputDisabled(disabled) {
        const chatInput = this.container.querySelector('#ai-chat-input');
        const chatSendBtn = this.container.querySelector('#btn-send-message');

        if (chatInput) {
            chatInput.disabled = disabled;
            if (disabled) {
                chatInput.classList.add('disabled');
                chatInput.placeholder = '请稍候...';
            } else {
                chatInput.classList.remove('disabled');
                chatInput.placeholder = '请输入您的问题...';
                chatInput.focus();
            }
        }

        if (chatSendBtn) {
            chatSendBtn.disabled = disabled;
            if (disabled) {
                chatSendBtn.classList.add('disabled');
            } else {
                chatSendBtn.classList.remove('disabled');
            }
        }
    }

    /**
     * 自动发送消息给大模型
     */
    async autoSendMessageToAI(message, signal = null) {
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages || !this.aiController) return;

        if (signal?.aborted) return;

        const messages = this.buildMessages(message, this.historyMessages);

        const aiMessageElement = this.createAIMessageElement(chatMessages);
        const targetElement = aiMessageElement.querySelector('.dispatch-ai-message-text');

        let streamText = '';
        const response = await this.aiController.sendMessage(
            messages,
            {
                onChunk: (char) => {
                    if (signal?.aborted) return;

                    streamText += char;
                    if (typeof marked !== 'undefined') {
                        targetElement.innerHTML = marked.parse(streamText);
                    } else {
                        targetElement.textContent = streamText;
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                },
                onStreamComplete: (fullText) => {
                    if (typeof marked !== 'undefined') {
                        targetElement.innerHTML = marked.parse(fullText);
                    }
                },
                onCommandReceived: (commands) => {
                    if (signal?.aborted) return;
                    this.processAICommands(commands);
                },
                onError: (error) => {
                    console.error('[DispatchController] AI调用失败:', error);
                }
            }
        );

        if (response) {
            this.historyMessages.push({ role: 'user', content: message });
            this.historyMessages.push({ role: 'assistant', content: response });
        }
    }

    /**
     * 更新计数
     */
    updateCount() {
        const countEl = this.container.querySelector('#letter-count');
        if (countEl) countEl.textContent = Object.keys(this.letters).length;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const chatInput = this.container.querySelector('#ai-chat-input');
        const chatSendBtn = this.container.querySelector('#btn-send-message');

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserSendMessage();
                }
            });
        }

        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', () => {
                this.handleUserSendMessage();
            });
        }

        const autoDispatchCheck = this.container.querySelector('#auto-dispatch-check');
        if (autoDispatchCheck) {
            autoDispatchCheck.addEventListener('change', (e) => {
                this.autoDispatchChecked = e.target.checked;
            });
        }

        const btnDispatch = this.container.querySelector('#btn-dispatch');
        if (btnDispatch) {
            btnDispatch.addEventListener('click', () => {
                this.handleDispatch();
            });
        }

        const btnHandle = this.container.querySelector('#btn-handle');
        if (btnHandle) {
            btnHandle.addEventListener('click', () => {
                this.handleBySelf();
            });
        }

        const btnRemark = this.container.querySelector('#btn-remark');
        if (btnRemark) {
            btnRemark.addEventListener('click', () => {
                this.showRemarkModal();
            });
        }

        const remarkModalClose = this.container.querySelector('#remark-modal-close');
        const btnRemarkCancel = this.container.querySelector('#btn-remark-cancel');
        const remarkModalOverlay = this.container.querySelector('#remark-modal');

        if (remarkModalClose) {
            remarkModalClose.addEventListener('click', () => {
                this.hideRemarkModal();
            });
        }

        if (btnRemarkCancel) {
            btnRemarkCancel.addEventListener('click', () => {
                this.hideRemarkModal();
            });
        }

        if (remarkModalOverlay) {
            remarkModalOverlay.addEventListener('click', (e) => {
                if (e.target === remarkModalOverlay) {
                    this.hideRemarkModal();
                }
            });
        }

        const btnRemarkSave = this.container.querySelector('#btn-remark-save');
        if (btnRemarkSave) {
            btnRemarkSave.addEventListener('click', () => {
                this.saveRemark();
            });
        }
    }

    /**
     * 显示备注弹窗
     */
    showRemarkModal() {
        const modal = this.container.querySelector('#remark-modal');
        const textarea = this.container.querySelector('#remark-textarea');

        if (textarea) {
            textarea.value = this.notes || '';
        }

        modal.style.display = 'flex';
    }

    /**
     * 隐藏备注弹窗
     */
    hideRemarkModal() {
        const modal = this.container.querySelector('#remark-modal');
        modal.style.display = 'none';
    }

    /**
     * 保存备注
     */
    saveRemark() {
        const textarea = this.container.querySelector('#remark-textarea');
        if (textarea) {
            this.notes = textarea.value;
        }
        this.hideRemarkModal();
    }

    /**
     * 处理下发按钮点击
     */
    async handleDispatch() {
        if (!this.selectedLetter) {
            this.showNotification('请先选择要下发的信件', 'warning');
            return;
        }

        if (!this.selectedUnit) {
            this.showNotification('请先选择下发单位', 'warning');
            return;
        }

        const btnDispatch = this.container.querySelector('#btn-dispatch');

        const letterNumber = this.selectedLetter['信件编号'];
        const unitName = this.selectedUnit;
        const confirmMessage = `确定要将信件 ${letterNumber} 下发至 ${unitName} 吗？`;

        const confirmed = await this.showPopoverConfirm(btnDispatch, confirmMessage);
        if (!confirmed) {
            return;
        }

        const dispatchData = this.buildDispatchData();

        try {
            const result = await DispatchTools.dispatchLetter(dispatchData);

            if (window.workplaceController && window.workplaceController.showNotification) {
                const icon = result.success
                    ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>'
                    : '<i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>';
                window.workplaceController.showNotification(
                    `<div style="display: flex; align-items: center; gap: 8px;">${icon}<span>${result.message || result.error}</span></div>`,
                    'bottom',
                    3000
                );
            }

            if (result.success || (result.error && result.error.includes('已被'))) {
                const letterItem = this.container.querySelector(`[data-letter-number="${letterNumber}"]`);

                if (letterItem) {
                    await WpAnimation.moveAndFadeOut(letterItem, 'left', 30, 400, 0);
                }

                const textElements = this.container.querySelectorAll('.wp-text-animate');
                await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

                this.historyMessages = [];

                this.setDetailPanelDisabled(true);

                this.selectedLetter = null;
                this.selectedUnit = null;
                this.letterInfo = null;

                this.clearDetailPanel();

                await this.refresh();
            }
        } catch (error) {
            console.error('下发失败:', error);
            this.showNotification('下发失败，请稍后重试', 'error');
        }
    }

    /**
     * 处理由我来处理按钮点击
     */
    async handleBySelf() {
        if (!this.selectedLetter) {
            this.showNotification('请先选择要处理的信件', 'warning');
            return;
        }

        const letterNumber = this.selectedLetter['信件编号'];
        const btnHandle = this.container.querySelector('#btn-handle');

        const confirmMessage = `确定要自行处理信件 ${letterNumber} 吗？`;

        const confirmed = await this.showPopoverConfirm(btnHandle, confirmMessage);

        if (!confirmed) {
            return;
        }

        try {
            const handleData = this.buildHandleBySelfData();
            const result = await DispatchTools.handleBySelf(handleData);

            if (window.workplaceController && window.workplaceController.showNotification) {
                const icon = result.success
                    ? '<i class="fas fa-check-circle" style="color: #10b981;"></i>'
                    : '<i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>';
                window.workplaceController.showNotification(
                    `<div style="display: flex; align-items: center; gap: 8px;">${icon}<span>${result.message || result.error}</span></div>`,
                    'bottom',
                    3000
                );
            }

            if (result.success) {
                const letterItem = this.container.querySelector(`[data-letter-number="${letterNumber}"]`);

                if (letterItem) {
                    await WpAnimation.moveAndFadeOut(letterItem, 'left', 30, 400, 0);
                }

                const textElements = this.container.querySelectorAll('.wp-text-animate');
                await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

                this.historyMessages = [];

                this.setDetailPanelDisabled(true);

                this.selectedLetter = null;
                this.selectedUnit = null;
                this.letterInfo = null;

                this.clearDetailPanel();

                await this.refresh();
            }
        } catch (error) {
            console.error('自行处理失败:', error);
            this.showNotification('操作失败，请稍后重试', 'error');
        }
    }

    /**
     * 清空详情面板
     */
    clearDetailPanel() {
        const inputs = this.container.querySelectorAll('.wp-editable-field');
        inputs.forEach(input => input.value = '');

        const categoryEl = this.container.querySelector('#detail-category');
        if (categoryEl) categoryEl.textContent = '-';

        const appealContent = this.container.querySelector('#detail-appeal-content');
        if (appealContent) appealContent.value = '';

        const unitInput = this.container.querySelector('#unit-select-input');
        if (unitInput) unitInput.value = '';

        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
    }

    /**
     * 构建下发数据
     */
    buildDispatchData() {
        const data = {
            '信件编号': this.selectedLetter['信件编号'],
            '群众姓名': this.letterInfo?.['群众姓名'] || this.selectedLetter['群众姓名'],
            '手机号': this.letterInfo?.['手机号'] || this.selectedLetter['手机号'],
            '身份证号': this.letterInfo?.['身份证号'] || this.selectedLetter['身份证号'],
            '来信时间': this.letterInfo?.['来信时间'] || this.selectedLetter['来信时间'],
            '来信渠道': this.selectedLetter['来信渠道'],
            '信件一级分类': this.letterInfo?.['信件一级分类'] || this.selectedLetter['信件一级分类'],
            '信件二级分类': this.letterInfo?.['信件二级分类'] || this.selectedLetter['信件二级分类'],
            '信件三级分类': this.letterInfo?.['信件三级分类'] || this.selectedLetter['信件三级分类'],
            '诉求内容': this.letterInfo?.['诉求内容'] || this.selectedLetter['诉求内容'],
            '专项关注标签': this.selectedSpecialFocus || [],
            '当前信件状态': this.selectedLetter['当前信件状态'],
            '当前信件处理单位': this.selectedLetter['当前信件处理单位'],
            '目标单位': this.selectedUnit,
            '下发备注': this.notes,
            '选择的分类': this.selectedCategory,
            '流转记录': this.letterInfo?.['流转记录'] || []
        };

        return data;
    }

    /**
     * 构建自行处理数据
     */
    buildHandleBySelfData() {
        const data = {
            '信件编号': this.selectedLetter['信件编号'],
            '群众姓名': this.letterInfo?.['群众姓名'] || this.selectedLetter['群众姓名'],
            '手机号': this.letterInfo?.['手机号'] || this.selectedLetter['手机号'],
            '身份证号': this.letterInfo?.['身份证号'] || this.selectedLetter['身份证号'],
            '来信时间': this.letterInfo?.['来信时间'] || this.selectedLetter['来信时间'],
            '来信渠道': this.selectedLetter['来信渠道'],
            '信件一级分类': this.letterInfo?.['信件一级分类'] || this.selectedLetter['信件一级分类'],
            '信件二级分类': this.letterInfo?.['信件二级分类'] || this.selectedLetter['信件二级分类'],
            '信件三级分类': this.letterInfo?.['信件三级分类'] || this.selectedLetter['信件三级分类'],
            '诉求内容': this.letterInfo?.['诉求内容'] || this.selectedLetter['诉求内容'],
            '专项关注标签': this.selectedSpecialFocus || [],
            '当前信件状态': this.selectedLetter['当前信件状态'],
            '当前信件处理单位': this.selectedLetter['当前信件处理单位'],
            '选择的分类': this.selectedCategory,
        };

        return data;
    }

    /**
     * 显示气泡确认提示框
     */
    showPopoverConfirm(targetElement, message) {
        return new Promise((resolve) => {
            const popover = document.createElement('div');
            popover.className = 'dispatch-popover-confirm';
            popover.innerHTML = `
                <div class="popover-content">
                    <div class="popover-message">${message}</div>
                    <div class="popover-buttons">
                        <button class="popover-btn popover-btn-cancel">取消</button>
                        <button class="popover-btn popover-btn-confirm">确定</button>
                    </div>
                </div>
                <div class="popover-arrow"></div>
            `;

            popover.style.cssText = `
                position: fixed;
                z-index: 1000;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 12px 16px;
                min-width: 200px;
                visibility: hidden;
            `;

            document.body.appendChild(popover);

            const rect = targetElement.getBoundingClientRect();
            const popoverRect = popover.getBoundingClientRect();

            const top = rect.top - popoverRect.height - 10;
            const left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

            popover.style.top = `${Math.max(10, top)}px`;
            popover.style.left = `${Math.max(10, left)}px`;
            popover.style.visibility = 'visible';

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const handleClickOutside = (e) => {
                if (!popover.contains(e.target)) {
                    cleanup();
                    resolve(false);
                }
            };

            const cleanup = () => {
                popover.querySelector('.popover-btn-confirm').removeEventListener('click', handleConfirm);
                popover.querySelector('.popover-btn-cancel').removeEventListener('click', handleCancel);
                document.removeEventListener('click', handleClickOutside);
                if (popover.parentNode) {
                    popover.parentNode.removeChild(popover);
                }
            };

            popover.querySelector('.popover-btn-confirm').addEventListener('click', handleConfirm);
            popover.querySelector('.popover-btn-cancel').addEventListener('click', handleCancel);

            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 10);
        });
    }

    /**
     * 显示通知提示
     */
    showNotification(message, type = 'info') {
        if (window.workplaceController && window.workplaceController.showNotification) {
            const iconMap = {
                success: '<i class="fas fa-check-circle" style="color: #10b981;"></i>',
                error: '<i class="fas fa-times-circle" style="color: #ef4444;"></i>',
                warning: '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>',
                info: '<i class="fas fa-info-circle" style="color: #3b82f6;"></i>'
            };
            const icon = iconMap[type] || iconMap.info;
            window.workplaceController.showNotification(
                `<div style="display: flex; align-items: center; gap: 8px;">${icon}<span>${message}</span></div>`,
                'bottom',
                3000
            );
        } else {
            alert(message);
        }
    }

    /**
     * 初始化AIController实例
     */
    initAIController() {
        this.aiController = new AIController();
    }

    /**
     * 处理用户发送消息
     */
    async handleUserSendMessage() {
        const chatInput = this.container.querySelector('#ai-chat-input');
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatInput || !chatMessages || !this.aiController) return;

        const message = chatInput.value.trim();
        if (!message) return;

        this.setChatInputDisabled(true);

        chatInput.value = '';

        this.addUserMessage(chatMessages, message);

        const messages = this.buildMessages(message, this.historyMessages);

        const aiMessageElement = this.createAIMessageElement(chatMessages);
        const targetElement = aiMessageElement.querySelector('.dispatch-ai-message-text');

        let streamText = '';
        try {
            const response = await this.aiController.sendMessage(
                messages,
                {
                    onChunk: (char) => {
                        streamText += char;
                        if (typeof marked !== 'undefined') {
                            targetElement.innerHTML = marked.parse(streamText);
                        } else {
                            targetElement.textContent = streamText;
                        }
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    },
                    onStreamComplete: (fullText) => {
                        if (typeof marked !== 'undefined') {
                            targetElement.innerHTML = marked.parse(fullText);
                        }
                    },
                    onCommandReceived: (commands) => {
                        this.processAICommands(commands);
                    },
                    onError: (error) => {
                        console.error('[DispatchController] AI调用失败:', error);
                    }
                }
            );

            if (response) {
                this.historyMessages.push({ role: 'user', content: message });
                this.historyMessages.push({ role: 'assistant', content: response });
            }
        } finally {
            this.setChatInputDisabled(false);
        }
    }

    /**
     * 添加用户消息到界面
     */
    addUserMessage(container, text) {
        const messageHTML = `
            <div class="dispatch-ai-message dispatch-ai-message-user">
                <div class="dispatch-ai-message-content">
                    <div class="dispatch-ai-message-text">${this.escapeHtml(text)}</div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHTML);
        const messageElement = container.lastElementChild;
        WpAnimation.moveAndFadeIn(messageElement, 'down', 20, 300);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 创建AI消息元素
     */
    createAIMessageElement(container) {
        const messageId = 'ai-message-' + Date.now();
        const messageHTML = `
            <div class="dispatch-ai-message dispatch-ai-message-ai" id="${messageId}">
                <div class="dispatch-ai-message-content">
                    <div class="dispatch-ai-message-text"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHTML);
        const messageElement = document.getElementById(messageId);
        WpAnimation.moveAndFadeIn(messageElement, 'down', 20, 300);
        container.scrollTop = container.scrollHeight;
        return messageElement;
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 处理AI命令
     */
    processAICommands(commands) {
        if (!Array.isArray(commands) || commands.length === 0) {
            return;
        }

        commands.forEach((command) => {
            const target = command['目标'];
            let content = command['内容'];

            if (!target || !content) {
                return;
            }

            if (target.includes('分类')) {
                content = DispatchTools.formatCommandContent(content);
                this.validateCategoryInput(content);
            } else if (target.includes('单位')) {
                content = DispatchTools.formatCommandContent(content);
                this.validateUnitInput(content);
            } else if (target.includes('专项关注') || target.includes('关注')) {
                content = DispatchTools.formatSpecialFocusContent(content);
                this.validateSpecialFocusInput(content);
            } else if (target.includes('诉求内容') || target.includes('诉求')) {
                this.validateAppealContentInput(content);
            } else if (target.includes('备注')) {
                this.validateRemarkInput(content);
            }
        });
    }

    /**
     * 验证诉求内容输入
     */
    validateAppealContentInput(content) {
        const inputElement = this.container.querySelector('#detail-appeal-content');
        if (!inputElement) return;

        inputElement.value = content;

        if (this.letterInfo) {
            this.letterInfo['诉求内容'] = content;
        }

        this.flashInputBorder(inputElement);
    }

    /**
     * 验证备注输入
     */
    validateRemarkInput(content) {
        this.notes = content;

        const remarkTextarea = this.container.querySelector('#remark-textarea');
        if (remarkTextarea) {
            remarkTextarea.value = content;
            this.flashInputBorder(remarkTextarea);
        }
    }

    /**
     * 显示页面
     */
    async show() {
        const textElements = this.container.querySelectorAll('.wp-text-animate');
        textElements.forEach(el => {
            el.classList.remove('fading-out', 'fading-in');
            el.style.opacity = '1';
            el.style.transform = 'translateX(0)';
        });

        // 异步刷新数据（不阻塞页面切换）
        this.refresh().catch(err => {
            console.error('[DispatchController] 刷新数据失败:', err);
        });
    }

    /**
     * 停止所有动画
     * 当页面切换时立即调用，确保动画不会阻塞页面切换
     */
    stopAnimation() {
        console.log('[DispatchController] 停止动画');
        // 确保重置所有元素到可见状态
        this.ensureElementsVisible();
    }

    /**
     * 隐藏页面
     */
    hide() {
        this.stopPolling();
    }

    /**
     * 刷新数据
     */
    async refresh() {
        if (this.isInitialized) {
            await this.loadData();
        }
    }

    /**
     * 构建AI消息列表
     */
    buildMessages(userMessage, messageHistory) {
        return DispatchTools.buildMessages({
            userMessage,
            messageHistory,
            prompt: this.prompt,
            letterInfo: this.letterInfo,
            sameIdLetter: this.sameIdLetter,
            autoDispatchChecked: this.autoDispatchChecked,
            units: this.units,
            notes: this.notes
        });
    }
}
