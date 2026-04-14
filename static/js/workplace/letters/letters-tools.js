/**
 * 信件页面辅助工具模块
 *
 * 负责信件页面的HTML生成、数据处理、格式化等辅助功能
 * 控制器负责执行逻辑，具体实现放在此文件中
 */

const LettersTools = {
    /**
     * 生成信件页面HTML结构
     * @returns {string} HTML字符串
     */
    generateHTML() {
        return `
            <div class="h-full flex flex-col overflow-hidden">
                <!-- 搜索筛选区域 -->
                <div class="letters-header wp-panel mb-6" id="letters-header">
                    <div class="wp-panel-body">
                        <!-- 分类筛选 -->
                        <div class="flex gap-4 mb-4 flex-wrap">
                            <div class="flex flex-col gap-2 min-w-[180px]">
                                <label class="text-sm font-medium text-gray-700">一级分类</label>
                                <select id="letters-filter-level1" class="wp-select" onchange="window.workplace.controllers.letters.onCategoryChange(1)">
                                    <option value="">全部</option>
                                </select>
                            </div>
                            <div class="flex flex-col gap-2 min-w-[180px]">
                                <label class="text-sm font-medium text-gray-700">二级分类</label>
                                <select id="letters-filter-level2" class="wp-select" onchange="window.workplace.controllers.letters.onCategoryChange(2)">
                                    <option value="">全部</option>
                                </select>
                            </div>
                            <div class="flex flex-col gap-2 min-w-[180px]">
                                <label class="text-sm font-medium text-gray-700">三级分类</label>
                                <select id="letters-filter-level3" class="wp-select" onchange="window.workplace.controllers.letters.onCategoryChange(3)">
                                    <option value="">全部</option>
                                </select>
                            </div>
                        </div>

                        <!-- 内容搜索 -->
                        <div class="mb-4">
                            <div class="wp-input-search">
                                <i class="fas fa-search"></i>
                                <input type="text" id="letters-search-input" class="wp-input" 
                                       placeholder='搜索内容（可用|分割多个关键字，执行"或"搜索）'>
                            </div>
                            <div class="wp-hint mt-2">
                                <i class="fas fa-info-circle text-blue-500"></i>
                                <span>提示：使用 | 分割多个关键字，如"噪音|污染"将搜索包含任一关键字的内容</span>
                            </div>
                        </div>

                        <!-- 状态筛选 -->
                        <div class="flex items-center gap-3 flex-wrap pt-4 border-t border-gray-100">
                            <span class="text-sm font-medium text-gray-700">信件状态：</span>
                            <div class="flex gap-2 flex-wrap" id="letters-status-filters">
                                <button class="wp-status-filter-btn active" data-status="">全部</button>
                                <button class="wp-status-filter-btn" data-status="预处理">预处理</button>
                                <button class="wp-status-filter-btn" data-status="市局已签收">市局已签收</button>
                                <button class="wp-status-filter-btn" data-status="区县局已签收">区县局已签收</button>
                                <button class="wp-status-filter-btn" data-status="办理单位已签收">办理单位已签收</button>
                                <button class="wp-status-filter-btn" data-status="市局正在处理">市局正在处理</button>
                                <button class="wp-status-filter-btn" data-status="区县局正在处理">区县局正在处理</button>
                                <button class="wp-status-filter-btn" data-status="办理单位正在处理">办理单位正在处理</button>
                                <button class="wp-status-filter-btn" data-status="已办结">已办结</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 信件列表区域 -->
                <div class="letters-filter-panel wp-panel flex-1 flex flex-col min-h-0" id="letters-filter-panel">
                    <!-- 工具栏 -->
                    <div class="flex items-center p-4 border-b border-gray-100 shrink-0">
                        <span class="text-sm text-gray-500">
                            共 <strong class="text-blue-600 text-lg" id="letters-total-count">0</strong> 封信件
                        </span>
                    </div>

                    <!-- 信件列表表格 -->
                    <div class="flex-1 overflow-auto wp-scrollbar">
                        <table class="wp-table">
                            <thead class="sticky top-0 z-10">
                                <tr>
                                    <th class="w-[140px]">信件编号</th>
                                    <th class="w-[120px]">分类</th>
                                    <th class="w-[120px]">群众信息</th>
                                    <th class="min-w-[300px]">诉求内容</th>
                                    <th class="w-[140px]">来信时间</th>
                                    <th class="w-[200px]">状态</th>
                                </tr>
                            </thead>
                            <tbody id="letters-list-body">
                            </tbody>
                        </table>
                    </div>

                    <!-- 空状态 -->
                    <div id="letters-empty-state" class="wp-empty-state hidden">
                        <div class="wp-empty-icon">
                            <i class="fas fa-inbox"></i>
                        </div>
                        <p class="wp-empty-title">暂无符合条件的信件</p>
                        <p class="wp-empty-desc">尝试调整筛选条件</p>
                    </div>

                    <!-- 分页 -->
                    <div class="wp-pagination shrink-0" id="letters-pagination">
                        <div class="wp-pagination-info">
                            <span class="wp-pagination-text" id="pagination-info">共 0 条记录</span>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-500">每页显示：</label>
                                <select id="page-size-select" class="wp-select" style="width: 80px;" onchange="window.workplace.controllers.letters.onPageSizeChange()">
                                    <option value="10">10条</option>
                                    <option value="20" selected>20条</option>
                                    <option value="50">50条</option>
                                    <option value="100">100条</option>
                                </select>
                            </div>
                        </div>
                        <div class="wp-pagination-controls" id="pagination-controls">
                        </div>
                    </div>
                </div>
            </div>

            <!-- 信件详情弹窗 -->
            <div id="letter-detail-modal" class="wp-modal-overlay hidden">
                <div class="letter-detail-container wp-modal-container large">
                    <!-- 弹窗头部 -->
                    <div class="wp-modal-header">
                        <div class="wp-modal-title">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fas fa-envelope-open-text text-blue-600"></i>
                            </div>
                            <div>
                                <h3>信件详情</h3>
                                <p class="text-sm text-gray-500 font-normal" id="detail-letter-number">--</p>
                            </div>
                        </div>
                        <button class="wp-modal-close" id="btn-close-detail">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- 标签页导航 -->
                    <div class="wp-tabs-nav">
                        <button class="wp-tab-btn active" data-tab="basic">
                            <i class="fas fa-info-circle"></i>基本信息
                        </button>
                        <button class="wp-tab-btn" data-tab="flow">
                            <i class="fas fa-history"></i>流转记录
                        </button>
                        <button class="wp-tab-btn" data-tab="files">
                            <i class="fas fa-paperclip"></i>附件文件
                        </button>
                    </div>

                    <!-- 标签页内容区域 -->
                    <div class="wp-modal-body wp-scrollbar">
                        <!-- 基本信息标签页 -->
                        <div id="tab-basic" class="wp-tab-content active">
                            <!-- 群众信息卡片 -->
                            <div class="wp-info-card mb-5">
                                <h4 class="wp-info-card-title">
                                    <i class="fas fa-user-circle text-blue-500 mr-2"></i>群众信息
                                </h4>
                                <div class="grid grid-cols-3 gap-4">
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">群众姓名</span>
                                        <input type="text" class="wp-editable-field" id="detail-name" readonly placeholder="-" title="点击可编辑">
                                    </div>
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">手机号</span>
                                        <input type="text" class="wp-editable-field" id="detail-phone" readonly placeholder="-" title="点击可编辑">
                                    </div>
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">身份证号</span>
                                        <input type="text" class="wp-editable-field" id="detail-idcard" readonly placeholder="-" title="点击可编辑">
                                    </div>
                                </div>
                            </div>

                            <!-- 信件信息卡片 -->
                            <div class="wp-info-card mb-5">
                                <h4 class="wp-info-card-title">
                                    <i class="fas fa-envelope text-blue-500 mr-2"></i>信件信息
                                </h4>
                                <div class="grid grid-cols-2 gap-4 mb-4">
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">来信时间</span>
                                        <input type="text" class="wp-editable-field" id="detail-time" readonly placeholder="-" title="点击可编辑">
                                    </div>
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">来信渠道</span>
                                        <span class="text-sm font-medium text-gray-800" id="detail-channel">--</span>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg p-3 mb-4">
                                    <span class="text-xs text-gray-400 block mb-1">信件分类</span>
                                    <div class="wp-category-path mt-1">
                                        <span class="wp-category-item level1" id="detail-level1">--</span>
                                        <span class="wp-category-separator"><i class="fas fa-chevron-right"></i></span>
                                        <span class="wp-category-item level2" id="detail-level2">--</span>
                                        <span class="wp-category-separator"><i class="fas fa-chevron-right"></i></span>
                                        <span class="wp-category-item level3" id="detail-level3">--</span>
                                    </div>
                                </div>
                                <div class="bg-white rounded-lg p-3">
                                    <span class="text-xs text-gray-400 block mb-1">诉求内容</span>
                                    <textarea class="wp-editable-field resize-none" id="detail-content" readonly placeholder="-" title="点击可编辑" rows="3"></textarea>
                                </div>
                            </div>

                            <!-- 处理信息卡片 -->
                            <div class="wp-info-card mb-5">
                                <h4 class="wp-info-card-title">
                                    <i class="fas fa-tasks text-blue-500 mr-2"></i>处理信息
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">当前状态</span>
                                        <span class="text-sm font-medium text-gray-800" id="detail-status">--</span>
                                    </div>
                                    <div class="bg-white rounded-lg p-3">
                                        <span class="text-xs text-gray-400 block mb-1">当前处理单位</span>
                                        <span class="text-sm font-medium text-gray-800" id="detail-unit">--</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 专项关注标签 -->
                            <div class="wp-info-card">
                                <h4 class="wp-info-card-title">
                                    <i class="fas fa-tags text-blue-500 mr-2"></i>专项关注标签
                                </h4>
                                <div class="flex flex-wrap gap-2" id="detail-special-focus">
                                    <span class="text-sm text-gray-400">无</span>
                                </div>
                            </div>
                        </div>

                        <!-- 流转记录标签页 -->
                        <div id="tab-flow" class="wp-tab-content">
                            <div class="wp-timeline" id="detail-flow-list">
                            </div>
                        </div>

                        <!-- 附件文件标签页 -->
                        <div id="tab-files" class="wp-tab-content">
                            <div class="space-y-4" id="detail-files-list">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * 获取状态对应的CSS类
     * @param {string} status - 状态文本
     * @returns {string} CSS类名
     */
    getStatusClass(status) {
        if (!status) return 'wp-status-badge new';
        
        if (status === '预处理') return 'wp-status-badge new';
        if (status === '已办结') return 'wp-status-badge completed';
        if (status.includes('处理') || status.includes('办理')) return 'wp-status-badge processing';
        if (status.includes('签收') || status.includes('下发') || status.includes('退回')) return 'wp-status-badge pending';
        if (status.includes('反馈')) return 'wp-status-badge completed';
        
        return 'wp-status-badge new';
    },

    /**
     * 高亮搜索关键字
     * @param {string} text - 原始文本
     * @param {string} keywords - 关键字（用|分割）
     * @returns {string} 高亮后的HTML
     */
    highlightKeywords(text, keywords) {
        if (!keywords) return text;

        const keywordList = keywords.split('|').map(k => k.trim()).filter(k => k);
        if (keywordList.length === 0) return text;

        let displayText = text;

        keywordList.forEach(keyword => {
            if (keyword) {
                const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayText = displayText.replace(regex, '<mark class="bg-yellow-100 text-yellow-700 px-1 rounded">$1</mark>');
            }
        });

        return displayText;
    },

    /**
     * 生成信件列表行HTML
     * @param {Object} letter - 信件数据
     * @param {string} searchKeyword - 搜索关键字
     * @returns {string} HTML字符串
     */
    generateLetterRow(letter, searchKeyword) {
        const statusClass = this.getStatusClass(letter['当前信件状态']);
        const statusText = letter['当前信件状态'] || '未知';
        const time = letter['来信时间'] || '-';

        let content = letter['诉求内容'] || '-';
        if (searchKeyword) {
            content = this.highlightKeywords(content, searchKeyword);
        }

        return `
            <tr class="cursor-pointer" onclick="window.workplace.controllers.letters.viewLetterDetail('${letter['信件编号']}')">
                <td>
                    <span class="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${letter['信件编号'] || '-'}</span>
                </td>
                <td>
                    <div class="flex flex-col gap-1">
                        <span class="text-sm font-medium text-blue-600">${letter['信件一级分类'] || '未分类'}</span>
                        ${letter['信件二级分类'] ? `<span class="text-xs text-gray-500">${letter['信件二级分类']}</span>` : ''}
                        ${letter['信件三级分类'] ? `<span class="text-xs text-gray-500">${letter['信件三级分类']}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="flex flex-col gap-1">
                        <span class="font-medium text-gray-800">${letter['群众姓名'] || '匿名'}</span>
                        ${letter['手机号'] ? `<span class="text-xs text-gray-400">${letter['手机号']}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="text-sm text-gray-600 line-clamp-2">${content}</div>
                </td>
                <td>
                    <span class="text-sm text-gray-500">${time}</span>
                </td>
                <td class="text-center">
                    <span class="${statusClass}">${statusText}</span>
                </td>
            </tr>
        `;
    },

    /**
     * 生成分页HTML
     * @param {number} currentPage - 当前页
     * @param {number} totalPages - 总页数
     * @returns {string} HTML字符串
     */
    generatePaginationHTML(currentPage, totalPages) {
        let html = '';

        html += `
            <button class="wp-page-btn" onclick="window.workplace.controllers.letters.goToPrevPage()" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.letters.goToPage(1)">1</button>`;
            if (start > 2) {
                html += `<span class="wp-page-btn" style="cursor: default; border: none;">...</span>`;
            }
        }

        for (let i = start; i <= end; i++) {
            html += `
                <button class="wp-page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="window.workplace.controllers.letters.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                html += `<span class="wp-page-btn" style="cursor: default; border: none;">...</span>`;
            }
            html += `<button class="wp-page-btn" onclick="window.workplace.controllers.letters.goToPage(${totalPages})">${totalPages}</button>`;
        }

        html += `
            <button class="wp-page-btn" onclick="window.workplace.controllers.letters.goToNextPage()" 
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        return html;
    },

    /**
     * 生成流转记录HTML
     * @param {Array} flowRecords - 流转记录数组
     * @returns {string} HTML字符串
     */
    generateFlowRecordsHTML(flowRecords) {
        if (!flowRecords || flowRecords.length === 0) {
            return '<div class="wp-empty-state"><i class="fas fa-inbox text-4xl mb-3 opacity-30"></i><p>暂无流转记录</p></div>';
        }

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

        return flowRecords.map((record, index) => {
            const isLatest = index === 0;
            const operationType = record['操作类型'] || '-';
            const operatorName = record['操作人姓名'] || '-';
            const operatorId = record['操作人警号'] || '';
            const operatorInfo = operatorId ? `${operatorName}(${operatorId})` : operatorName;
            const operationTime = formatTime(record['操作时间']);
            const beforeUnit = record['操作前单位'] || '-';
            const afterUnit = record['操作后单位'] || '-';
            const beforeStatus = record['操作前状态'] || '-';
            const afterStatus = record['操作后状态'] || '-';
            const remark = record['备注'];

            let remarkHtml = '';
            if (remark && typeof remark === 'object') {
                const remarkItems = [];

                if (remark['信息变更'] && Array.isArray(remark['信息变更'])) {
                    const changesHtml = remark['信息变更'].map(change => {
                        const changeType = change['内容类型'] || change['变更字段'] || '-';
                        const oldVal = change['变更前'] || change['变更前值'] || '-';
                        const newVal = change['变更后'] || change['变更后值'] || '-';
                        return `
                            <div class="wp-timeline-change-item">
                                <span class="change-type">${changeType}：</span>
                                <span class="change-old">${oldVal}</span>
                                <i class="fas fa-arrow-right" style="margin: 0 6px; color: #9ca3af;"></i>
                                <span class="change-new">${newVal}</span>
                            </div>
                        `;
                    }).join('');
                    remarkItems.push(`<div class="wp-timeline-remark-item"><span class="remark-key">信息变更：</span><div class="wp-timeline-changes">${changesHtml}</div></div>`);
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

                remarkHtml = remarkItems.join('');
            } else if (remark && typeof remark === 'string') {
                remarkHtml = `<div class="wp-timeline-remark-item"><span class="remark-key">备注：</span><span>${remark}</span></div>`;
            }

            return `
                <div class="wp-timeline-item ${isLatest ? 'latest' : ''}">
                    <div class="wp-timeline-content">
                        <div class="wp-timeline-header">
                            <span class="wp-timeline-title">${operationType}</span>
                            <span class="wp-timeline-time">${operationTime}</span>
                        </div>
                        <div class="wp-timeline-operator">操作人：${operatorInfo}</div>
                        <div class="wp-timeline-unit">单位：${beforeUnit} → ${afterUnit}</div>
                        <div class="wp-timeline-status">状态：${beforeStatus} → ${afterStatus}</div>
                        ${remarkHtml ? `<div class="wp-timeline-remark">${remarkHtml}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * 生成附件列表HTML
     * @param {Object} filesData - 附件数据
     * @returns {string} HTML字符串
     */
    generateFilesHTML(filesData) {
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
            let files = filesData[category.key] || [];
            if (typeof files === 'string') {
                try {
                    files = JSON.parse(files);
                } catch (e) {
                    files = [];
                }
            }
            if (!Array.isArray(files)) {
                files = [];
            }
            if (files.length > 0) {
                hasFiles = true;
                html += `
                    <div class="wp-info-card">
                        <h4 class="wp-info-card-title">
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
            return '<div class="wp-empty-state"><i class="fas fa-inbox text-4xl mb-3 opacity-30"></i><p>暂无附件</p></div>';
        }

        return html;
    },

    /**
     * 加载分类数据
     * @returns {Promise<Object>} 分类数据
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
                return result.data;
            }
            return {};
        } catch (error) {
            console.error('[LettersTools] 加载分类数据失败:', error);
            return {};
        }
    },

    /**
     * 加载信件列表
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 信件列表数据
     */
    async loadLetters(params) {
        try {
            const response = await fetch('/api/letter/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_list',
                    args: params
                })
            });

            const result = await response.json();

            if (result.success) {
                return {
                    data: result.data || [],
                    total: result.total || result.data.length
                };
            }
            return { data: [], total: 0 };
        } catch (error) {
            console.error('[LettersTools] 加载信件列表失败:', error);
            return { data: [], total: 0 };
        }
    },

    /**
     * 加载信件详情
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Object>} 信件详情
     */
    async loadLetterDetail(letterNumber) {
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
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('[LettersTools] 加载信件详情失败:', error);
            return null;
        }
    },

    /**
     * 加载附件列表
     * @param {string} letterNumber - 信件编号
     * @returns {Promise<Object>} 附件数据
     */
    async loadAttachmentFiles(letterNumber) {
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
                return result.data;
            }
            return {};
        } catch (error) {
            console.error('[LettersTools] 加载附件列表失败:', error);
            return {};
        }
    }
};

window.LettersTools = LettersTools;
