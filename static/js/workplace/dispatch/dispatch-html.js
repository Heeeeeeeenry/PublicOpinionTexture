/**
 * 下发工作台HTML生成模块
 *
 * 负责动态生成页面HTML结构
 * 使用通用样式类，保持与项目风格一致
 */

const DispatchHtml = {
    /**
     * 生成标题面板的HTML代码
     * @returns {string} HTML字符串
     */
    getTitleHtml() {
        return `
            <div class="wp-header" id="dispatch-header">
                <div class="wp-header-left">
                    <div class="wp-header-icon">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                    <div class="wp-header-content">
                        <h2 class="wp-header-title">下发工作台</h2>
                        <p class="wp-header-subtitle">将预处理信件下发至指定单位办理</p>
                    </div>
                </div>
                <div class="wp-header-right">
                    <div class="wp-checkbox warning" title="自动下发功能将会让助手自动下发信件，虽然这会让信件处理效率大幅提升，但也可能造成分类不准确、下发单位不正确等等问题。勾选此处需慎重。">
                        <input type="checkbox" id="auto-dispatch-check" class="checkbox-input">
                        <label for="auto-dispatch-check" class="wp-checkbox-label">自动下发</label>
                    </div>
                    <div class="wp-count-badge">
                        <span class="wp-count-value" id="letter-count">0</span>
                        <span class="wp-count-label">封待处理</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成左侧信件列表的HTML代码（不包含信件项）
     * @returns {string} HTML字符串
     */
    getLettersListContainerHtml() {
        return `
            <div class="dispatch-letter-list-panel wp-scrollbar" id="letter-list-panel">
            </div>
        `;
    },

    /**
     * 生成右侧信件详情的HTML代码
     * @returns {string} HTML字符串
     */
    getLetterInfoContainerHtml() {
        return `
            <div class="dispatch-letter-detail-panel" id="letter-detail-panel">
                <div class="dispatch-detail-top">
                    <div class="dispatch-detail-info">
                        <div class="wp-info-row">
                            <i class="fas fa-envelope" title="信件编号"></i>
                            <span class="wp-info-value wp-text-animate" id="detail-letter-number">-</span>
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-tags" title="信件分类"></i>
                            <span class="wp-info-value wp-text-animate" id="detail-category">-</span>
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-clock" title="来信时间"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-time" readonly placeholder="-" title="点击可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-user" title="群众姓名"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-citizen" readonly placeholder="-" title="点击可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-phone" title="手机号码"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-phone" readonly placeholder="-" title="点击可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-id-card" title="身份证号码"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-idcard" readonly placeholder="-" title="点击可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-inbox" title="信件来源"></i>
                            <span class="wp-info-value wp-text-animate" id="detail-source">-</span>
                        </div>
                    </div>

                    <div class="dispatch-detail-content">
                        <div class="dispatch-content-header">
                            <i class="fas fa-align-left"></i>
                            <span>诉求内容</span>
                        </div>
                        <textarea class="dispatch-appeal-textarea wp-text-animate wp-scrollbar" id="detail-appeal-content" placeholder="请输入诉求内容..." title="点击可编辑" readonly></textarea>
                    </div>
                </div>

                <div class="dispatch-detail-middle" id="detail-middle">
                    <div class="dispatch-ai-chat-messages wp-scrollbar" id="ai-chat-messages">
                    </div>

                    <div class="dispatch-ai-chat-input-wrapper">
                        <div class="dispatch-ai-chat-input-container">
                            <input type="text" class="dispatch-ai-chat-input" id="ai-chat-input" placeholder="请输入您的问题...">
                            <button class="dispatch-ai-chat-send" id="btn-send-message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="dispatch-detail-bottom">
                    <div class="dispatch-bottom-row dispatch-controls-row">
                        <div class="dispatch-searchable-select" id="category-select-container">
                            <div class="dispatch-select-input-wrapper">
                                <input type="text" class="dispatch-select-input" id="category-select-input" placeholder="选择信件分类..." readonly>
                                <i class="fas fa-chevron-down dispatch-select-arrow"></i>
                            </div>
                            <div class="dispatch-select-dropdown" id="category-select-dropdown">
                                <div class="dispatch-select-search">
                                    <input type="text" class="dispatch-search-input" id="category-search" placeholder="搜索分类...">
                                </div>
                                <div class="dispatch-select-options wp-scrollbar" id="category-select-options">
                                </div>
                            </div>
                        </div>

                        <div class="dispatch-searchable-select" id="unit-select-container">
                            <div class="dispatch-select-input-wrapper">
                                <input type="text" class="dispatch-select-input" id="unit-select-input" placeholder="选择下发单位..." readonly>
                                <i class="fas fa-chevron-down dispatch-select-arrow"></i>
                            </div>
                            <div class="dispatch-select-dropdown" id="unit-select-dropdown">
                                <div class="dispatch-select-search">
                                    <input type="text" class="dispatch-search-input" id="unit-search" placeholder="搜索单位...">
                                </div>
                                <div class="dispatch-select-options wp-scrollbar" id="unit-select-options">
                                </div>
                            </div>
                        </div>

                        <div class="dispatch-searchable-select dispatch-multi-select" id="focus-select-container">
                            <div class="dispatch-select-input-wrapper">
                                <input type="text" class="dispatch-select-input" id="focus-select-input" placeholder="选择专项关注..." readonly>
                                <i class="fas fa-chevron-down dispatch-select-arrow"></i>
                            </div>
                            <div class="dispatch-select-dropdown" id="focus-select-dropdown">
                                <div class="dispatch-select-search">
                                    <input type="text" class="dispatch-search-input" id="focus-search" placeholder="搜索专项关注...">
                                </div>
                                <div class="dispatch-select-options wp-scrollbar" id="focus-select-options">
                                </div>
                            </div>
                        </div>

                        <button class="wp-remark-btn" id="btn-remark" title="添加备注">
                            <i class="fas fa-comment-alt"></i>
                            <span>备注</span>
                        </button>
                    </div>

                    <div class="dispatch-bottom-row dispatch-buttons-row">
                        <button class="wp-btn-action wp-btn-primary" id="btn-dispatch">
                            <i class="fas fa-paper-plane"></i>
                            <span>下发</span>
                        </button>
                        <button class="wp-btn-action wp-btn-success" id="btn-handle">
                            <i class="fas fa-hand-holding"></i>
                            <span>由我来处理</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成主内容区域的HTML代码
     * @returns {string} HTML字符串
     */
    getMainContentHtml() {
        return `
            <div class="dispatch-main-content" id="main-content">
                ${this.getLettersListContainerHtml()}
                ${this.getLetterInfoContainerHtml()}
            </div>
        `;
    },

    /**
     * 生成备注弹窗的HTML代码
     * @returns {string} HTML字符串
     */
    getRemarkModalHtml() {
        return `
            <div class="wp-modal-overlay" id="remark-modal" style="display: none;">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <h3 class="wp-modal-title">
                            <i class="fas fa-comment-alt"></i>
                            请填写下发备注：
                        </h3>
                        <button class="wp-modal-close" id="remark-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body">
                        <textarea class="wp-textarea" id="remark-textarea" placeholder="请输入下发备注..." style="min-height: 120px;"></textarea>
                    </div>
                    <div class="wp-modal-footer">
                        <button class="wp-btn wp-btn-secondary" id="btn-remark-cancel">取消</button>
                        <button class="wp-btn wp-btn-primary" id="btn-remark-save">
                            <i class="fas fa-save"></i>
                            保存
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成完整的页面HTML代码
     * @returns {string} HTML字符串
     */
    getFullPageHtml() {
        return `
            <div class="dispatch-container" id="dispatch-container">
                ${this.getTitleHtml()}
                ${this.getMainContentHtml()}
            </div>
            ${this.getRemarkModalHtml()}
        `;
    },

    /**
     * 生成单个信件列表项的HTML代码
     * @param {Object} letter - 信件数据
     * @param {string} selectedLetterNumber - 当前选中的信件编号
     * @returns {string} HTML字符串
     */
    getLetterItemHtml(letter, selectedLetterNumber) {
        const category = letter['信件三级分类']
            || letter['信件二级分类']
            || letter['信件一级分类']
            || '未分类';

        const formatTime = (time) => {
            if (!time) return '-';
            const date = new Date(time);
            if (isNaN(date.getTime())) return '-';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        return `
            <div class="wp-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
                 data-letter-number="${letter['信件编号']}">
                <div class="dispatch-item-category">${category}</div>
                <div class="dispatch-item-number">${letter['信件编号']}</div>
                <div class="dispatch-item-meta">
                    <span class="dispatch-item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="dispatch-item-time">${formatTime(letter['来信时间'])}</span>
                </div>
            </div>
        `;
    },

    /**
     * 生成信件列表的HTML代码（包含所有信件项）
     * @param {Array} letters - 信件列表
     * @param {string} selectedLetterNumber - 当前选中的信件编号
     * @returns {string} HTML字符串
     */
    getLetterListHtml(letters, selectedLetterNumber) {
        if (letters.length === 0) {
            return `
                <div class="wp-empty-state">
                    <div class="wp-empty-icon"><i class="fas fa-inbox"></i></div>
                    <h3 class="wp-empty-title">没有预处理信件</h3>
                    <p class="wp-empty-desc">当前没有待处理的预处理信件</p>
                </div>
            `;
        }

        return letters.map((letter) => this.getLetterItemHtml(letter, selectedLetterNumber)).join('');
    },

    /**
     * 生成下拉框选项的HTML代码
     * @param {Array} options - 选项列表
     * @returns {string} HTML字符串
     */
    getDropdownOptionsHtml(options) {
        return options.map(opt => {
            if (opt.type === 'group') {
                return `<div class="dispatch-select-option-group">${opt.label}</div>`;
            }
            return `<div class="dispatch-select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
        }).join('');
    },

    /**
     * 生成多选下拉框选项的HTML代码
     * @param {Array} items - 选项列表
     * @returns {string} HTML字符串
     */
    getMultiSelectOptionsHtml(items) {
        return items.map(item => `
            <div class="dispatch-select-option" data-value="${item['专项关注标题']}">
                <div class="dispatch-select-option-checkbox"></div>
                <div class="dispatch-select-option-label">${item['专项关注标题']}</div>
            </div>
        `).join('');
    }
};
