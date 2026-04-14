/**
 * 核查工作台HTML生成模块
 *
 * 负责动态生成页面HTML结构
 * 使用通用样式类，保持与项目风格一致
 */

const AuditHtml = {
    /**
     * 生成标题面板的HTML代码
     * @returns {string} HTML字符串
     */
    getTitleHtml() {
        return `
            <div class="wp-header" id="audit-header">
                <div class="wp-header-left">
                    <div class="wp-header-icon">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <div class="wp-header-content">
                        <h2 class="wp-header-title">核查工作台</h2>
                        <p class="wp-header-subtitle">审核反馈内容，确保解决群众诉求</p>
                    </div>
                </div>
                <div class="wp-header-right">
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
            <div class="audit-letter-list-panel wp-scrollbar" id="letter-list-panel">
            </div>
        `;
    },

    /**
     * 生成右侧信件详情的HTML代码
     * @returns {string} HTML字符串
     */
    getLetterInfoContainerHtml() {
        return `
            <div class="audit-letter-detail-panel" id="letter-detail-panel">
                <div class="audit-detail-top">
                    <div class="audit-detail-info">
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
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-time" readonly placeholder="-" title="不可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-user" title="群众姓名"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-citizen" readonly placeholder="-" title="不可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-phone" title="手机号码"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-phone" readonly placeholder="-" title="不可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-id-card" title="身份证号码"></i>
                            <input type="text" class="wp-editable-field wp-text-animate" id="detail-idcard" readonly placeholder="-" title="不可编辑">
                        </div>
                        <div class="wp-info-row">
                            <i class="fas fa-inbox" title="信件来源"></i>
                            <span class="wp-info-value wp-text-animate" id="detail-source">-</span>
                        </div>
                    </div>

                    <div class="audit-detail-content">
                        <div class="audit-content-header">
                            <i class="fas fa-align-left"></i>
                            <span>诉求内容</span>
                        </div>
                        <textarea class="audit-appeal-textarea wp-text-animate wp-scrollbar" id="detail-appeal-content" placeholder="暂无诉求内容..." readonly></textarea>
                    </div>
                </div>

                <div class="audit-detail-middle" id="detail-middle">
                    <div class="audit-tabs">
                        <div class="audit-tab active" data-tab="ai">AI审查</div>
                        <div class="audit-tab" data-tab="flow">流转记录</div>
                        <div class="audit-tab" data-tab="feedback">反馈内容</div>
                        <div class="audit-tab" data-tab="files">所有文件</div>
                    </div>
                    
                    <div class="audit-tab-content active" id="tab-ai" style="padding: 16px;">
                        <div class="audit-ai-chat-messages wp-scrollbar" id="ai-chat-messages">
                        </div>
                        <div class="audit-ai-chat-input-wrapper">
                            <div class="audit-ai-chat-input-container">
                                <input type="text" class="audit-ai-chat-input" id="ai-chat-input" placeholder="让AI审查反馈是否充分...">
                                <button class="audit-ai-chat-send" id="btn-send-message">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="audit-tab-content" id="tab-flow" style="padding: 16px;">
                        <div class="audit-tab-scroll wp-scrollbar" id="flow-records-container">
                            <div class="wp-empty-state">
                                <div class="wp-empty-icon"><i class="fas fa-history"></i></div>
                                <p class="wp-empty-desc">暂无流转记录</p>
                            </div>
                        </div>
                    </div>

                    <div class="audit-tab-content" id="tab-feedback" style="padding: 16px;">
                        <div class="audit-tab-scroll wp-scrollbar" id="feedback-container">
                            <div class="wp-empty-state">
                                <div class="wp-empty-icon"><i class="fas fa-comment-dots"></i></div>
                                <p class="wp-empty-desc">暂无反馈内容</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="audit-tab-content" id="tab-files" style="padding: 16px;">
                        <div class="audit-tab-scroll wp-scrollbar" id="files-container">
                            <div class="wp-empty-state">
                                <div class="wp-empty-icon"><i class="fas fa-folder-open"></i></div>
                                <p class="wp-empty-desc">暂无文件</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="audit-detail-bottom">
                    <div class="audit-bottom-row audit-buttons-row">
                        <button class="wp-btn-action wp-btn-danger" id="btn-reject">
                            <i class="fas fa-times-circle"></i>
                            <span>不通过并退回</span>
                        </button>
                        <button class="wp-btn-action wp-btn-success" id="btn-approve">
                            <i class="fas fa-check-circle"></i>
                            <span>审核通过</span>
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
            <div class="audit-main-content" id="main-content">
                ${this.getLettersListContainerHtml()}
                ${this.getLetterInfoContainerHtml()}
            </div>
        `;
    },

    /**
     * 生成退回原因弹窗的HTML代码
     * @returns {string} HTML字符串
     */
    getRejectModalHtml() {
        return `
            <div class="wp-modal-overlay" id="reject-modal" style="display: none;">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <h3 class="wp-modal-title">
                            <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                            填写退回原因：
                        </h3>
                        <button class="wp-modal-close" id="reject-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body">
                        <textarea class="wp-textarea" id="reject-textarea" placeholder="请输入不通过的详细原因..." style="min-height: 120px;"></textarea>
                    </div>
                    <div class="wp-modal-footer">
                        <button class="wp-btn wp-btn-secondary" id="btn-reject-cancel">取消</button>
                        <button class="wp-btn wp-btn-danger" id="btn-reject-confirm">
                            <i class="fas fa-reply"></i>
                            确认退回
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成通过备注弹窗的HTML代码
     */
    getApproveModalHtml() {
        return `
            <div class="wp-modal-overlay" id="approve-modal" style="display: none;">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <h3 class="wp-modal-title">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            审核通过备注（可选）：
                        </h3>
                        <button class="wp-modal-close" id="approve-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body">
                        <textarea class="wp-textarea" id="approve-textarea" placeholder="可在此输入通过备注..." style="min-height: 120px;"></textarea>
                    </div>
                    <div class="wp-modal-footer">
                        <button class="wp-btn wp-btn-secondary" id="btn-approve-cancel">取消</button>
                        <button class="wp-btn wp-btn-success" id="btn-approve-confirm">
                            <i class="fas fa-check"></i>
                            确认通过
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
            <div class="audit-container" id="audit-container">
                ${this.getTitleHtml()}
                ${this.getMainContentHtml()}
            </div>
            ${this.getRejectModalHtml()}
            ${this.getApproveModalHtml()}
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
                <div class="audit-item-category">${category}</div>
                <div class="audit-item-number">${letter['信件编号']}</div>
                <div class="audit-item-meta">
                    <span class="audit-item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="audit-item-time">${formatTime(letter['来信时间'])}</span>
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
                    <div class="wp-empty-icon"><i class="fas fa-check-double"></i></div>
                    <h3 class="wp-empty-title">没有待核查信件</h3>
                    <p class="wp-empty-desc">当前没有需要您审核的信件</p>
                </div>
            `;
        }

        return letters.map((letter) => this.getLetterItemHtml(letter, selectedLetterNumber)).join('');
    }
};
