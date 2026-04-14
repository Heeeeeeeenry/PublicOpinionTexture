/**
 * 处理工作台主控制器
 *
 * 负责页面初始化、事件绑定、数据加载、交互处理等核心逻辑
 * 使用通用动画库 WpAnimation 实现动画效果
 */

class ProcessingController {
    /**
     * 构造函数
     */
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.animationPlayed = false;
        this.letters = {};
        this.selectedLetter = null;
        this.letterInfo = {};
        this.categories = [];
        this.pollingInterval = null;
        this.isPolling = false;
        this.remarkContent = '';
        this.currentHandleStep = 1;
        this.recordings = [];
        this.resultFiles = [];
        this.countdownInterval = null;
        this.currentDeadline = null;
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
     * @param {HTMLElement} container - 页面容器元素
     */
    async init(container) {
        this.container = container;

        await this.renderHTML();

        this.bindEvents();

        const isFirstEnter = !this.animationPlayed;

        if (isFirstEnter) {
            const header = this.container.querySelector('#processing-header');
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
        this.container.innerHTML = ProcessingHtml.getFullPageHtml();
    }

    /**
     * 初始化下拉框
     */
    async initDropdowns() {
        this.categories = await ProcessingTools.fetchCategories();
        this.initCategoryDropdown();
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

        const options = ProcessingTools.buildCategoryOptions(this.categories);
        this.renderDropdownOptions(optionsContainer, options);

        this.bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, (value) => {
            if (this.letterInfo) {
                const parts = value.split(' / ');
                this.letterInfo['信件一级分类'] = parts[0] || '';
                this.letterInfo['信件二级分类'] = parts[1] || '';
                this.letterInfo['信件三级分类'] = parts[2] || '';
            }
        });
    }

    /**
     * 渲染下拉框选项
     */
    renderDropdownOptions(container, options) {
        if (!container) return;
        container.innerHTML = options.map(opt => {
            if (opt.type === 'group') {
                return `<div class="processing-select-option-group">${opt.label}</div>`;
            }
            return `<div class="processing-select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
        }).join('');
    }

    /**
     * 绑定下拉框事件
     */
    bindDropdownEvents(container, input, dropdown, searchInput, optionsContainer, onSelect) {
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = container.classList.contains('active');
            this.container.querySelectorAll('.processing-searchable-select').forEach(el => {
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
            const option = e.target.closest('.processing-select-option');
            if (option) {
                const value = option.dataset.value;
                const label = option.textContent;
                input.value = label;
                onSelect(value);
                container.classList.remove('active');
                container.classList.remove('dropup');

                optionsContainer.querySelectorAll('.processing-select-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });

        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const options = optionsContainer.querySelectorAll('.processing-select-option');
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
     * 绑定事件
     */
    bindEvents() {
        this.bindLetterListEvents();
        this.bindDetailEvents();
        this.bindTabEvents();
        this.bindButtonEvents();
        this.bindModalEvents();
    }

    /**
     * 绑定信件列表事件
     */
    bindLetterListEvents() {
        const listPanel = this.container.querySelector('#letter-list-panel');
        if (!listPanel) return;

        listPanel.addEventListener('click', async (e) => {
            const item = e.target.closest('.wp-list-item');
            if (!item) return;

            const letterNumber = item.dataset.letterNumber;
            const letter = this.letters[letterNumber];
            if (letter) {
                await this.selectLetter(letter, true);
            }
        });
    }

    /**
     * 绑定详情区域事件
     */
    bindDetailEvents() {
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
                if (fieldName && this.letterInfo) {
                    this.letterInfo[fieldName] = input.value.trim();
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
                    }
                }
            });
        });
    }

    /**
     * 绑定选项卡事件
     */
    bindTabEvents() {
        const tabBtns = this.container.querySelectorAll('.processing-tab-btn');
        const scrollContainer = this.container.querySelector('#processing-scroll-container');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionId = btn.dataset.section;
                this.scrollToSection(sectionId);
            });
        });

        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                this.updateActiveTabOnScroll();
            });
        }
    }

    /**
     * 滚动到指定区块
     * @param {string} sectionId - 区块ID
     */
    scrollToSection(sectionId) {
        const scrollContainer = this.container.querySelector('#processing-scroll-container');
        const section = this.container.querySelector(`#section-${sectionId}`);

        if (scrollContainer && section) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;
            const targetScroll = scrollTop + sectionRect.top - containerRect.top;

            scrollContainer.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }

    /**
     * 根据滚动位置更新菜单高亮
     */
    updateActiveTabOnScroll() {
        const scrollContainer = this.container.querySelector('#processing-scroll-container');
        const sections = this.container.querySelectorAll('.processing-section');
        const tabBtns = this.container.querySelectorAll('.processing-tab-btn');

        if (!scrollContainer || sections.length === 0) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const containerTop = containerRect.top + 100;

        let activeSection = null;
        let minDistance = Infinity;

        sections.forEach(section => {
            const sectionRect = section.getBoundingClientRect();
            const distance = Math.abs(sectionRect.top - containerTop);

            if (sectionRect.top <= containerTop && distance < minDistance) {
                minDistance = distance;
                activeSection = section.id.replace('section-', '');
            }
        });

        if (!activeSection && sections.length > 0) {
            activeSection = sections[0].id.replace('section-', '');
        }

        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === activeSection);
        });
    }

    /**
     * 绑定按钮事件
     */
    bindButtonEvents() {
        const btnReturn = this.container.querySelector('#btn-return');
        if (btnReturn) {
            btnReturn.addEventListener('click', () => this.handleReturn());
        }

        const btnInvalid = this.container.querySelector('#btn-invalid');
        if (btnInvalid) {
            btnInvalid.addEventListener('click', () => this.handleInvalid());
        }

        const btnSubmit = this.container.querySelector('#btn-submit');
        if (btnSubmit) {
            btnSubmit.addEventListener('click', () => this.handleSubmit());
        }

        const btnRemark = this.container.querySelector('#btn-remark');
        if (btnRemark) {
            btnRemark.addEventListener('click', () => this.openRemarkModal());
        }
    }

    /**
     * 绑定弹窗事件
     */
    bindModalEvents() {
        const modal = this.container.querySelector('#remark-modal');
        const closeBtn = this.container.querySelector('#remark-modal-close');
        const cancelBtn = this.container.querySelector('#btn-remark-cancel');
        const saveBtn = this.container.querySelector('#btn-remark-save');
        const textarea = this.container.querySelector('#remark-textarea');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeRemarkModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeRemarkModal());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.remarkContent = textarea ? textarea.value : '';
                this.closeRemarkModal();
                this.showNotification('备注已保存', 'success');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeRemarkModal();
                }
            });
        }
    }

    /**
     * 打开备注弹窗
     */
    openRemarkModal() {
        const modal = this.container.querySelector('#remark-modal');
        const textarea = this.container.querySelector('#remark-textarea');
        if (modal) {
            modal.style.display = 'flex';
            if (textarea) {
                textarea.value = this.remarkContent;
                setTimeout(() => textarea.focus(), 100);
            }
        }
    }

    /**
     * 关闭备注弹窗
     */
    closeRemarkModal() {
        const modal = this.container.querySelector('#remark-modal');
        if (modal) {
            modal.style.display = 'none';
        }
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
        const newLetters = await ProcessingTools.fetchLetterList();

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
            const textElements = this.container.querySelectorAll('.wp-text-animate');
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

            this.renderLetterList();
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
            this.letterInfo = {};
            this.updateCount();
            return;
        }

        this.renderLetterList();

        if (this.selectedLetter && !newLettersDict[this.selectedLetter['信件编号']]) {
            const textElements = this.container.querySelectorAll('.wp-text-animate');
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);

            if (newLetters.length > 0) {
                this.selectLetter(newLetters[0]);
            } else {
                this.selectedLetter = null;
                this.letterInfo = {};
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

        const html = ProcessingHtml.getLetterItemHtml(letter, this.selectedLetter?.['信件编号']);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const newElement = tempDiv.firstElementChild;

        panel.appendChild(newElement);

        await WpAnimation.moveAndFadeIn(newElement, 'left', 30, 400, 0);
    }

    /**
     * 加载数据
     * @param {boolean} withAnimation - 是否播放动画
     */
    async loadData(withAnimation = false) {
        const lettersArray = await ProcessingTools.fetchLetterList();

        this.letters = {};
        lettersArray.forEach(letter => {
            this.letters[letter['信件编号']] = letter;
        });

        await this.renderLetterList(withAnimation);

        const lettersList = Object.values(this.letters);
        if (lettersList.length > 0) {
            this.setDetailPanelDisabled(false);
            await this.selectLetter(lettersList[0], withAnimation);
        } else {
            this.setDetailPanelDisabled(true);
            this.selectedLetter = null;
            this.letterInfo = {};
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
        panel.innerHTML = ProcessingHtml.getLetterListHtml(lettersArray, selectedNumber);

        if (withAnimation && lettersArray.length > 0) {
            const items = panel.querySelectorAll('.wp-list-item');
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

        this.selectedLetter = letter;

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

        if (withAnimation) {
            await WpAnimation.moveAndFadeOut(textElements, 'left', 30, 300, 30);
        }

        this.letterInfo = {};

        this.fillLetterDetail(letter);

        this.bindEditableInputs();

        if (withAnimation) {
            await WpAnimation.moveAndFadeIn(textElements, 'left', 30, 400, 30);
        }

        const fullDetail = await ProcessingTools.fetchLetterDetail(letter['信件编号']);
        if (fullDetail) {
            this.letterInfo = fullDetail;
            this.fillLetterDetail(fullDetail);
            this.renderFlowRecords(fullDetail['流转记录'] || []);
            this.renderHistoryLetters(fullDetail['历史来信'] || []);
            this.renderHandleArea(fullDetail['通话录音附件'] || []);
            this.updateCountdownDisplay();
        }

        this.setCategoryDropdownValue(letter);
    }

    /**
     * 填充信件详情
     */
    fillLetterDetail(letter) {
        const setTextContent = (selector, value) => {
            const el = this.container.querySelector(selector);
            if (el) el.textContent = value || '-';
        };

        const setInputValue = (selector, value) => {
            const el = this.container.querySelector(selector);
            if (el) el.value = value || '';
        };

        setTextContent('#detail-letter-number', letter['信件编号']);
        setTextContent('#detail-category', ProcessingTools.getCategoryName(letter));
        setInputValue('#detail-time', letter['来信时间'] ? ProcessingTools.formatTime(letter['来信时间']) : '');
        setInputValue('#detail-citizen', letter['群众姓名']);
        setInputValue('#detail-phone', letter['手机号']);
        setInputValue('#detail-idcard', letter['身份证号']);
        setTextContent('#detail-source', letter['来信渠道']);
        setInputValue('#detail-appeal-content', letter['诉求内容']);

        setTextContent('#handle-contact-name', letter['群众姓名']);
        setTextContent('#handle-contact-phone', letter['手机号']);
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

            const self = this;
            input.addEventListener('blur', function() {
                this.readOnly = true;
                this.classList.remove('bg-blue-50', 'ring-2', 'ring-blue-200');
                if (fieldName && self.letterInfo) {
                    self.letterInfo[fieldName] = this.value.trim();
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
                    }
                }
            });
        });
    }

    /**
     * 渲染流转记录
     */
    renderFlowRecords(records) {
        const container = this.container.querySelector('#flow-records-list');
        if (container) {
            container.innerHTML = ProcessingHtml.getFlowRecordsHtml(records);
        }
    }

    /**
     * 渲染历史来信
     */
    renderHistoryLetters(letters) {
        const container = this.container.querySelector('#history-letters-list');
        if (container) {
            container.innerHTML = ProcessingHtml.getHistoryLettersHtml(letters);
        }
    }

    /**
     * 渲染处理区域
     */
    renderHandleArea(recordings = [], resultFiles = []) {
        const container = this.container.querySelector('#letter-handle-area');
        if (container) {
            container.innerHTML = ProcessingHtml.getLetterHandleHtml(recordings, resultFiles);
            this.currentHandleStep = 1;
            this.recordings = recordings;
            this.resultFiles = resultFiles;
            this.bindHandleEvents();
        }
    }

    /**
     * 绑定处理区域事件
     */
    bindHandleEvents() {
        this.bindRecordingUploadEvents();
        this.bindResultFileUploadEvents();
        this.bindStepIndicatorEvents();
        this.bindStepNavigationEvents();
    }

    /**
     * 绑定录音上传事件
     */
    bindRecordingUploadEvents() {
        const uploadZone = this.container.querySelector('#recording-upload-zone');
        const fileInput = this.container.querySelector('#recording-file-input');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                this.handleRecordingFiles(e.target.files);
            });

            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                this.handleRecordingFiles(e.dataTransfer.files);
            });
        }

        const fileList = this.container.querySelector('#recording-file-list');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.recording-file-remove');
                if (removeBtn) {
                    const index = parseInt(removeBtn.dataset.index);
                    this.removeRecording(index);
                }
            });
        }
    }

    /**
     * 处理录音文件上传
     * @param {FileList} files - 文件列表
     */
    handleRecordingFiles(files) {
        const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];

        Array.from(files).forEach(file => {
            if (audioTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
                const recording = {
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    file: file,
                    uploadedAt: new Date().toISOString()
                };
                this.recordings.push(recording);
            } else {
                this.showNotification(`文件 ${file.name} 不是支持的音频格式`, 'warning');
            }
        });

        this.updateRecordingList();
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 更新录音文件列表显示
     */
    updateRecordingList() {
        const fileList = this.container.querySelector('#recording-file-list');
        if (fileList) {
            fileList.innerHTML = ProcessingHtml.getRecordingListHtml(this.recordings);
        }

        this.updateNextButtonState();
        this.updateCountdownDisplay();
    }

    /**
     * 更新下一步按钮状态
     * 没有文件时禁用按钮
     */
    updateNextButtonState() {
        const btnNextStep = this.container.querySelector('#btn-next-step');
        if (btnNextStep) {
            btnNextStep.disabled = this.recordings.length === 0;
        }
    }

    /**
     * 移除录音文件
     * @param {number} index - 文件索引
     */
    removeRecording(index) {
        if (index >= 0 && index < this.recordings.length) {
            this.recordings.splice(index, 1);
            this.updateRecordingList();
        }
    }

    /**
     * 绑定步骤指示器点击事件
     */
    bindStepIndicatorEvents() {
        const indicators = this.container.querySelectorAll('.handle-step-indicator');
        indicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                const step = parseInt(indicator.dataset.step);
                this.switchToStep(step);
            });
        });
    }

    /**
     * 绑定步骤导航按钮事件
     */
    bindStepNavigationEvents() {
        const btnNextStep = this.container.querySelector('#btn-next-step');
        if (btnNextStep) {
            btnNextStep.addEventListener('click', () => this.switchToStep(2));
        }

        const btnPrevStep = this.container.querySelector('#btn-prev-step');
        if (btnPrevStep) {
            btnPrevStep.addEventListener('click', () => this.switchToStep(1));
        }
    }

    /**
     * 绑定结果面板文件上传事件
     */
    bindResultFileUploadEvents() {
        const uploadZone = this.container.querySelector('#result-upload-zone');
        const fileInput = this.container.querySelector('#result-file-input');
        const uploadContent = this.container.querySelector('#result-upload-content');

        if (uploadZone && fileInput) {
            uploadContent.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                this.handleResultFiles(e.target.files);
            });

            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                this.handleResultFiles(e.dataTransfer.files);
            });
        }

        const fileList = this.container.querySelector('#result-file-list');
        if (fileList) {
            fileList.addEventListener('click', (e) => {
                e.stopPropagation();
                const removeBtn = e.target.closest('.result-file-remove');
                if (removeBtn) {
                    const index = parseInt(removeBtn.dataset.index);
                    this.removeResultFile(index);
                }
            });
        }
    }

    /**
     * 处理结果面板文件上传
     * @param {FileList} files - 文件列表
     */
    handleResultFiles(files) {
        Array.from(files).forEach(file => {
            const fileData = {
                name: file.name,
                size: this.formatFileSize(file.size),
                file: file,
                uploadedAt: new Date().toISOString()
            };
            this.resultFiles.push(fileData);
        });

        this.updateResultFileList();
    }

    /**
     * 更新结果文件列表显示
     */
    updateResultFileList() {
        const fileList = this.container.querySelector('#result-file-list');
        if (fileList) {
            fileList.innerHTML = ProcessingHtml.getResultFileListHtml(this.resultFiles);
        }
    }

    /**
     * 移除结果文件
     * @param {number} index - 文件索引
     */
    removeResultFile(index) {
        if (index >= 0 && index < this.resultFiles.length) {
            this.resultFiles.splice(index, 1);
            this.updateResultFileList();
        }
    }

    /**
     * 切换到指定步骤
     * @param {number} step - 步骤编号 (1 或 2)
     */
    switchToStep(step) {
        if (step === this.currentHandleStep) return;

        const slider = this.container.querySelector('#handle-steps-slider');
        const indicators = this.container.querySelectorAll('.handle-step-indicator');

        if (slider) {
            slider.classList.remove('step-1', 'step-2');
            slider.classList.add(`step-${step}`);
        }

        indicators.forEach(indicator => {
            const indicatorStep = parseInt(indicator.dataset.step);
            indicator.classList.remove('active', 'completed');

            if (indicatorStep === step) {
                indicator.classList.add('active');
            } else if (indicatorStep < step) {
                indicator.classList.add('completed');
            }
        });

        this.currentHandleStep = step;
    }

    /**
     * 设置分类下拉框值
     */
    setCategoryDropdownValue(letter) {
        const categoryInput = this.container.querySelector('#category-select-input');
        if (categoryInput) {
            const categoryValue = ProcessingTools.getCategoryName(letter);
            categoryInput.value = categoryValue;
        }
    }

    /**
     * 更新倒计时显示
     */
    async updateCountdownDisplay() {
        this.stopCountdown();

        const records = this.letterInfo['流转记录'] || [];
        let processTime = null;
        for (let i = records.length - 1; i >= 0; i--) {
            if (records[i]['操作后状态'] === '正在处理') {
                processTime = records[i]['操作时间'];
                break;
            }
        }

        if (!processTime) {
            this.setCountdownText('--:--:--', '剩余时间', '未找到处理开始时间');
            return;
        }

        const hasRecordings = this.recordings && this.recordings.length > 0;
        
        let deadlineTime = null;
        let title = '';
        let label = '';

        if (hasRecordings) {
            title = '处理剩余时间';
            label = '请在规定时间内处理诉求';
            
            try {
                const response = await fetch('/api/tool/workdays_add/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base_date: processTime, workdays: 4, skip_holidays: true })
                });
                const res = await response.json();
                if (res.success && res.data && res.data.result_date) {
                    deadlineTime = new Date(res.data.result_date.replace(' ', 'T')).getTime();
                } else {
                    deadlineTime = new Date(processTime.replace(' ', 'T')).getTime() + 4 * 24 * 60 * 60 * 1000;
                }
            } catch (e) {
                console.error('Error fetching workdays:', e);
                deadlineTime = new Date(processTime.replace(' ', 'T')).getTime() + 4 * 24 * 60 * 60 * 1000;
            }
        } else {
            title = '联系剩余时间';
            label = '请在规定时间内联系群众';
            deadlineTime = new Date(processTime.replace(' ', 'T')).getTime() + 30 * 60 * 1000;
        }

        this.currentDeadline = deadlineTime;
        
        const titleEl = this.container.querySelector('.processing-countdown-title span');
        if (titleEl) titleEl.textContent = title;
        
        const labelEl = this.container.querySelector('#countdown-label');
        if (labelEl) labelEl.textContent = label;

        this.startCountdown();
    }

    startCountdown() {
        this.stopCountdown();
        if (!this.currentDeadline) return;

        this.tickCountdown();
        this.countdownInterval = setInterval(() => this.tickCountdown(), 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    tickCountdown() {
        if (!this.currentDeadline) return;
        
        const now = new Date().getTime();
        const diff = this.currentDeadline - now;
        const valueEl = this.container.querySelector('#countdown-value');
        
        if (!valueEl) return;

        if (diff <= 0) {
            valueEl.textContent = '00:00:00';
            valueEl.style.color = '#ef4444'; // Red
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const format = (num) => String(num).padStart(2, '0');
        valueEl.textContent = `${format(hours)}:${format(minutes)}:${format(seconds)}`;
        valueEl.style.color = ''; 
    }

    setCountdownText(timeStr, title, label) {
        const valueEl = this.container.querySelector('#countdown-value');
        if (valueEl) {
            valueEl.textContent = timeStr;
            valueEl.style.color = '';
        }
        
        const titleEl = this.container.querySelector('.processing-countdown-title span');
        if (titleEl) titleEl.textContent = title;
        
        const labelEl = this.container.querySelector('#countdown-label');
        if (labelEl) labelEl.textContent = label;
    }

    /**
     * 更新信件数量显示
     */
    updateCount() {
        const countEl = this.container.querySelector('#letter-count');
        if (countEl) {
            countEl.textContent = Object.keys(this.letters).length;
        }
    }

    /**
     * 处理退回操作
     */
    async handleReturn() {
        if (!this.selectedLetter) {
            this.showNotification('请先选择信件', 'warning');
            return;
        }

        const btnReturn = this.container.querySelector('#btn-return');
        const confirmed = await this.showPopoverConfirm(btnReturn, `确定要退回信件 ${this.selectedLetter['信件编号']} 吗？`);
        if (!confirmed) return;

        if (!this.remarkContent || this.remarkContent.trim() === '') {
            window.workplace.showNotification('您需要填写备注后，才可以退回信件', 'bottom', 5000);
            return;
        }

        try {
            await ProcessingTools.returnLetter(
                this.selectedLetter['信件编号'],
                this.remarkContent
            );
            this.showNotification('信件已退回', 'success');
            this.remarkContent = '';
            await this.refresh();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * 处理不属实操作
     */
    async handleInvalid() {
        if (!this.selectedLetter) {
            this.showNotification('请先选择信件', 'warning');
            return;
        }

        const btnInvalid = this.container.querySelector('#btn-invalid');
        const confirmed = await this.showPopoverConfirm(btnInvalid, `确定要标记信件 ${this.selectedLetter['信件编号']} 为不属实吗？`);
        if (!confirmed) return;

        const letterData = {
            ...this.selectedLetter,
            ...this.letterInfo
        };

        const submitData = {
            letterData: letterData,
            recordings: this.recordings || [],
            resultFiles: this.resultFiles || [],
            remark: this.remarkContent
        };

        try {
            await ProcessingTools.markInvalid(this.selectedLetter['信件编号'], submitData);
            this.showNotification('已标记为不属实', 'success');
            this.remarkContent = '';
            await this.refresh();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * 处理提交操作
     */
    async handleSubmit() {
        if (!this.selectedLetter) {
            this.showNotification('请先选择信件', 'warning');
            return;
        }

        const categoryInput = this.container.querySelector('#category-select-input');
        const categoryValue = categoryInput ? categoryInput.value : null;

        if (!categoryValue) {
            this.showNotification('请选择信件分类', 'warning');
            return;
        }

        const btnSubmit = this.container.querySelector('#btn-submit');
        const confirmed = await this.showPopoverConfirm(btnSubmit, `确定要提交信件 ${this.selectedLetter['信件编号']} 的处理结果吗？`);
        if (!confirmed) return;

        const letterData = {
            ...this.selectedLetter,
            ...this.letterInfo
        };

        const submitData = {
            letterData: letterData,
            recordings: this.recordings || [],
            resultFiles: this.resultFiles || [],
            category: categoryValue,
            remark: this.remarkContent
        };

        try {
            await ProcessingTools.submitLetter(this.selectedLetter['信件编号'], submitData);
            this.showNotification('提交成功', 'success');
            this.remarkContent = '';
            await this.refresh();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * 显示气泡确认提示框
     */
    showPopoverConfirm(targetElement, message) {
        return new Promise((resolve) => {
            const popover = document.createElement('div');
            popover.className = 'processing-popover-confirm';
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
     * 显示页面
     */
    async show() {
        const textElements = this.container.querySelectorAll('.wp-text-animate');
        textElements.forEach(el => {
            el.classList.remove('fading-out', 'fading-in');
            el.style.opacity = '1';
            el.style.transform = 'translateX(0)';
        });

        await this.refresh();
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
}
