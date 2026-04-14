/**
 * 专项关注管理页面HTML生成模块
 */

const SpecialFocusHtml = {
    /**
     * 生成专项关注管理页面HTML结构
     * @returns {string} HTML字符串
     */
    generateHTML() {
        return `
            <div class="h-full flex flex-col overflow-hidden">
                <!-- 页面标题栏 -->
                <div class="wp-header mb-6" id="special-focus-header">
                    <div class="wp-header-left">
                        <div class="wp-header-icon">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="wp-header-content">
                            <h2 class="wp-header-title">专项关注管理</h2>
                            <p class="wp-header-subtitle">管理上级或专项行动关注的议题标签</p>
                        </div>
                    </div>
                    <div class="wp-header-right">
                        <button id="btn-add-special-focus" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center shadow-sm">
                            <i class="fas fa-plus mr-2"></i>
                            新增专项关注
                        </button>
                    </div>
                </div>

                <!-- 专项关注列表 -->
                <div class="wp-panel flex-1 flex flex-col min-h-0">
                    <!-- 搜索栏 -->
                    <div class="p-4 border-b border-gray-100 search-filter-panel shrink-0">
                        <div class="flex gap-4">
                            <div class="flex-1">
                                <div class="wp-input-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="search-input" class="wp-input" placeholder="搜索专项关注标题...">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 表格 -->
                    <div class="flex-1 overflow-auto wp-scrollbar">
                        <table class="wp-table">
                            <thead class="sticky top-0 z-10">
                                <tr>
                                    <th class="w-[80px]">序号</th>
                                    <th class="w-1/4">专项关注标题</th>
                                    <th class="w-1/2">描述</th>
                                    <th class="w-[160px]">创建时间</th>
                                    <th class="w-[160px] text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="special-focus-table-body">
                                <!-- 数据将通过 JavaScript 动态加载 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="wp-pagination shrink-0" id="special-focus-pagination">
                        <div class="wp-pagination-info">
                            <span class="wp-pagination-text" id="pagination-info">共 0 条记录</span>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-500">每页显示：</label>
                                <select id="page-size-select" class="wp-select" style="width: 80px;" onchange="window.workplace.controllers['special-focus'].onPageSizeChange()">
                                    <option value="10">10条</option>
                                    <option value="20" selected>20条</option>
                                    <option value="50">50条</option>
                                    <option value="100">100条</option>
                                </select>
                            </div>
                        </div>
                        <div class="wp-pagination-controls" id="pagination-controls">
                            <!-- 分页按钮将动态生成 -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 新增/编辑专项关注弹窗 -->
            <div id="special-focus-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <div class="wp-modal-title">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fas fa-star text-blue-600"></i>
                            </div>
                            <div>
                                <h3 id="modal-title">新增专项关注</h3>
                            </div>
                        </div>
                        <button class="wp-modal-close" id="btn-cancel-icon">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body space-y-4">
                        <input type="hidden" id="special-focus-id">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">专项关注标题 <span class="text-red-500">*</span></label>
                            <input type="text" id="input-title" placeholder="请输入专项关注标题，如：涉黑涉恶、严重上访风险等" class="wp-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">描述</label>
                            <textarea id="input-description" rows="4" placeholder="请输入专项关注的详细说明..." class="wp-input resize-none h-auto py-3"></textarea>
                        </div>
                    </div>
                    <div class="wp-modal-footer">
                        <button id="btn-cancel" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">取消</button>
                        <button id="btn-save" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">保存</button>
                    </div>
                </div>
            </div>

            <!-- 删除确认弹窗 -->
            <div id="delete-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container small">
                    <div class="p-6 text-center">
                        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
                        <p class="text-gray-500 mb-6">确定要删除这个专项关注标签吗？此操作不可恢复。</p>
                        <div class="flex justify-center gap-3">
                            <button id="btn-cancel-delete" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">取消</button>
                            <button id="btn-confirm-delete" class="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">删除</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.SpecialFocusHtml = SpecialFocusHtml;
