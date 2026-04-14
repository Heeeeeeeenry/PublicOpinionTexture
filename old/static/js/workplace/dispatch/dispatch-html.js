/**
 * 下发工作台HTML生成模块
 *
 * 负责动态生成页面HTML结构
 * 方法全部导出，供其它代码调用
 */

/**
 * 生成标题面板的HTML代码
 * @returns {string} HTML字符串
 */
export function getTitleHtml() {
    return `
        <div class="dispatch-header" id="dispatch-header">
            <div class="header-left">
                <div class="header-icon">
                    <i class="fas fa-paper-plane"></i>
                </div>
                <div class="header-content">
                    <h2 class="header-title">下发工作台</h2>
                    <p class="header-subtitle">将预处理信件下发至指定单位办理</p>
                </div>
            </div>
            <div class="header-right">
                <div class="auto-dispatch-checkbox" title="自动下发功能将会让助手自动下发信件，虽然这会让信件处理效率大幅提升，但也可能造成分类不准确、下发单位不正确等等问题。勾选此处需慎重。">
                    <input type="checkbox" id="auto-dispatch-check" class="checkbox-input">
                    <label for="auto-dispatch-check" class="checkbox-label">自动下发</label>
                </div>
                <div class="letter-count">
                    <span class="count-value" id="letter-count">0</span>
                    <span class="count-label">封待处理</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 生成左侧信件列表的HTML代码（不包含信件项）
 * @returns {string} HTML字符串
 */
export function getLettersListContainerHtml() {
    return `
        <div class="letter-list-panel" id="letter-list-panel">
            <!-- 信件列表将通过JS动态生成 -->
        </div>
    `;
}

/**
 * 生成右侧信件详情的HTML代码（不包含信件项）
 * @returns {string} HTML字符串
 */
export function getLetterInfoContainerHtml() {
    return `
        <div class="letter-detail-panel" id="letter-detail-panel">
            <!-- 上方区域 -->
            <div class="detail-top">
                <!-- 左侧40% - 7行信息 -->
                <div class="detail-info">
                    <div class="info-row">
                        <i class="fas fa-envelope" title="信件编号"></i>
                        <span class="info-value animate-text py-0.5" id="detail-letter-number">-</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-tags" title="信件分类"></i>
                        <span class="info-value animate-text py-0.5" id="detail-category">-</span>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-clock" title="来信时间"></i>
                        <input type="text" class="w-full text-[13px] font-medium text-gray-800 bg-transparent border-none outline-none rounded px-1 py-0.5 transition cursor-pointer animate-text" id="detail-time" readonly placeholder="-" title="点击可编辑">
                    </div>
                    <div class="info-row">
                        <i class="fas fa-user" title="群众姓名"></i>
                        <input type="text" class="flex-1 w-full text-[13px] text-gray-700 bg-transparent border-none outline-none rounded px-1 py-0.5 transition cursor-pointer resize-none animate-text" id="detail-citizen" readonly placeholder="-" title="点击可编辑">
                    </div>
                    <div class="info-row">
                        <i class="fas fa-phone" title="手机号码"></i>
                        <input type="text" class="flex-1 w-full text-[13px] text-gray-700 bg-transparent border-none outline-none rounded px-1 py-0.5 transition cursor-pointer resize-none animate-text" id="detail-phone" readonly placeholder="-" title="点击可编辑">
                    </div>
                    <div class="info-row">
                        <i class="fas fa-id-card" title="身份证号码"></i>
                        <input type="text" class="flex-1 w-full text-[13px] text-gray-700 bg-transparent border-none outline-none rounded px-1 py-0.5 transition cursor-pointer resize-none animate-text" id="detail-idcard" readonly placeholder="-" title="点击可编辑">
                    </div>
                    <div class="info-row">
                        <i class="fas fa-inbox" title="信件来源"></i>
                        <span class="info-value animate-text py-0.5" id="detail-source">-</span>
                    </div>
                </div>

                <!-- 右侧60% - 诉求内容 -->
                <div class="detail-content flex flex-col">
                    <div class="content-header">
                        <i class="fas fa-align-left"></i>
                        <span>诉求内容</span>
                    </div>
                    <textarea class="flex-1 w-full text-sm text-gray-700 mt-1 leading-relaxed bg-transparent border-none outline-none focus:bg-blue-50 focus:ring-2 focus:ring-blue-200 rounded px-1 py-0.5 transition cursor-pointer resize-none animate-text" id="detail-appeal-content" placeholder="请输入诉求内容..." title="点击可编辑" readonly></textarea>
                </div>
            </div>

            <!-- 中部区域 - AI聊天框 -->
            <div class="detail-middle" id="detail-middle">
                <!-- 聊天消息区域 -->
                <div class="ai-chat-messages" id="ai-chat-messages">
                    <!-- 消息将动态插入此处 -->
                </div>

                <!-- 聊天输入区域 -->
                <div class="ai-chat-input-wrapper">
                    <input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="请输入您的问题...">
                    <button class="ai-chat-send" id="btn-send-message">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            <!-- 底部区域 -->
            <div class="detail-bottom">
                <!-- 第一行：下拉框 -->
                <div class="bottom-row controls-row">
                    <!-- 信件分类下拉框 -->
                    <div class="searchable-select" id="category-select-container">
                        <div class="select-input-wrapper">
                            <input type="text" class="select-input" id="category-select-input" placeholder="选择信件分类..." readonly>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown" id="category-select-dropdown">
                            <div class="select-search">
                                <input type="text" class="search-input" id="category-search" placeholder="搜索分类...">
                            </div>
                            <div class="select-options" id="category-select-options">
                                <!-- 选项将通过JS动态生成 -->
                            </div>
                        </div>
                    </div>

                    <!-- 下发单位下拉框 -->
                    <div class="searchable-select" id="unit-select-container">
                        <div class="select-input-wrapper">
                            <input type="text" class="select-input" id="unit-select-input" placeholder="选择下发单位..." readonly>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown" id="unit-select-dropdown">
                            <div class="select-search">
                                <input type="text" class="search-input" id="unit-search" placeholder="搜索单位...">
                            </div>
                            <div class="select-options" id="unit-select-options">
                                <!-- 选项将通过JS动态生成 -->
                            </div>
                        </div>
                    </div>

                    <!-- 专项关注多选下拉框 -->
                    <div class="searchable-select multi-select" id="focus-select-container">
                        <div class="select-input-wrapper">
                            <input type="text" class="select-input" id="focus-select-input" placeholder="选择专项关注..." readonly>
                            <i class="fas fa-chevron-down select-arrow"></i>
                        </div>
                        <div class="select-dropdown" id="focus-select-dropdown">
                            <div class="select-search">
                                <input type="text" class="search-input" id="focus-search" placeholder="搜索专项关注...">
                            </div>
                            <div class="select-options" id="focus-select-options">
                                <!-- 选项将通过JS动态生成 -->
                            </div>
                        </div>
                    </div>

                    <!-- 备注按钮 -->
                    <button class="remark-btn" id="btn-remark" title="添加备注">
                        <i class="fas fa-comment-alt"></i>
                        <span>备注</span>
                    </button>
                </div>

                <!-- 第二行：按钮 -->
                <div class="bottom-row buttons-row">
                    <button class="action-btn dispatch" id="btn-dispatch">
                        <i class="fas fa-paper-plane"></i>
                        <span>下发</span>
                    </button>
                    <button class="action-btn handle" id="btn-handle">
                        <i class="fas fa-hand-holding"></i>
                        <span>由我来处理</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 生成主内容区域的HTML代码
 * @returns {string} HTML字符串
 */
export function getMainContentHtml() {
    return `
        <div class="main-content" id="main-content">
            ${getLettersListContainerHtml()}
            ${getLetterInfoContainerHtml()}
        </div>
    `;
}

/**
 * 生成下发弹窗的HTML代码
 * @returns {string} HTML字符串
 */
export function getDispatchModalHtml() {
    // TODO: 重新设计下发弹窗HTML
    return '';
}

/**
 * 生成备注弹窗的HTML代码
 * @returns {string} HTML字符串
 */
export function getRemarkModalHtml() {
    return `
        <div class="modal-overlay" id="remark-modal" style="display: none;">
            <div class="modal-container remark-modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <i class="fas fa-comment-alt"></i>
                        请填写下发备注：
                    </h3>
                    <button class="modal-close" id="remark-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <textarea class="form-textarea remark-textarea" id="remark-textarea" placeholder="请输入下发备注..."></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="btn-remark-cancel">取消</button>
                    <button class="btn btn-primary" id="btn-remark-save">
                        <i class="fas fa-save"></i>
                        保存
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 生成完整的页面HTML代码
 * @returns {string} HTML字符串
 */
export function getFullPageHtml() {
    return `
        <div class="dispatch-container" id="dispatch-container">
            ${getTitleHtml()}
            ${getMainContentHtml()}
        </div>
        ${getDispatchModalHtml()}
        ${getRemarkModalHtml()}
    `;
}

/**
 * 生成单个信件列表项的HTML代码
 * @param {Object} letter - 信件数据
 * @param {string} selectedLetterNumber - 当前选中的信件编号
 * @returns {string} HTML字符串
 */
export function getLetterItemHtml(letter, selectedLetterNumber) {
    // 获取三级分类作为主标题
    const category = letter['信件三级分类']
        || letter['信件二级分类']
        || letter['信件一级分类']
        || '未分类';

    const formatTime = (time) => {
        if (!time) return '-';
        return new Date(time).toLocaleString('zh-CN');
    };

    return `
        <div class="letter-list-item ${letter['信件编号'] === selectedLetterNumber ? 'active' : ''}"
             data-letter-number="${letter['信件编号']}">
            <div class="item-category">${category}</div>
            <div class="item-number">${letter['信件编号']}</div>
            <div class="item-meta">
                <span class="item-citizen">${letter['群众姓名'] || '匿名'}</span>
                <span class="item-time">${formatTime(letter['来信时间'])}</span>
            </div>
        </div>
    `;
}

/**
 * 生成信件列表的HTML代码（包含所有信件项）
 * @param {Array} letters - 信件列表
 * @param {string} selectedLetterNumber - 当前选中的信件编号
 * @returns {string} HTML字符串
 */
export function getLetterListHtml(letters, selectedLetterNumber) {
    if (letters.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-inbox"></i></div>
                <h3 class="empty-title">没有预处理信件</h3>
                <p class="empty-desc">当前没有待处理的预处理信件</p>
            </div>
        `;
    }

    return letters.map((letter) => getLetterItemHtml(letter, selectedLetterNumber)).join('');
}

/**
 * 生成单位选择器的HTML代码
 * @param {Array} units - 单位列表
 * @returns {string} HTML字符串
 */
export function getUnitSelectorHtml(units) {
    if (units.length === 0) {
        return '<p style="color: #9ca3af; text-align: center;">暂无可下发单位</p>';
    }

    return units.map((unit, index) => {
        const fullPath = [unit['一级'], unit['二级'], unit['三级']].filter(Boolean).join(' / ');
        return `
        <label class="unit-option ${index === 0 ? 'selected' : ''}" data-unit-full-name="${fullPath}">
            <input type="radio" name="unit" value="${fullPath}" ${index === 0 ? 'checked' : ''}>
            <div class="unit-info">
                <span class="unit-name">${unit['三级'] || unit['二级'] || unit['一级']}</span>
                <span class="unit-path">${unit['一级']}${unit['二级'] ? ' / ' + unit['二级'] : ''}${unit['三级'] ? ' / ' + unit['三级'] : ''}</span>
            </div>
        </label>
    `;
    }).join('');
}

/**
 * 生成下拉框选项的HTML代码
 * @param {Array} options - 选项列表
 * @returns {string} HTML字符串
 */
export function getDropdownOptionsHtml(options) {
    return options.map(opt => {
        if (opt.type === 'group') {
            return `<div class="select-option-group">${opt.label}</div>`;
        }
        return `<div class="select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
    }).join('');
}

/**
 * 生成多选下拉框选项的HTML代码
 * @param {Array} items - 选项列表
 * @returns {string} HTML字符串
 */
export function getMultiSelectOptionsHtml(items) {
    return items.map(item => `
        <div class="select-option" data-value="${item['专项关注标题']}">
            <div class="select-option-checkbox"></div>
            <div class="select-option-label">${item['专项关注标题']}</div>
        </div>
    `).join('');
}

// 默认导出所有方法
export default {
    getTitleHtml,
    getLettersListContainerHtml,
    getLetterInfoContainerHtml,
    getMainContentHtml,
    getDispatchModalHtml,
    getFullPageHtml,
    getLetterItemHtml,
    getLetterListHtml,
    getUnitSelectorHtml,
    getDropdownOptionsHtml,
    getMultiSelectOptionsHtml
};
