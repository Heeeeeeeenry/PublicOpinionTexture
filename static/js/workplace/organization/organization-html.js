/**
 * 组织管理页面HTML生成模块
 */

const OrganizationHtml = {
    /**
     * 生成组织管理页面HTML结构
     * @returns {string} HTML字符串
     */
    generateHTML() {
        return `
            <div class="h-full flex flex-col overflow-hidden">
                <!-- 页面标题栏 -->
                <div class="wp-header mb-6" id="organization-header">
                    <div class="wp-header-left">
                        <div class="wp-header-icon">
                            <i class="fas fa-sitemap"></i>
                        </div>
                        <div class="wp-header-content">
                            <h2 class="wp-header-title">组织管理</h2>
                            <p class="wp-header-subtitle">管理单位组织架构和下发权限</p>
                        </div>
                    </div>
                </div>

                <!-- 选项卡 -->
                <div class="wp-panel mb-6 tabs-panel overflow-hidden">
                    <div class="wp-tabs-nav border-b border-gray-100">
                        <button id="tab-units" class="wp-tab-btn active flex-1" data-tab="units">
                            <i class="fas fa-building"></i>单位管理
                        </button>
                        <button id="tab-dispatch" class="wp-tab-btn flex-1" data-tab="dispatch">
                            <i class="fas fa-paper-plane"></i>下发权限
                        </button>
                    </div>
                </div>

                <!-- 单位管理选项卡内容 -->
                <div id="tab-content-units" class="wp-panel flex-1 flex flex-col min-h-0 wp-tab-content active">
                    <!-- 搜索栏 -->
                    <div class="p-4 border-b border-gray-100 search-filter-panel shrink-0">
                        <div class="flex gap-4">
                            <div class="flex-1">
                                <div class="wp-input-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="unit-search-input" class="wp-input" placeholder="搜索单位名称...">
                                </div>
                            </div>
                            <select id="filter-level1" class="wp-select w-48">
                                <option value="">全部一级单位</option>
                            </select>
                            <button id="btn-add-unit" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center shadow-sm">
                                <i class="fas fa-plus mr-2"></i>
                                新增单位
                            </button>
                        </div>
                    </div>

                    <!-- 表格 -->
                    <div class="flex-1 overflow-auto wp-scrollbar">
                        <table class="wp-table">
                            <thead class="sticky top-0 z-10">
                                <tr>
                                    <th class="w-1/4">一级单位</th>
                                    <th class="w-1/4">二级单位</th>
                                    <th class="w-1/4">三级单位</th>
                                    <th class="w-[160px] text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="units-table-body">
                                <!-- 数据将通过 JavaScript 动态加载 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="wp-pagination shrink-0" id="units-pagination">
                        <div class="wp-pagination-info">
                            <span class="wp-pagination-text" id="units-pagination-info">共 0 条记录</span>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-500">每页显示：</label>
                                <select id="units-page-size-select" class="wp-select" style="width: 80px;" onchange="window.workplace.controllers.organization.onUnitsPageSizeChange()">
                                    <option value="10">10条</option>
                                    <option value="20" selected>20条</option>
                                    <option value="50">50条</option>
                                    <option value="100">100条</option>
                                </select>
                            </div>
                        </div>
                        <div class="wp-pagination-controls" id="units-pagination-controls">
                            <!-- 分页按钮将动态生成 -->
                        </div>
                    </div>
                </div>

                <!-- 下发权限选项卡内容 -->
                <div id="tab-content-dispatch" class="wp-panel flex-1 flex flex-col min-h-0 wp-tab-content" style="display: none;">
                    <!-- 搜索栏 -->
                    <div class="p-4 border-b border-gray-100 search-filter-panel shrink-0">
                        <div class="flex gap-4">
                            <div class="flex-1">
                                <div class="wp-input-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="dispatch-search-input" class="wp-input" placeholder="搜索单位名称...">
                                </div>
                            </div>
                            <button id="btn-add-dispatch" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center shadow-sm">
                                <i class="fas fa-plus mr-2"></i>
                                新增下发权限
                            </button>
                        </div>
                    </div>

                    <!-- 表格 -->
                    <div class="flex-1 overflow-auto wp-scrollbar">
                        <table class="wp-table">
                            <thead class="sticky top-0 z-10">
                                <tr>
                                    <th class="w-1/3">单位名称</th>
                                    <th class="w-1/2">下发范围</th>
                                    <th class="w-[160px] text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="dispatch-table-body">
                                <!-- 数据将通过 JavaScript 动态加载 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="wp-pagination shrink-0" id="dispatch-pagination">
                        <div class="wp-pagination-info">
                            <span class="wp-pagination-text" id="dispatch-pagination-info">共 0 条记录</span>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-500">每页显示：</label>
                                <select id="dispatch-page-size-select" class="wp-select" style="width: 80px;" onchange="window.workplace.controllers.organization.onDispatchPageSizeChange()">
                                    <option value="10">10条</option>
                                    <option value="20" selected>20条</option>
                                    <option value="50">50条</option>
                                    <option value="100">100条</option>
                                </select>
                            </div>
                        </div>
                        <div class="wp-pagination-controls" id="dispatch-pagination-controls">
                            <!-- 分页按钮将动态生成 -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 新增/编辑单位弹窗 -->
            <div id="unit-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <div class="wp-modal-title">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fas fa-building text-blue-600"></i>
                            </div>
                            <div>
                                <h3 id="unit-modal-title">新增单位</h3>
                            </div>
                        </div>
                        <button class="wp-modal-close" id="btn-unit-cancel-icon">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body space-y-4">
                        <input type="hidden" id="unit-id">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">一级单位 <span class="text-red-500">*</span></label>
                            <input type="text" id="input-unit-level1" placeholder="请输入一级单位" class="wp-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">二级单位</label>
                            <input type="text" id="input-unit-level2" placeholder="请输入二级单位（可选）" class="wp-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">三级单位</label>
                            <input type="text" id="input-unit-level3" placeholder="请输入三级单位（可选）" class="wp-input">
                        </div>
                    </div>
                    <div class="wp-modal-footer">
                        <button id="btn-unit-cancel" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">取消</button>
                        <button id="btn-unit-save" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">保存</button>
                    </div>
                </div>
            </div>

            <!-- 新增/编辑下发权限弹窗 -->
            <div id="dispatch-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container large">
                    <div class="wp-modal-header">
                        <div class="wp-modal-title">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fas fa-paper-plane text-blue-600"></i>
                            </div>
                            <div>
                                <h3 id="dispatch-modal-title">新增下发权限</h3>
                            </div>
                        </div>
                        <button class="wp-modal-close" id="btn-dispatch-cancel-icon">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body space-y-4">
                        <input type="hidden" id="dispatch-permission-id">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">单位编码 <span class="text-red-500">*</span></label>
                            <div class="relative">
                                <input type="text" id="input-dispatch-unit-search" placeholder="搜索单位名称或编码..." class="wp-input">
                                <div id="dispatch-unit-dropdown" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto hidden wp-scrollbar">
                                    <!-- 单位选项将动态生成 -->
                                </div>
                            </div>
                            <input type="hidden" id="input-dispatch-unit">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">下发范围 <span class="text-red-500">*</span></label>
                            <div class="space-y-2 flex gap-4">
                                <label class="flex items-center">
                                    <input type="radio" name="dispatch-scope-type" value="all" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" checked>
                                    <span class="ml-2 text-sm text-gray-700">向所有单位下发</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="radio" name="dispatch-scope-type" value="specific" class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">向指定单位下发</span>
                                </label>
                            </div>
                        </div>
                        <div id="specific-units-container" class="hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2 mt-4">选择可下发的单位</label>
                            <div class="grid grid-cols-2 gap-4">
                                <!-- 左侧：可选单位列表 -->
                                <div>
                                    <div class="mb-3">
                                        <div class="wp-input-search">
                                            <i class="fas fa-search"></i>
                                            <input type="text" id="input-units-filter" class="wp-input" placeholder="搜索单位名称或编码...">
                                        </div>
                                    </div>
                                    <div class="h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50 wp-scrollbar">
                                        <div id="units-checkbox-list" class="space-y-2">
                                            <!-- 单位复选框将动态生成 -->
                                        </div>
                                    </div>
                                </div>
                                <!-- 右侧：已选单位列表 -->
                                <div>
                                    <div class="mb-3 flex items-center justify-between">
                                        <span class="text-sm text-gray-600">已选单位 (<span id="selected-units-count">0</span>)</span>
                                        <button id="btn-clear-selected" class="text-xs text-red-600 hover:text-red-800">清空</button>
                                    </div>
                                    <div class="h-60 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-blue-50 wp-scrollbar">
                                        <div id="selected-units-list" class="space-y-2">
                                            <!-- 已选单位将动态生成 -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="wp-modal-footer">
                        <button id="btn-dispatch-cancel" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">取消</button>
                        <button id="btn-dispatch-save" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">保存</button>
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
                        <p class="text-gray-500 mb-6" id="delete-modal-message">确定要删除吗？此操作不可恢复。</p>
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

window.OrganizationHtml = OrganizationHtml;
