/**
 * 处理工作台HTML生成模块
 *
 * 负责动态生成页面HTML结构
 * 使用通用样式类，保持与项目风格一致
 */

const ProcessingHtml = {
    /**
     * 生成标题面板的HTML代码
     * @returns {string} HTML字符串
     */
    getTitleHtml() {
        return `
            <div class="wp-header" id="processing-header">
                <div class="wp-header-left">
                    <div class="wp-header-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a);">
                        <i class="fas fa-tasks" style="color: #d97706;"></i>
                    </div>
                    <div class="wp-header-content">
                        <h2 class="wp-header-title">处理工作台</h2>
                        <p class="wp-header-subtitle">以最快的速度核实情况，处理群众诉求</p>
                    </div>
                </div>
                <div class="wp-header-right">
                    <div class="wp-count-badge" style="background: linear-gradient(135deg, #fef3c7, #fde68a);">
                        <span class="wp-count-value" id="letter-count" style="color: #d97706;">0</span>
                        <span class="wp-count-label" style="color: #92400e;">封待处理</span>
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
            <div class="processing-letter-list-panel wp-scrollbar" id="letter-list-panel">
            </div>
        `;
    },

    /**
     * 生成右侧信件详情的HTML代码
     * @returns {string} HTML字符串
     */
    getLetterInfoContainerHtml() {
        return `
            <div class="processing-letter-detail-panel" id="letter-detail-panel">
                <div class="processing-detail-top">
                    <div class="processing-detail-info">
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

                    <div class="processing-detail-content">
                        <div class="processing-content-header">
                            <i class="fas fa-align-left"></i>
                            <span>诉求内容</span>
                        </div>
                        <textarea class="processing-appeal-textarea wp-text-animate wp-scrollbar" id="detail-appeal-content" placeholder="请输入诉求内容..." title="点击可编辑" readonly></textarea>
                    </div>
                </div>

                <div class="processing-detail-middle" id="detail-middle">
                    <div class="processing-sidebar">
                        <div class="processing-tabs-nav">
                            <button class="processing-tab-btn active" data-section="flow-records">
                                <i class="fas fa-exchange-alt"></i>
                                <span>流转记录</span>
                            </button>
                            <button class="processing-tab-btn" data-section="history-letters">
                                <i class="fas fa-history"></i>
                                <span>历史来信</span>
                            </button>
                            <button class="processing-tab-btn" data-section="letter-handle">
                                <i class="fas fa-edit"></i>
                                <span>信件处理</span>
                            </button>
                        </div>

                        <div class="processing-countdown" id="countdown-area">
                            <div class="processing-countdown-title">
                                <i class="fas fa-clock"></i>
                                <span>联系剩余时间</span>
                            </div>
                            <div class="processing-countdown-value" id="countdown-value">--:--:--</div>
                            <div class="processing-countdown-label" id="countdown-label">请在规定时间内联系群众</div>
                        </div>
                    </div>

                    <div class="processing-main-area wp-scrollbar" id="processing-scroll-container">
                        <div class="processing-section" id="section-flow-records">
                            <div class="processing-section-header">
                                <i class="fas fa-exchange-alt"></i>
                                <span>流转记录</span>
                            </div>
                            <div class="processing-flow-records" id="flow-records-list">
                            </div>
                        </div>

                        <div class="processing-section" id="section-history-letters">
                            <div class="processing-section-header">
                                <i class="fas fa-history"></i>
                                <span>历史来信</span>
                            </div>
                            <div class="processing-history-list" id="history-letters-list">
                            </div>
                        </div>

                        <div class="processing-section" id="section-letter-handle">
                            <div class="processing-section-header">
                                <div class="processing-section-title">
                                    <i class="fas fa-edit"></i>
                                    <span>信件处理</span>
                                </div>
                                <div class="handle-steps-header">
                                    <div class="handle-step-indicator active" data-step="1">
                                        <div class="handle-step-number">1</div>
                                        <span class="handle-step-title">联系群众</span>
                                    </div>
                                    <div class="handle-step-line"></div>
                                    <div class="handle-step-indicator" data-step="2">
                                        <div class="handle-step-number">2</div>
                                        <span class="handle-step-title">诉求处理</span>
                                    </div>
                                </div>
                            </div>
                            <div class="processing-handle-area" id="letter-handle-area">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="processing-detail-bottom">
                    <div class="processing-bottom-row processing-controls-row">
                        <div class="processing-searchable-select" id="category-select-container">
                            <div class="processing-select-input-wrapper">
                                <input type="text" class="processing-select-input" id="category-select-input" placeholder="选择信件分类..." readonly>
                                <i class="fas fa-chevron-down processing-select-arrow"></i>
                            </div>
                            <div class="processing-select-dropdown" id="category-select-dropdown">
                                <div class="processing-select-search">
                                    <input type="text" class="processing-search-input" id="category-search" placeholder="搜索分类...">
                                </div>
                                <div class="processing-select-options wp-scrollbar" id="category-select-options">
                                </div>
                            </div>
                        </div>

                        <button class="wp-remark-btn" id="btn-remark" title="添加备注">
                            <i class="fas fa-comment-alt"></i>
                            <span>备注</span>
                        </button>
                    </div>

                    <div class="processing-bottom-row processing-buttons-row">
                        <button class="wp-btn-action wp-btn-danger" id="btn-return">
                            <i class="fas fa-undo"></i>
                            <span>退回</span>
                        </button>
                        <button class="wp-btn-action wp-btn-warning" id="btn-invalid">
                            <i class="fas fa-times-circle"></i>
                            <span>不属实</span>
                        </button>
                        <button class="wp-btn-action wp-btn-success" id="btn-submit">
                            <i class="fas fa-check-circle"></i>
                            <span>提交</span>
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
            <div class="processing-main-content" id="main-content">
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
                            请填写备注：
                        </h3>
                        <button class="wp-modal-close" id="remark-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body">
                        <textarea class="wp-textarea" id="remark-textarea" placeholder="请输入备注内容..." style="min-height: 120px;"></textarea>
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
            <div class="processing-container" id="processing-container">
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
                <div class="processing-item-category">${category}</div>
                <div class="processing-item-number">${letter['信件编号']}</div>
                <div class="processing-item-meta">
                    <span class="processing-item-citizen">${letter['群众姓名'] || '匿名'}</span>
                    <span class="processing-item-time">${formatTime(letter['来信时间'])}</span>
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
                    <h3 class="wp-empty-title">没有待处理信件</h3>
                    <p class="wp-empty-desc">当前没有待处理的信件</p>
                </div>
            `;
        }

        return letters.map((letter) => this.getLetterItemHtml(letter, selectedLetterNumber)).join('');
    },

    /**
     * 生成流转记录项的HTML代码
     * @param {Object} record - 流转记录
     * @param {boolean} isLatest - 是否是最新记录
     * @returns {string} HTML字符串
     */
    getFlowRecordItemHtml(record, isLatest = false) {
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

        const operatorName = record['操作人姓名'] || '-';
        const operatorId = record['操作人警号'] || '';
        const operatorInfo = operatorId ? `${operatorName}(${operatorId})` : operatorName;

        const beforeUnit = record['操作前单位'] || '';
        const afterUnit = record['操作后单位'] || '';
        const beforeStatus = record['操作前状态'] || '';
        const afterStatus = record['操作后状态'] || '';

        let remarkHtml = '';
        const remark = record['备注'];
        if (remark && typeof remark === 'object') {
            const remarkItems = [];
            
            if (remark['信息变更'] && Array.isArray(remark['信息变更'])) {
                const changeItems = remark['信息变更'].map(change => 
                    `<div class="wp-timeline-change-item">
                        <span class="change-type">${change['内容类型']}：</span>
                        <span class="change-old">${change['变更前'] || '-'}</span>
                        <i class="fas fa-arrow-right" style="margin: 0 6px; color: #9ca3af;"></i>
                        <span class="change-new">${change['变更后'] || '-'}</span>
                    </div>`
                ).join('');
                remarkItems.push(`<div class="wp-timeline-remark-item"><span class="remark-key">信息变更：</span><div class="wp-timeline-changes">${changeItems}</div></div>`);
            }

            if (remark['建议下发办理单位'] && Array.isArray(remark['建议下发办理单位'])) {
                const units = remark['建议下发办理单位'].filter(Boolean).join(' / ');
                remarkItems.push(`<div class="wp-timeline-remark-item"><span class="remark-key">建议下发单位：</span><span>${units}</span></div>`);
            }
            
            for (const [key, value] of Object.entries(remark)) {
                if (key === '信息变更' || key === '建议下发办理单位') continue;
                
                let displayValue = value;
                if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                } else if (typeof value === 'object' && value !== null) {
                    try {
                        displayValue = JSON.stringify(value);
                    } catch (e) {
                        displayValue = String(value);
                    }
                }
                
                if (displayValue !== undefined && displayValue !== null && displayValue !== '') {
                    remarkItems.push(`<div class="wp-timeline-remark-item"><span class="remark-key">${key}：</span><span>${displayValue}</span></div>`);
                }
            }
            
            if (remarkItems.length > 0) {
                remarkHtml = `<div class="wp-timeline-remark">${remarkItems.join('')}</div>`;
            }
        } else if (remark && typeof remark === 'string') {
            remarkHtml = `<div class="wp-timeline-remark"><div class="wp-timeline-remark-item"><span class="remark-key">备注：</span><span>${remark}</span></div></div>`;
        }

        return `
            <div class="wp-timeline-item ${isLatest ? 'latest' : ''}">
                <div class="wp-timeline-content">
                    <div class="wp-timeline-header">
                        <span class="wp-timeline-title">${record['操作类型'] || '-'}</span>
                        <span class="wp-timeline-time">${formatTime(record['操作时间'])}</span>
                    </div>
                    <div class="wp-timeline-operator">操作人：${operatorInfo}</div>
                    ${beforeUnit || afterUnit ? `<div class="wp-timeline-unit">单位：${beforeUnit || '-'} → ${afterUnit || '-'}</div>` : ''}
                    ${beforeStatus || afterStatus ? `<div class="wp-timeline-status">状态：${beforeStatus || '-'} → ${afterStatus || '-'}</div>` : ''}
                    ${remarkHtml}
                </div>
            </div>
        `;
    },

    /**
     * 生成流转记录列表的HTML代码
     * @param {Array} records - 流转记录列表
     * @returns {string} HTML字符串
     */
    getFlowRecordsHtml(records) {
        if (!records || records.length === 0) {
            return `
                <div class="wp-empty-state" style="padding: 30px 16px;">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 12px; opacity: 0.4;"></i>
                    <p style="font-size: 13px; color: #9ca3af;">暂无流转记录</p>
                </div>
            `;
        }

        return `
            <div class="wp-timeline">
                ${records.map((record, index) => this.getFlowRecordItemHtml(record, index === 0)).join('')}
            </div>
        `;
    },

    /**
     * 生成历史来信项的HTML代码
     * @param {Object} letter - 信件数据
     * @returns {string} HTML字符串
     */
    getHistoryLetterItemHtml(letter) {
        const formatTime = (time) => {
            if (!time) return '-';
            const date = new Date(time);
            if (isNaN(date.getTime())) return '-';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        };

        const c1 = letter['信件一级分类'];
        const c2 = letter['信件二级分类'];
        const c3 = letter['信件三级分类'];
        let category = '未分类';
        if (c1 && c2 && c3) {
            category = `${c1} / ${c2} / ${c3}`;
        } else if (c1 && c2) {
            category = `${c1} / ${c2}`;
        } else if (c1) {
            category = c1;
        }

        const appealContent = letter['诉求内容'] || '-';

        return `
            <div class="processing-history-item" data-letter-number="${letter['信件编号']}">
                <div class="processing-history-header">
                    <div class="processing-history-number">${letter['信件编号']}</div>
                    <div class="processing-history-time">${formatTime(letter['来信时间'])}</div>
                </div>
                <div class="processing-history-category">
                    <i class="fas fa-tags"></i>
                    <span>${category}</span>
                </div>
                <div class="processing-history-source">
                    <i class="fas fa-paper-plane"></i>
                    <span>${letter['来信渠道'] || '-'}</span>
                </div>
                <div class="processing-history-content">
                    <i class="fas fa-comment-alt"></i>
                    <span>${appealContent}</span>
                </div>
            </div>
        `;
    },

    /**
     * 生成历史来信列表的HTML代码
     * @param {Array} letters - 信件列表
     * @returns {string} HTML字符串
     */
    getHistoryLettersHtml(letters) {
        if (!letters || letters.length === 0) {
            return `
                <div class="wp-empty-state" style="padding: 30px 16px;">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 12px; opacity: 0.4;"></i>
                    <p style="font-size: 13px; color: #9ca3af;">暂无历史来信</p>
                </div>
            `;
        }

        return letters.map(letter => this.getHistoryLetterItemHtml(letter)).join('');
    },

    /**
     * 生成信件处理区域的HTML代码
     * 两步切换面板：联系群众、诉求处理
     * @param {Array} recordings - 录音文件列表
     * @param {Array} resultFiles - 结果文件列表
     * @returns {string} HTML字符串
     */
    getLetterHandleHtml(recordings, resultFiles) {
        return `
            <div class="handle-steps-container">
                <div class="handle-steps-wrapper">
                    <div class="handle-steps-slider" id="handle-steps-slider">
                        <div class="handle-step-panel" data-step="1">
                            <div class="handle-panel-content recording-panel-content">
                                <div class="handle-panel-section recording-panel-section">
                                    <div class="handle-panel-header">
                                        <div class="handle-panel-section-title">
                                            <i class="fas fa-microphone-alt"></i>
                                            <span>上传电话录音</span>
                                        </div>
                                        <button class="wp-btn wp-btn-primary handle-next-btn" id="btn-next-step" disabled>
                                            <span>下一步：诉求处理</span>
                                            <i class="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                    <div class="recording-layout">
                                        <div class="recording-upload-area" id="recording-upload-area">
                                            <input type="file" id="recording-file-input" accept="audio/*" multiple style="display: none;">
                                            <div class="recording-upload-zone" id="recording-upload-zone">
                                                <div class="recording-upload-icon">
                                                    <i class="fas fa-cloud-upload-alt"></i>
                                                </div>
                                                <div class="recording-upload-text">
                                                    <span class="recording-upload-primary">点击或拖拽上传录音文件</span>
                                                    <span class="recording-upload-secondary">支持 MP3、WAV、M4A、OGG 等音频格式</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="recording-file-list" id="recording-file-list">
                                            ${this.getRecordingListHtml(recordings)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="handle-step-panel" data-step="2">
                            <div class="handle-panel-content result-panel-content">
                                <div class="handle-panel-section result-panel-section">
                                    <div class="handle-panel-header">
                                        <button class="wp-btn wp-btn-secondary handle-prev-btn" id="btn-prev-step">
                                            <i class="fas fa-arrow-left"></i>
                                            <span>上一步：联系群众</span>
                                        </button>
                                        <div class="handle-panel-section-title">
                                            <i class="fas fa-clipboard-check"></i>
                                            <span>处理结果</span>
                                        </div>
                                    </div>

                                    <!-- 主内容区域：左侧60%反馈内容，右侧40%文件区域 -->
                                    <div class="result-main-layout">
                                        <!-- 左侧：反馈内容区域 -->
                                        <div class="result-feedback-section">
                                            <label class="result-section-label">反馈内容</label>
                                            <textarea class="result-feedback-textarea" id="result-feedback-input" placeholder="请输入反馈内容..."></textarea>
                                        </div>

                                        <!-- 右侧：文件上传和列表区域 -->
                                        <div class="result-files-section">
                                            <label class="result-section-label">上传附件</label>
                                            <div class="result-upload-zone" id="result-upload-zone">
                                                <input type="file" id="result-file-input" multiple style="display: none;">
                                                <div class="result-upload-content" id="result-upload-content">
                                                    <i class="fas fa-cloud-upload-alt"></i>
                                                    <span class="result-upload-text">点击或拖拽上传文件</span>
                                                    <span class="result-upload-hint">支持图片、文档等多种格式</span>
                                                </div>
                                                <div class="result-file-list" id="result-file-list">
                                                    ${this.getResultFileListHtml(resultFiles)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 生成录音文件列表HTML
     * @param {Array} recordings - 录音文件列表
     * @returns {string} HTML字符串
     */
    getRecordingListHtml(recordings) {
        if (!recordings || recordings.length === 0) {
            return '';
        }

        return recordings.map((recording, index) => `
            <div class="recording-file-item" data-index="${index}">
                <div class="recording-file-info">
                    <i class="fas fa-file-audio"></i>
                    <span class="recording-file-name">${recording.name}</span>
                    <span class="recording-file-size">${recording.size}</span>
                </div>
                <button class="recording-file-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * 生成结果文件列表HTML
     * @param {Array} files - 文件列表
     * @returns {string} HTML字符串
     */
    getResultFileListHtml(files) {
        if (!files || files.length === 0) {
            return '';
        }

        return files.map((file, index) => `
            <div class="result-file-item" data-index="${index}">
                <div class="result-file-info">
                    <i class="fas fa-file"></i>
                    <span class="result-file-name">${file.name}</span>
                    <span class="result-file-size">${file.size}</span>
                </div>
                <button class="result-file-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * 生成下拉框选项的HTML代码
     * @param {Array} options - 选项列表
     * @returns {string} HTML字符串
     */
    getDropdownOptionsHtml(options) {
        return options.map(opt => {
            if (opt.type === 'group') {
                return `<div class="processing-select-option-group">${opt.label}</div>`;
            }
            return `<div class="processing-select-option" data-value="${opt.value}" data-path="${opt.path || ''}">${opt.label}</div>`;
        }).join('');
    }
};
