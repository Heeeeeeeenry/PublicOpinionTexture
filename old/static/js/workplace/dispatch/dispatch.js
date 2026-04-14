/**
 * 下发工作台控制器
 *
 * 负责下发工作台的初始化、主要逻辑控制和事件绑定
 * 动画效果由 DispatchAnimation 提供
 * HTML生成由 dispatch-html.js 提供
 */

import * as dispatchHtml from './dispatch-html.js';
import { DispatchTools } from './dispatch-tools.js';

export class DispatchController {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.letters = {}; // 记录全部信件的详细信息，以信件编号为key
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

        // 渲染过程状态标记
        this.isRenderingMessages = false;
        this.renderAbortController = null;

        // 首次进入动画状态
        this.initStartAnimationOver = false;
        this.initStartAnimationInterrupt = false;
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

            // 确保所有文字元素可见
            const textElements = detailPanel.querySelectorAll('.animate-text');
            textElements.forEach(el => {
                el.classList.remove('fading-out', 'fading-in');
                el.classList.add('visible');
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });

            // 确保详情面板内的主要区域可见
            const detailInfo = detailPanel.querySelector('.detail-info');
            const detailContent = detailPanel.querySelector('.detail-content');
            const detailMiddle = detailPanel.querySelector('.detail-middle');
            const detailBottom = detailPanel.querySelector('.detail-bottom');

            [detailInfo, detailContent, detailMiddle, detailBottom].forEach(el => {
                if (el) {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                }
            });
        }
    }

    async init(container) {
        this.container = container;
        this.loadStyles();

        // 生成HTML结构
        await this.renderHTML();

        // 获取系统提示词
        this.prompt = await DispatchTools.getSystemPrompts();

        await this.loadData();
        this.bindEvents();

        // 初始化AIController实例
        this.initAIController();

        // 执行首次进入动画（仅首次）
        if (!this.animationPlayed) {
            const header = this.container.querySelector('#dispatch-header');
            const leftPanel = this.container.querySelector('#letter-list-panel');
            const rightPanel = this.container.querySelector('#letter-detail-panel');

            await DispatchAnimation.initStart(header, leftPanel, rightPanel);
            this.animationPlayed = true;
        }

        this.isInitialized = true;

        // 启动轮询
        this.startPolling();

        // 初始化下拉框
        await this.initDropdowns();
    }

    /**
     * 渲染HTML结构
     */
    async renderHTML() {
        this.container.innerHTML = dispatchHtml.getFullPageHtml();
    }

    /**
     * 初始化下拉框
     */
    async initDropdowns() {
        // 加载数据
        const [categories, specialFocus] = await Promise.all([
            DispatchTools.loadCategories(),
            DispatchTools.loadSpecialFocus()
        ]);

        this.categories = categories;
        this.specialFocus = specialFocus;

        // 初始化信件分类下拉框
        this.initCategoryDropdown();

        // 初始化下发单位下拉框（使用已有的units数据）
        this.initUnitDropdown();

        // 初始化专项关注下拉框
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

        // 格式化分类数据为选项 - 每行显示完整三级分类
        const formatCategoryOptions = () => {
            return this.categories.map(cat => {
                const fullPath = `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}`;
                return {
                    type: 'option',
                    value: fullPath,
                    label: fullPath
                };
            });
        };

        this.renderDropdownOptions(optionsContainer, formatCategoryOptions());
        this.bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, (value) => {
            this.selectedCategory = value;

            // 用户手动选择时，也需要更新letterInfo
            const matchedCategory = this.categories.find(cat =>
                `${cat['一级分类']} / ${cat['二级分类']} / ${cat['三级分类']}` === value
            );
            if (matchedCategory && this.letterInfo) {
                this.letterInfo['信件一级分类'] = matchedCategory['一级分类'];
                this.letterInfo['信件二级分类'] = matchedCategory['二级分类'];
                this.letterInfo['信件三级分类'] = matchedCategory['三级分类'];
                console.log('[initCategoryDropdown] 用户手动选择，更新letterInfo:', this.letterInfo);
            }

            // 同时更新span显示
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

        // 格式化单位数据为选项 - 显示完整单位路径
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
            // 用户手动选择时，value已经是单位全称
            this.selectedUnit = value;

            // 根据单位全称查找对应的单位编码，用于更新letterInfo
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
                        console.log('[initUnitDropdown] 用户手动选择，更新letterInfo中的建议办理单位:', unitFullName);
                    } catch (e) {
                        // 解析失败，忽略
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

        // 初始化多选数组
        this.selectedSpecialFocus = [];

        // 渲染多选选项
        this.renderMultiSelectOptions(optionsContainer, this.specialFocus);

        // 绑定多选下拉框事件
        this.bindMultiSelectEvents(container, input, dropdown, searchInput, optionsContainer, (values) => {
            this.selectedSpecialFocus = values;

            // 用户手动选择时，也需要更新letterInfo
            if (this.letterInfo) {
                this.letterInfo['专项关注标签'] = values.join(' / ');
                console.log('[initSpecialFocusDropdown] 用户手动选择，更新letterInfo中的专项关注:', values);
            }
        });
    }

    /**
     * 渲染多选下拉框选项
     */
    renderMultiSelectOptions(container, items) {
        container.innerHTML = items.map(item => `
            <div class="select-option" data-value="${item['专项关注标题']}">
                <div class="select-option-checkbox"></div>
                <div class="select-option-label">${item['专项关注标题']}</div>
            </div>
        `).join('');
    }

    /**
     * 绑定多选下拉框事件
     */
    bindMultiSelectEvents(container, input, dropdown, searchInput, optionsContainer, onChange) {
        // 点击输入框展开/收起下拉框
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            // 关闭所有其他下拉框
            this.container.querySelectorAll('.searchable-select').forEach(el => el.classList.remove('active'));
            if (!isActive) {
                container.classList.add('active');
                searchInput.focus();
            }
        });

        // 点击选项（多选）
        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.select-option');
            if (option) {
                const value = option.dataset.value;

                // 切换选中状态
                option.classList.toggle('selected');

                // 获取所有选中的值
                const selectedOptions = optionsContainer.querySelectorAll('.select-option.selected');
                const selectedValues = Array.from(selectedOptions).map(opt => opt.dataset.value);

                // 更新输入框显示
                if (selectedValues.length > 0) {
                    input.value = selectedValues.join(' / ');
                } else {
                    input.value = '';
                }

                // 回调通知选中值变化
                onChange(selectedValues);
            }
        });

        // 搜索功能
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.select-option');
            options.forEach(opt => {
                const label = opt.querySelector('.select-option-label').textContent.toLowerCase();
                opt.style.display = label.includes(keyword) ? '' : 'none';
            });
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
            }
        });
    }

    /**
     * 渲染下拉框选项
     */
    renderDropdownOptions(container, options) {
        container.innerHTML = options.map(opt => {
            if (opt.type === 'group') {
                return `<div class="select-option-group">${opt.label}</div>`;
            }
            return `<div class="select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
        }).join('');
    }

    /**
     * 绑定下拉框事件
     */
    bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, onSelect) {
        // 点击输入框展开/收起下拉框
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            // 关闭所有其他下拉框
            this.container.querySelectorAll('.searchable-select').forEach(el => el.classList.remove('active'));
            if (!isActive) {
                container.classList.add('active');
                searchInput.focus();
            }
        });

        // 点击选项
        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.select-option');
            if (option) {
                const value = option.dataset.value;
                const label = option.textContent;
                input.value = label;
                onSelect(value);
                container.classList.remove('active');

                // 更新选中状态
                optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });

        // 搜索功能
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.select-option');
            options.forEach(opt => {
                const text = opt.textContent.toLowerCase();
                const path = (opt.dataset.path || '').toLowerCase();
                opt.style.display = (text.includes(keyword) || path.includes(keyword)) ? '' : 'none';
            });
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                container.classList.remove('active');
            }
        });
    }

    /**
     * 根据信件信息设置下拉框值
     */
    setDropdownValues(letter) {
        // 设置信件分类 - 显示完整三级分类路径
        const categoryInput = this.container.querySelector('#category-select-input');
        const categoryValue = `${letter['信件一级分类']} / ${letter['信件二级分类']} / ${letter['信件三级分类']}`;
        categoryInput.value = categoryValue;
        this.selectedCategory = categoryValue;

        // 设置下发单位（从letterInfo的流转记录中获取建议单位）- 显示完整单位路径
        const unitInput = this.container.querySelector('#unit-select-input');
        const flowRecords = this.letterInfo?.['流转记录'];
        if (Array.isArray(flowRecords)) {
            // 查找生成记录中的建议办理单位
            const generateRecord = flowRecords.find(record => record['操作类型'] === '生成');
            if (generateRecord && generateRecord['备注']) {
                const remark = generateRecord['备注'];
                const suggestedUnits = remark['建议下发办理单位'];
                if (suggestedUnits && suggestedUnits.length > 0) {
                    // 直接使用单位全称，无需查表
                    const fullUnitName = suggestedUnits.join(' / ');
                    unitInput.value = fullUnitName;
                    this.selectedUnit = fullUnitName;
                }
            }
        }

        // 专项关注不自动填入，保持用户选择
    }

    /**
     * 验证信件分类输入内容
     * @param {string} content - 需要验证的分类内容
     * @returns {Object} 验证结果
     */
    validateCategoryInput(content) {
        const result = DispatchTools.validateCategoryContent(content, this.categories);
        const inputElement = this.container.querySelector('#category-select-input');

        if (result.valid) {
            // 验证通过，更新输入框值
            const displayValue = result.correctedValue || content;
            inputElement.value = displayValue;
            this.selectedCategory = displayValue;

            // 更新letterInfo中的分类信息
            console.log('[validateCategoryInput] 更新前 this.letterInfo:', this.letterInfo);
            console.log('[validateCategoryInput] result.matched:', result.matched);
            if (this.letterInfo && result.matched) {
                this.letterInfo['信件一级分类'] = result.matched['一级分类'];
                this.letterInfo['信件二级分类'] = result.matched['二级分类'];
                this.letterInfo['信件三级分类'] = result.matched['三级分类'];
                console.log('[validateCategoryInput] 更新后 this.letterInfo:', this.letterInfo);
            } else {
                console.warn('[validateCategoryInput] 未更新letterInfo, letterInfo存在:', !!this.letterInfo, 'matched存在:', !!result.matched);
            }

            // 同时更新span显示
            const categorySpan = this.container.querySelector('#detail-category');
            if (categorySpan) {
                categorySpan.textContent = displayValue;
            }

            // AI修改输入框，显示红色呼吸效果
            DispatchAnimation.flashInputBorder(inputElement);
            console.log('[分类验证]', result.message, result.matched);
        } else {
            // 验证失败，显示错误提示
            DispatchTools.showValidationError(inputElement, result.message);
            console.warn('[分类验证]', result.message);
        }

        return result;
    }

    /**
     * 验证下发单位输入内容
     * @param {string} content - 需要验证的单位内容
     * @returns {Object} 验证结果
     */
    validateUnitInput(content) {
        const result = DispatchTools.validateUnitContent(content, this.units);
        const inputElement = this.container.querySelector('#unit-select-input');

        if (result.valid) {
            // 验证通过，更新输入框值
            const displayValue = result.correctedValue || content;
            inputElement.value = displayValue;
            // 使用单位全称
            this.selectedUnit = result.matched
                ? [result.matched['一级'], result.matched['二级'], result.matched['三级']].filter(Boolean).join(' / ')
                : content;

            // 更新letterInfo中的单位信息（存储在流转记录的备注中）
            if (this.letterInfo && result.matched) {
                // 单位信息通常存储在流转记录中，这里更新建议办理单位（存储单位全称）
                const flowRecords = this.letterInfo['流转记录'] || [];
                const generateRecord = flowRecords.find(record => record['操作类型'] === '生成');
                if (generateRecord) {
                    try {
                        const remark = JSON.parse(generateRecord['备注'] || '{}');
                        const unitFullName = [result.matched['一级'], result.matched['二级'], result.matched['三级']].filter(Boolean).join(' / ');
                        remark['建议办理单位'] = unitFullName;
                        generateRecord['备注'] = JSON.stringify(remark);
                    } catch (e) {
                        // 解析失败，忽略
                    }
                }
            }

            // AI修改输入框，显示红色呼吸效果
            DispatchAnimation.flashInputBorder(inputElement);
            console.log('[单位验证]', result.message, result.matched);
        } else {
            // 验证失败，显示错误提示
            DispatchTools.showValidationError(inputElement, result.message);
            console.warn('[单位验证]', result.message);
        }

        return result;
    }

    /**
     * 验证专项关注输入内容并自动勾选下拉框
     * @param {string} content - 需要验证的专项关注内容，用"/"分隔
     * @returns {Object} 验证结果
     */
    validateSpecialFocusInput(content) {
        const result = DispatchTools.validateSpecialFocusContent(content, this.specialFocus);
        const container = this.container.querySelector('#focus-select-container');
        const inputElement = this.container.querySelector('#focus-select-input');

        if (result.valid) {
            // 验证通过，自动勾选匹配的选项
            DispatchTools.autoSelectSpecialFocusOptions(
                container,
                result.matched,
                (values) => {
                    this.selectedSpecialFocus = values;
                }
            );

            // 更新letterInfo中的专项关注标签
            if (this.letterInfo) {
                this.letterInfo['专项关注标签'] = result.matched.join(' / ');
            }

            // AI修改输入框，显示红色呼吸效果
            DispatchAnimation.flashInputBorder(inputElement);
            console.log('[专项关注验证]', result.message, result.matched);
        } else {
            // 验证失败，显示错误提示
            DispatchTools.showValidationError(inputElement, result.message);
            console.warn('[专项关注验证]', result.message);
        }

        return result;
    }

    /**
     * 启动轮询，每5秒更新信件列表
     */
    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;

        // 立即执行一次，然后每5秒执行
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
     * 轮询获取信件列表并处理变化
     */
    async pollLetters() {
        const newLetters = await DispatchTools.getLetters();

        // 按来信时间排序（越早的越靠上）
        newLetters.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        // 将数组转换为字典
        const newLettersDict = {};
        newLetters.forEach(letter => {
            newLettersDict[letter['信件编号']] = letter;
        });

        // 处理信件列表变化
        await this.handleLetterChanges(newLetters, newLettersDict);

        // 更新计数
        this.updateCount();
    }

    /**
     * 处理信件列表变化
     * @param {Array} newLetters - 新的信件列表
     * @param {Object} newLettersDict - 新的信件字典
     */
    async handleLetterChanges(newLetters, newLettersDict) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        // 比对信件变化
        const { deleted, added, modified } = DispatchTools.compareLetters(this.letters, newLettersDict);

        // 如果没有变化，直接返回
        if (deleted.length === 0 && added.length === 0 && modified.length === 0) {
            return;
        }

        // 在更新数据前，先判断状态变化
        const hadLettersBefore = Object.keys(this.letters).length > 0;
        const hasLettersNow = newLetters.length > 0;

        // 更新数据
        this.letters = newLettersDict;

        // 处理从空状态变为有信件的特殊情况
        if (!hadLettersBefore && hasLettersNow) {
            // 从0封信件变为有信件，清空面板并使用动画添加第一封信件
            const panel = this.container.querySelector('#letter-list-panel');
            if (panel) {
                panel.innerHTML = '';
            }

            // 使用动画添加第一封信件（从左侧滑入）
            const firstLetter = newLetters[0];
            await this.animateAddLetter(firstLetter);

            // 启用右侧面板并选中第一个
            this.setDetailPanelDisabled(false);
            // 使用await确保选中信件完成
            await this.selectLetter(firstLetter);
            // 更新计数
            this.updateCount();
            return;
        } else if (hadLettersBefore && !hasLettersNow) {
            // 从有信件变为0封信件，中断AI回复并清空界面

            // 中断大模型回复
            if (this.isRenderingMessages) {
                console.log('[DispatchController] 信件被清空，中断AI回复');

                if (this.aiController) {
                    this.aiController.abortStream();
                }

                if (this.renderAbortController) {
                    this.renderAbortController.abort();
                    this.renderAbortController = null;
                }

                this.isRenderingMessages = false;
            }

            // 清空AI聊天内容
            const chatMessages = this.container.querySelector('#ai-chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }

            // 清空三个下拉框的值
            const categoryInput = this.container.querySelector('#category-select-input');
            const unitInput = this.container.querySelector('#unit-select-input');
            const focusInput = this.container.querySelector('#focus-select-input');

            if (categoryInput) categoryInput.value = '';
            if (unitInput) unitInput.value = '';
            if (focusInput) focusInput.value = '';

            // 清空专项关注选中状态
            this.selectedCategory = null;
            this.selectedUnit = null;
            this.selectedSpecialFocus = [];

            // 清空信件信息、聊天上下文和同身份证信件
            this.letterInfo = {};
            this.sameIdLetter = [];
            this.historyMessages = [];

            // 动画滑出右侧文字元素
            const textElements = this.container.querySelectorAll('.animate-text');
            const elements = {
                textElements: Array.from(textElements)
            };
            await DispatchAnimation.letterInfoAnimation(elements, 'hide');

            // 重新渲染列表（显示空状态）
            this.renderLetterList();
            // 禁用右侧面板
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
            // 更新计数
            this.updateCount();
            return;
        }

        // 处理删除 - 动画划出
        for (const letterNumber of deleted) {
            await this.animateRemoveLetter(letterNumber);
        }

        // 处理修改 - 划出后滑入
        for (const letterNumber of modified) {
            const letter = newLettersDict[letterNumber];
            await this.animateModifyLetter(letter);
        }

        // 处理新增 - 动画滑入
        for (const letterNumber of added) {
            const letter = newLettersDict[letterNumber];
            await this.animateAddLetter(letter);
        }

        // 如果当前选中的信件被删除，处理切换
        if (this.selectedLetter && deleted.includes(this.selectedLetter['信件编号'])) {
            // 中断大模型回复
            if (this.isRenderingMessages) {
                console.log('[DispatchController] 当前信件被删除，中断AI回复');

                // 中断AI流式回复
                if (this.aiController) {
                    this.aiController.abortStream();
                }

                // 中断当前的渲染过程
                if (this.renderAbortController) {
                    this.renderAbortController.abort();
                    this.renderAbortController = null;
                }

                // 重置渲染状态
                this.isRenderingMessages = false;
            }

            // 清空AI聊天内容和聊天上下文
            const chatMessages = this.container.querySelector('#ai-chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            this.historyMessages = [];

            // 清空信件信息和同身份证信件
            this.letterInfo = {};
            this.sameIdLetter = [];

            // 使用动画滑出右侧详情元素
            const textElements = this.container.querySelectorAll('.animate-text');
            const inputs = this.container.querySelectorAll('.select-input');
            const buttons = this.container.querySelectorAll('.action-btn');

            const elements = {
                textElements: Array.from(textElements),
                inputs: Array.from(inputs),
                buttons: Array.from(buttons)
            };

            // 滑出右侧详情元素
            await DispatchAnimation.letterInfoAnimation(elements, 'hide');

            if (newLetters.length > 0) {
                this.selectLetter(newLetters[0]);
            } else {
                this.selectedLetter = null;
                // 如果没有信件了，禁用右侧面板
                this.setDetailPanelDisabled(true);
            }
        }

        // 更新计数
        this.updateCount();
    }

    /**
     * 动画添加信件 - 从左侧滑入
     * @param {Object} letter - 信件数据
     */
    async animateAddLetter(letter) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        // 获取插入位置
        const lettersArray = Object.values(this.letters);
        const insertIndex = lettersArray.findIndex(l => l['信件编号'] === letter['信件编号']);
        if (insertIndex === -1) return;

        // 创建新元素
        const html = DispatchTools.renderLetterListItemHTML(letter, this.selectedLetter?.['信件编号']);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newElement = tempDiv.firstElementChild;

        // 插入到正确位置
        const existingItems = panel.querySelectorAll('.letter-list-item');
        if (insertIndex < existingItems.length) {
            existingItems[insertIndex].insertAdjacentElement('beforebegin', newElement);
        } else {
            panel.appendChild(newElement);
        }

        // 绑定点击事件
        newElement.addEventListener('click', () => {
            const letterNumber = newElement.dataset.letterNumber;
            const letter = this.letters[letterNumber];
            if (letter) this.selectLetter(letter);
        });

        // 执行滑入动画
        await DispatchAnimation.letterItemAnimation(newElement, 'add');
    }

    /**
     * 动画删除信件 - 从左侧划出
     * @param {string} letterNumber - 信件编号
     */
    async animateRemoveLetter(letterNumber) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const element = panel.querySelector(`[data-letter-number="${letterNumber}"]`);
        if (!element) return;

        // 执行划出动画
        await DispatchAnimation.letterItemAnimation(element, 'delete');

        // 移除元素
        element.remove();
    }

    /**
     * 动画修改信件 - 划出后滑入
     * @param {Object} letter - 信件数据
     */
    async animateModifyLetter(letter) {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const element = panel.querySelector(`[data-letter-number="${letter['信件编号']}"]`);
        if (!element) return;

        // 执行更新动画（滑出后滑入）
        await DispatchAnimation.letterItemAnimation(element, 'update');
    }

    loadStyles() {
        const styleId = 'dispatch-styles';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = '/static/css/workplace/dispatch/dispatch.css';
            document.head.appendChild(link);
        }
    }

    async loadData() {
        // 并行加载信件和单位数据
        const [lettersArray, units] = await Promise.all([
            DispatchTools.getLetters(),
            DispatchTools.loadUnits()
        ]);

        // 按来信时间排序（越早的越靠上）
        lettersArray.sort((a, b) => {
            const timeA = new Date(a['来信时间'] || 0);
            const timeB = new Date(b['来信时间'] || 0);
            return timeA - timeB;
        });

        // 将数组转换为字典
        this.letters = {};
        lettersArray.forEach(letter => {
            this.letters[letter['信件编号']] = letter;
        });

        this.units = units;

        this.renderLetterList();

        // 根据信件数量设置右侧面板状态
        const lettersList = Object.values(this.letters);
        if (lettersList.length > 0) {
            // 有信件，启用右侧面板并选中第一个
            this.setDetailPanelDisabled(false);
            this.selectLetter(lettersList[0]);
        } else {
            // 没有信件，禁用右侧面板
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
        }

        // 更新计数
        this.updateCount();
    }

    renderLetterList() {
        const panel = this.container.querySelector('#letter-list-panel');
        if (!panel) return;

        const selectedNumber = this.selectedLetter?.['信件编号'];
        const lettersArray = Object.values(this.letters);
        panel.innerHTML = DispatchTools.renderLetterListHTML(lettersArray, selectedNumber);

        // 绑定列表项点击事件
        panel.querySelectorAll('.letter-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const letterNumber = item.dataset.letterNumber;
                const letter = this.letters[letterNumber];
                if (letter) this.selectLetter(letter);
            });
        });
    }

    async selectLetter(letter) {
        // 如果点击的是当前已选中的信件，不做任何操作
        if (this.selectedLetter && this.selectedLetter['信件编号'] === letter['信件编号']) {
            return;
        }

        // 如果正在渲染消息，立即停止
        if (this.isRenderingMessages) {
            console.log('[DispatchController] 切换信件，中断当前渲染');

            // 中断AI流式回复
            if (this.aiController) {
                this.aiController.abortStream();
            }

            // 中断当前的渲染过程
            if (this.renderAbortController) {
                this.renderAbortController.abort();
                this.renderAbortController = null;
            }

            // 重置渲染状态
            this.isRenderingMessages = false;
        }

        this.selectedLetter = letter;

        // 清空聊天上下文和历史记录
        this.historyMessages = [];

        // 更新列表选中状态
        this.renderLetterList();

        // 执行切换动画
        await this.animateLetterSwitch(letter);
    }

    /**
     * 执行信件切换动画
     * @param {Object} letter - 新选中的信件
     */
    async animateLetterSwitch(letter) {
        const textElements = this.container.querySelectorAll('.animate-text');
        const chatMessages = this.container.querySelector('#ai-chat-messages');

        // 准备动画元素（只包含文字元素，输入框、按钮等不参与动画）
        const elements = {
            textElements: Array.from(textElements)
        };

        // 第一步：隐藏元素
        await DispatchAnimation.letterInfoAnimation(elements, 'hide');

        // AI聊天内容淡出
        if (chatMessages) {
            chatMessages.classList.add('fading-out');
        }

        // 清空AI聊天内容
        if (chatMessages) {
            chatMessages.innerHTML = '';
            chatMessages.classList.remove('fading-out');
        }

        // 清空之前的信件信息和同身份证信件
        this.letterInfo = {};
        this.sameIdLetter = [];

        // 填充新的详情内容
        DispatchTools.fillLetterDetail(this.container, letter);

        // 绑定可编辑输入框事件
        this.bindEditableInputs();

        // 第二步：显示元素
        await DispatchAnimation.letterInfoAnimation(elements, 'show');

        // 获取并保存信件完整信息（包含信件表、流转表、文件表）
        const fullDetail = await DispatchTools.getLetterFullDetail(letter['信件编号']);
        if (fullDetail) {
            this.letterInfo = fullDetail;
            console.log(this.letterInfo);

            // 根据身份证号查询该身份证下的其他信件
            if (fullDetail['身份证号']) {
                this.sameIdLetter = await DispatchTools.getLettersByIdCard(fullDetail['身份证号'], letter['信件编号']);
                console.log('同身份证其他信件:', this.sameIdLetter);
            }
        }

        // 设置下拉框值
        this.setDropdownValues(letter);

        // 等待1秒后开始渲染AI消息
        setTimeout(() => {
            this.renderAIChatMessages();
        }, 1000);
    }

    /**
     * 绑定可编辑输入框的点击事件
     */
    bindEditableInputs() {
        // 字段映射：id -> letterInfo字段名
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

            // 点击时移除readonly，允许编辑
            input.addEventListener('click', function(e) {
                e.stopPropagation();
                this.readOnly = false;
                this.focus();
                // textarea不添加蓝色背景，只添加边框
                if (this.tagName === 'TEXTAREA') {
                    this.classList.add('ring-2', 'ring-blue-200');
                } else {
                    this.classList.add('bg-blue-50', 'ring-2', 'ring-blue-200');
                }
            });

            // 失去焦点时恢复readonly并保存
            input.addEventListener('blur', () => {
                input.readOnly = true;
                input.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-200');
                // 保存编辑内容
                if (fieldName) {
                    this.saveFieldEdit(input, fieldName);
                }
            });

            // 按下Enter键时失去焦点（对于textarea使用Ctrl+Enter）
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
                        // 恢复原始值
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
     * 渲染AI聊天消息序列
     * 依次显示："正在查看信件..."、"正在获取该群众之前写过的信件..."，然后自动发送消息
     */
    async renderAIChatMessages() {
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages || !this.aiController) return;

        // 禁用输入框和发送按钮
        this.setChatInputDisabled(true);

        // 创建新的AbortController用于本次渲染
        this.renderAbortController = new AbortController();
        const { signal } = this.renderAbortController;

        // 标记开始渲染
        this.isRenderingMessages = true;

        try {
            // 清空现有消息
            chatMessages.innerHTML = '';

            // 添加第一条AI消息："正在查看信件..."
            if (signal.aborted) return;
            this.currentAIMessageElement = this.createAIMessageElement(chatMessages);
            this.currentAIMessageElement.querySelector('.ai-message-text').textContent = '正在查看信件...';

            // 等待2秒（可中断）
            await this.delayWithAbort(2000, signal);
            if (signal.aborted) return;

            // 添加第二条AI消息："正在获取该群众之前写过的信件..."
            this.currentAIMessageElement = this.createAIMessageElement(chatMessages);
            this.currentAIMessageElement.querySelector('.ai-message-text').textContent = '正在获取该群众之前写过的信件...';

            // 等待2秒（可中断）
            await this.delayWithAbort(2000, signal);
            if (signal.aborted) return;

            // 自动发送消息给大模型（不渲染用户聊天框）
            await this.autoSendMessageToAI('检查一下信件', signal);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[DispatchController] 渲染过程被中断');
            } else {
                console.error('[DispatchController] 渲染消息失败:', error);
            }
        } finally {
            // 重置渲染状态
            this.isRenderingMessages = false;
            this.renderAbortController = null;
            // 启用输入框和发送按钮
            this.setChatInputDisabled(false);
        }
    }

    /**
     * 可中断的延迟函数
     * @param {number} ms - 延迟毫秒数
     * @param {AbortSignal} signal - 中断信号
     * @returns {Promise<void>}
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
     * 设置AI聊天输入框和发送按钮的启用/禁用状态
     * @param {boolean} disabled - true表示禁用，false表示启用
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
                chatInput.placeholder = '输入消息...';
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
     * 自动发送消息给大模型（不渲染用户聊天框）
     * @param {string} message - 要发送的消息
     * @param {AbortSignal} signal - 中断信号（可选）
     */
    async autoSendMessageToAI(message, signal = null) {
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages || !this.aiController) return;

        // 检查是否已中断
        if (signal?.aborted) return;

        // 使用buildMessages构建完整消息列表
        // buildMessages会自动组装：系统提示词 + 信件信息 + 历史来信 + 用户消息
        const messages = this.buildMessages(message, this.historyMessages);

        // 创建AI消息元素（用于流式渲染）
        const aiMessageElement = this.createAIMessageElement(chatMessages);
        const targetElement = aiMessageElement.querySelector('.ai-message-text');

        // 发送消息
        let streamText = '';
        const response = await this.aiController.sendMessage(
            messages,
            {
                onChunk: (char) => {
                    // 检查是否已中断
                    if (signal?.aborted) return;

                    // 累积字符并实时格式化
                    streamText += char;
                    if (typeof marked !== 'undefined') {
                        targetElement.innerHTML = marked.parse(streamText);
                    } else {
                        targetElement.textContent = streamText;
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                },
                onStreamComplete: (fullText) => {
                    console.log('[DispatchController] AI回复完成');
                    // 流式完成后，确保最终使用marked.js格式化
                    if (typeof marked !== 'undefined') {
                        targetElement.innerHTML = marked.parse(fullText);
                    }
                },
                onCommandReceived: (commands) => {
                    // 检查是否已中断
                    if (signal?.aborted) return;
                    this.processAICommands(commands);
                },
                onError: (error) => {
                    console.error('[DispatchController] AI调用失败:', error);
                }
            }
        );

        // 添加到历史记录
        if (response) {
            this.historyMessages.push({ role: 'user', content: message });
            this.historyMessages.push({ role: 'assistant', content: response });
        }
    }

    updateCount() {
        const countEl = this.container.querySelector('#letter-count');
        if (countEl) countEl.textContent = Object.keys(this.letters).length;
    }

    bindEvents() {
        // 按钮逻辑待重新设计

        // AI聊天输入框回车发送
        const chatInput = this.container.querySelector('#ai-chat-input');
        const chatSendBtn = this.container.querySelector('#btn-send-message');

        if (chatInput) {
            // 回车发送
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserSendMessage();
                }
            });
        }

        if (chatSendBtn) {
            // 点击发送按钮
            chatSendBtn.addEventListener('click', () => {
                this.handleUserSendMessage();
            });
        }

        // 自动下发复选框
        const autoDispatchCheck = this.container.querySelector('#auto-dispatch-check');
        if (autoDispatchCheck) {
            autoDispatchCheck.addEventListener('change', (e) => {
                this.autoDispatchChecked = e.target.checked;
            });
        }

        // 绑定可编辑字段的点击事件（仅非input元素）
        this.bindEditableFields();

        // 下发按钮
        const btnDispatch = this.container.querySelector('#btn-dispatch');
        if (btnDispatch) {
            btnDispatch.addEventListener('click', () => {
                this.handleDispatch();
            });
        }

        // 由我来处理按钮
        const btnHandle = this.container.querySelector('#btn-handle');
        if (btnHandle) {
            btnHandle.addEventListener('click', () => {
                this.handleBySelf();
            });
        }

        // 备注按钮
        const btnRemark = this.container.querySelector('#btn-remark');
        if (btnRemark) {
            btnRemark.addEventListener('click', () => {
                this.showRemarkModal();
            });
        }

        // 备注弹窗关闭按钮
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

        // 备注保存按钮
        const btnRemarkSave = this.container.querySelector('#btn-remark-save');
        if (btnRemarkSave) {
            btnRemarkSave.addEventListener('click', () => {
                this.saveRemark();
            });
        }

        // 弹窗关闭按钮 - 逻辑待重新设计
        const modalClose = this.container.querySelector('#modal-close');
        const btnCancel = this.container.querySelector('#btn-cancel');
        const modalOverlay = this.container.querySelector('#dispatch-modal');

        if (modalClose) {
            modalClose.addEventListener('click', () => {
                // TODO: 重新设计弹窗关闭逻辑
                console.log('[DispatchController] 弹窗关闭按钮点击 - 逻辑待重新设计');
            });
        }

        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                // TODO: 重新设计取消按钮逻辑
                console.log('[DispatchController] 取消按钮点击 - 逻辑待重新设计');
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    // TODO: 重新设计点击遮罩层关闭逻辑
                    console.log('[DispatchController] 点击遮罩层 - 逻辑待重新设计');
                }
            });
        }

        // 确认下发按钮 - 逻辑待重新设计
        const btnConfirmDispatch = this.container.querySelector('#btn-confirm-dispatch');
        if (btnConfirmDispatch) {
            btnConfirmDispatch.addEventListener('click', () => {
                // TODO: 重新设计确认下发按钮逻辑
                console.log('[DispatchController] 确认下发按钮点击 - 逻辑待重新设计');
            });
        }
    }

    /**
     * 显示备注弹窗
     */
    showRemarkModal() {
        const modal = this.container.querySelector('#remark-modal');
        const textarea = this.container.querySelector('#remark-textarea');

        // 设置初始值为当前的notes
        if (textarea) {
            textarea.value = this.notes || '';
        }

        // 显示弹窗
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
            console.log('[DispatchController] 备注已保存:', this.notes);
        }
        this.hideRemarkModal();
    }

    /**
     * 显示下发弹窗 - 逻辑待重新设计
     */
    showDispatchModal() {
        // TODO: 重新设计下发弹窗逻辑
        console.log('[DispatchController] 显示下发弹窗 - 逻辑待重新设计');
    }

    /**
     * 隐藏下发弹窗 - 逻辑待重新设计
     */
    hideDispatchModal() {
        // TODO: 重新设计隐藏下发弹窗逻辑
        console.log('[DispatchController] 隐藏下发弹窗 - 逻辑待重新设计');
    }

    /**
     * 处理下发按钮点击
     * 显示气泡确认提示，用户确认后发送数据到后台
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

        // 获取下发按钮元素
        const btnDispatch = this.container.querySelector('#btn-dispatch');

        // 构建确认提示内容
        const letterNumber = this.selectedLetter['信件编号'];
        const unitName = this.selectedUnit;
        const confirmMessage = `确定要将信件 ${letterNumber} 下发至 ${unitName} 吗？`;

        // 添加详细日志，查看当前用户信息和下发单位信息
        console.log('========== 下发按钮点击日志 ==========');
        console.log('当前用户信息:', window.workplaceController?.currentUser);
        console.log('用户单位名称:', window.workplaceController?.currentUser?.unit_name);
        console.log('选中的目标单位:', this.selectedUnit);
        console.log('====================================');

        // 显示气泡确认提示框
        const confirmed = await this.showPopoverConfirm(btnDispatch, confirmMessage);
        if (!confirmed) {
            return;
        }

        // 构建下发数据
        const dispatchData = this.buildDispatchData();

        // 发送到后台
        try {
            const result = await DispatchTools.dispatchLetter(dispatchData);

            // 使用workplaceController的提示方法显示结果
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

            // 如果成功或被他人处理，执行左滑动画并刷新
            if (result.success || (result.error && result.error.includes('已被'))) {
                // 获取当前信件项元素
                const letterItem = this.container.querySelector(`[data-letter-number="${letterNumber}"]`);

                // 执行信件项左滑动画
                if (letterItem) {
                    await DispatchAnimation._slide(letterItem, 'out', { duration: 400 });
                }

                // 动画滑出右侧文字元素（与被他人处理时一致）
                const textElements = this.container.querySelectorAll('.animate-text');
                const elements = {
                    textElements: Array.from(textElements)
                };
                await DispatchAnimation.letterInfoAnimation(elements, 'hide');

                // 清空聊天历史
                this.historyMessages = [];

                // 禁用右侧面板
                this.setDetailPanelDisabled(true);

                // 重置选中状态
                this.selectedLetter = null;
                this.selectedUnit = null;
                this.letterInfo = null;

                // 清空详情面板
                this.clearDetailPanel();

                // 重新获取信件列表
                await this.refresh();
            }
        } catch (error) {
            console.error('下发失败:', error);
            this.showNotification('下发失败，请稍后重试', 'error');
        }
    }

    /**
     * 处理由我来处理按钮点击
     * 将信件分配给当前用户处理
     */
    async handleBySelf() {
        console.log('[handleBySelf] 开始执行');
        
        if (!this.selectedLetter) {
            this.showNotification('请先选择要处理的信件', 'warning');
            return;
        }

        const letterNumber = this.selectedLetter['信件编号'];
        const btnHandle = this.container.querySelector('#btn-handle');
        console.log('[handleBySelf] 信件编号:', letterNumber);
        console.log('[handleBySelf] 按钮元素:', btnHandle);

        // 构建确认提示内容
        const confirmMessage = `确定要自行处理信件 ${letterNumber} 吗？`;

        // 显示气泡确认提示框
        console.log('[handleBySelf] 显示确认弹窗');
        const confirmed = await this.showPopoverConfirm(btnHandle, confirmMessage);
        console.log('[handleBySelf] 用户确认结果:', confirmed);
        
        if (!confirmed) {
            console.log('[handleBySelf] 用户取消操作');
            return;
        }

        // 发送到后台
        console.log('[handleBySelf] 开始发送请求');
        try {
            const result = await DispatchTools.handleBySelf(letterNumber);
            console.log('[handleBySelf] 请求结果:', result);

            // 使用workplaceController的提示方法显示结果
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

            // 如果成功，执行左滑动画并刷新
            if (result.success) {
                // 获取当前信件项元素
                const letterItem = this.container.querySelector(`[data-letter-number="${letterNumber}"]`);

                // 执行信件项左滑动画
                if (letterItem) {
                    await DispatchAnimation._slide(letterItem, 'out', { duration: 400 });
                }

                // 动画滑出右侧文字元素
                const textElements = this.container.querySelectorAll('.animate-text');
                const elements = {
                    textElements: Array.from(textElements)
                };
                await DispatchAnimation.letterInfoAnimation(elements, 'hide');

                // 清空聊天历史
                this.historyMessages = [];

                // 禁用右侧面板
                this.setDetailPanelDisabled(true);

                // 重置选中状态
                this.selectedLetter = null;
                this.selectedUnit = null;
                this.letterInfo = null;

                // 清空详情面板
                this.clearDetailPanel();

                // 重新获取信件列表
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
        // 清空左侧信息
        const inputs = this.container.querySelectorAll('.info-value-input');
        inputs.forEach(input => input.value = '');

        // 清空分类显示
        const categoryEl = this.container.querySelector('#detail-category');
        if (categoryEl) categoryEl.textContent = '-';

        // 清空诉求内容
        const appealContent = this.container.querySelector('#detail-appeal-content');
        if (appealContent) appealContent.value = '';

        // 清空单位选择
        const unitInput = this.container.querySelector('#unit-select-input');
        if (unitInput) unitInput.value = '';

        // 清空AI对话
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
    }

    /**
     * 构建下发数据
     * 包含信件信息和备注
     */
    buildDispatchData() {
        const data = {
            // 信件基本信息
            '信件编号': this.selectedLetter['信件编号'],
            '群众姓名': this.selectedLetter['群众姓名'],
            '手机号': this.selectedLetter['手机号'],
            '身份证号': this.selectedLetter['身份证号'],
            '来信时间': this.selectedLetter['来信时间'],
            '来信渠道': this.selectedLetter['来信渠道'],
            '信件一级分类': this.selectedLetter['信件一级分类'],
            '信件二级分类': this.selectedLetter['信件二级分类'],
            '信件三级分类': this.selectedLetter['信件三级分类'],
            '诉求内容': this.selectedLetter['诉求内容'],
            '专项关注标签': this.selectedLetter['专项关注标签'],
            '当前信件状态': this.selectedLetter['当前信件状态'],
            '当前信件处理单位': this.selectedLetter['当前信件处理单位'],

            // 下发相关信息
            '目标单位': this.selectedUnit,
            '下发备注': this.notes,

            // 用户选择的分类（可能已被AI修改）
            '选择的分类': this.selectedCategory,

            // 流转记录
            '流转记录': this.letterInfo['流转记录'] || []
        };

        console.log('[buildDispatchData] 下发数据:', data);
        return data;
    }

    /**
     * 显示气泡确认提示框
     * @param {HTMLElement} targetElement - 指向的目标元素
     * @param {string} message - 提示消息
     * @returns {Promise<boolean>} 用户是否确认
     */
    showPopoverConfirm(targetElement, message) {
        return new Promise((resolve) => {
            // 创建气泡提示框
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

            // 添加样式
            popover.style.cssText = `
                position: absolute;
                z-index: 1000;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 12px 16px;
                min-width: 200px;
            `;

            const content = popover.querySelector('.popover-content');
            content.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;

            const messageEl = popover.querySelector('.popover-message');
            messageEl.style.cssText = `
                font-size: 14px;
                color: #374151;
                line-height: 1.5;
            `;

            const buttons = popover.querySelector('.popover-buttons');
            buttons.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            `;

            const btnCancel = popover.querySelector('.popover-btn-cancel');
            const btnConfirm = popover.querySelector('.popover-btn-confirm');

            btnCancel.style.cssText = `
                padding: 6px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: #fff;
                color: #374151;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            `;

            btnConfirm.style.cssText = `
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                background: #3b82f6;
                color: #fff;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            `;

            // 箭头样式
            const arrow = popover.querySelector('.popover-arrow');
            arrow.style.cssText = `
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid #fff;
            `;

            // 先添加到body以获取实际尺寸，使用fixed定位相对于视口
            popover.style.position = 'fixed';
            popover.style.visibility = 'hidden';
            document.body.appendChild(popover);

            // 定位气泡框
            const rect = targetElement.getBoundingClientRect();
            const popoverRect = popover.getBoundingClientRect();

            // 计算相对于视口的位置（气泡框在按钮上方居中）
            const top = rect.top - popoverRect.height - 10;
            const left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

            popover.style.top = `${Math.max(10, top)}px`;
            popover.style.left = `${Math.max(10, left)}px`;
            popover.style.visibility = 'visible';

            // 箭头居中
            arrow.style.left = '50%';
            arrow.style.transform = 'translateX(-50%)';

            // 事件处理
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
                btnConfirm.removeEventListener('click', handleConfirm);
                btnCancel.removeEventListener('click', handleCancel);
                document.removeEventListener('click', handleClickOutside);
                if (popover.parentNode) {
                    popover.parentNode.removeChild(popover);
                }
            };

            btnConfirm.addEventListener('click', handleConfirm);
            btnCancel.addEventListener('click', handleCancel);

            // 延迟添加点击外部关闭事件，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 10);
        });
    }

    /**
     * 显示通知提示
     * @param {string} message - 消息内容
     * @param {string} type - 类型：success, error, warning
     */
    showNotification(message, type = 'info') {
        // 优先使用workplaceController的通知方法
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
            // 降级使用alert
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
     * 绑定可编辑字段的事件
     * input默认readonly，鼠标悬停显示可编辑提示，点击后启用编辑
     */
    bindEditableFields() {
        // 定义可编辑字段映射：id -> letterInfo字段名（仅包含非input元素，如span）
        const editableFields = {
            'detail-letter-number': '信件编号',
            'detail-source': '来信渠道'
        };

        Object.entries(editableFields).forEach(([elementId, fieldName]) => {
            const input = this.container.querySelector(`#${elementId}`);
            if (!input) return;

            // 点击启用编辑
            input.addEventListener('click', () => {
                if (!input.readOnly) return;
                this.enableFieldEdit(input, fieldName);
            });

            // 失去焦点时保存
            input.addEventListener('blur', () => {
                this.saveFieldEdit(input, fieldName);
            });

            // 键盘事件
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    // 恢复原始值
                    if (this.selectedLetter) {
                        input.value = this.selectedLetter[fieldName] || '';
                    }
                    input.readOnly = true;
                    input.style.backgroundColor = '';
                    input.style.borderColor = '';
                }
            });
        });
    }

    /**
     * 启用字段编辑模式
     * @param {HTMLInputElement} input - input元素
     * @param {string} fieldName - 字段名
     */
    enableFieldEdit(input, fieldName) {
        // 移除readonly，启用编辑
        input.readOnly = false;
        input.style.backgroundColor = '#fff';
        // 使用inset box-shadow模拟边框，避免border导致的尺寸变化
        input.style.border = 'none';
        input.style.boxShadow = 'inset 0 0 0 1px #3b82f6';
        input.style.borderRadius = '4px';
        // 保持与原始class相同的padding (px-1 py-0.5 = 4px 2px)
        input.style.padding = '2px 4px';
        input.style.outline = 'none';
        input.focus();
        input.select();
    }

    /**
     * 保存字段编辑
     * @param {HTMLInputElement} input - input元素
     * @param {string} fieldName - 字段名
     */
    saveFieldEdit(input, fieldName) {
        const newValue = input.value.trim();

        // 恢复readonly状态
        input.readOnly = true;
        input.style.backgroundColor = '';
        input.style.border = '';
        input.style.padding = '';
        input.style.boxShadow = '';
        input.style.outline = '';

        // 更新letterInfo
        if (this.letterInfo) {
            this.letterInfo[fieldName] = newValue;
            console.log(`[saveFieldEdit] 更新 ${fieldName}:`, newValue);
        }

        // 同时更新selectedLetter
        if (this.selectedLetter) {
            this.selectedLetter[fieldName] = newValue;
        }
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

        // 禁用输入框和发送按钮
        this.setChatInputDisabled(true);

        // 清空输入框
        chatInput.value = '';

        // 添加用户消息到界面
        this.addUserMessage(chatMessages, message);

        // 构建消息列表
        const messages = this.buildMessages(message, this.historyMessages);

        // 创建AI消息元素（用于流式渲染）
        const aiMessageElement = this.createAIMessageElement(chatMessages);
        const targetElement = aiMessageElement.querySelector('.ai-message-text');

        // 发送消息
        let streamText = '';
        try {
            const response = await this.aiController.sendMessage(
                messages,
                {
                    onChunk: (char) => {
                        // 累积字符并实时格式化
                        streamText += char;
                        if (typeof marked !== 'undefined') {
                            targetElement.innerHTML = marked.parse(streamText);
                        } else {
                            targetElement.textContent = streamText;
                        }
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    },
                    onStreamComplete: (fullText) => {
                        console.log('[DispatchController] AI回复完成');
                        // 流式完成后，确保最终使用marked.js格式化
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

            // 添加到历史记录
            if (response) {
                this.historyMessages.push({ role: 'user', content: message });
                this.historyMessages.push({ role: 'assistant', content: response });
            }
        } finally {
            // 启用输入框和发送按钮
            this.setChatInputDisabled(false);
        }
    }

    /**
     * 添加用户消息到界面
     * @param {HTMLElement} container - 消息容器
     * @param {string} text - 消息文本
     */
    addUserMessage(container, text) {
        const messageHTML = `
            <div class="ai-message ai-message-user">
                <div class="ai-message-content">
                    <div class="ai-message-text">${this.escapeHtml(text)}</div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHTML);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 创建AI消息元素（用于流式渲染）
     * @param {HTMLElement} container - 消息容器
     * @returns {HTMLElement} AI消息元素
     */
    createAIMessageElement(container) {
        const messageId = 'ai-message-' + Date.now();
        const messageHTML = `
            <div class="ai-message ai-message-ai" id="${messageId}">
                <div class="ai-message-content">
                    <div class="ai-message-text"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHTML);
        container.scrollTop = container.scrollHeight;
        return document.getElementById(messageId);
    }

    /**
     * 显示正在输入指示器
     * @param {HTMLElement} container - 消息容器
     */
    showTypingIndicator(container) {
        const typingHTML = `
            <div class="ai-message ai-message-typing" id="typing-indicator">
                <div class="ai-message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', typingHTML);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 隐藏正在输入指示器
     */
    hideTypingIndicator() {
        const chatMessages = this.container.querySelector('#ai-chat-messages');
        if (!chatMessages) return;
        const indicator = chatMessages.querySelector('#typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 处理AI命令
     * @param {Array} commands - AI命令数组
     */
    processAICommands(commands) {
        console.log('[processAICommands] 收到命令:', commands);
        if (!Array.isArray(commands) || commands.length === 0) {
            console.log('[processAICommands] 命令为空，不处理');
            return;
        }

        commands.forEach((command, index) => {
            const target = command['目标'];
            let content = command['内容'];

            console.log(`[processAICommands] 处理命令[${index}]:`, { target, content });

            if (!target || !content) {
                console.warn('[DispatchController] 命令格式不正确:', command);
                return;
            }

            // 根据目标选择对应的输入框
            if (target.includes('分类')) {
                console.log('[processAICommands] 调用validateCategoryInput');
                content = DispatchTools.formatCommandContent(content);
                this.validateCategoryInput(content);
            } else if (target.includes('单位')) {
                console.log('[processAICommands] 调用validateUnitInput');
                content = DispatchTools.formatCommandContent(content);
                this.validateUnitInput(content);
            } else if (target.includes('专项关注') || target.includes('关注')) {
                console.log('[processAICommands] 调用validateSpecialFocusInput');
                content = DispatchTools.formatSpecialFocusContent(content);
                this.validateSpecialFocusInput(content);
            } else if (target.includes('诉求内容') || target.includes('诉求')) {
                console.log('[processAICommands] 调用validateAppealContentInput');
                this.validateAppealContentInput(content);
            } else if (target.includes('备注')) {
                console.log('[processAICommands] 调用validateRemarkInput');
                this.validateRemarkInput(content);
            } else {
                console.warn('[processAICommands] 未知的目标:', target);
            }
        });
    }

    /**
     * 验证诉求内容输入并更新textarea
     * @param {string} content - 诉求内容
     */
    validateAppealContentInput(content) {
        const inputElement = this.container.querySelector('#detail-appeal-content');
        if (!inputElement) return;

        // 更新textarea的值
        inputElement.value = content;

        // 更新letterInfo中的诉求内容
        if (this.letterInfo) {
            this.letterInfo['诉求内容'] = content;
        }

        // AI修改输入框，显示红色呼吸效果
        DispatchAnimation.flashInputBorder(inputElement);

        console.log('[诉求内容验证]', '诉求内容已更新');
    }

    /**
     * 验证备注输入并更新
     * @param {string} content - 备注内容
     */
    validateRemarkInput(content) {
        // 更新notes值
        this.notes = content;

        // 如果备注弹窗是打开的，也更新弹窗中的textarea
        const remarkTextarea = this.container.querySelector('#remark-textarea');
        if (remarkTextarea) {
            remarkTextarea.value = content;
            // AI修改输入框，显示红色呼吸效果
            DispatchAnimation.flashInputBorder(remarkTextarea);
        }

        console.log('[备注验证]', '备注已更新:', content);
    }

    /**
     * 显示页面（再次进入时调用）
     * 执行再次进入动画，刷新数据
     */
    async show() {
        // 确保所有元素可见
        DispatchAnimation.ensureElementsVisible(this.container);

        // 执行再次进入动画
        await DispatchAnimation.reenterAnimation(this.container);

        // 刷新数据
        await this.refresh();
    }

    /**
     * 隐藏页面
     */
    hide() {
        // 停止轮询
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
     * @param {string} userMessage - 用户消息
     * @param {Array} messageHistory - 消息历史
     * @returns {Array} 组装好的消息列表
     */
    buildMessages(userMessage, messageHistory) {
        console.log('[buildMessages] 构建消息时 this.letterInfo:', this.letterInfo);
        console.log('[buildMessages] 信件编号:', this.letterInfo?.['信件编号']);
        console.log('[buildMessages] 信件分类:', this.letterInfo?.['信件一级分类'], '/', this.letterInfo?.['信件二级分类'], '/', this.letterInfo?.['信件三级分类']);
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
