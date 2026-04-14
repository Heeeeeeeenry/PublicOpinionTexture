/**
 * 用户管理页面HTML生成模块
 */

const UsersHtml = {
    /**
     * 生成完整的用户管理页面HTML结构
     * @returns {string} HTML字符串
     */
    generateHTML() {
        return `
            <div class="h-full flex flex-col overflow-hidden">
                <!-- 页面标题栏 -->
                <div class="wp-header mb-6" id="users-header">
                    <div class="wp-header-left">
                        <div class="wp-header-icon">
                            <i class="fas fa-users-cog"></i>
                        </div>
                        <div class="wp-header-content">
                            <h2 class="wp-header-title">用户管理</h2>
                            <p class="wp-header-subtitle" id="users-subtitle">管理系统用户账号</p>
                        </div>
                    </div>
                    <div class="wp-header-right">
                        <button id="btn-add-user" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center shadow-sm">
                            <i class="fas fa-plus mr-2"></i>
                            新增用户
                        </button>
                    </div>
                </div>

                <!-- 用户列表 -->
                <div class="wp-panel flex-1 flex flex-col min-h-0" id="users-main-panel">
                    <!-- 搜索栏 -->
                    <div class="p-4 border-b border-gray-100 search-filter-panel shrink-0" id="users-filter-panel">
                        <div class="flex gap-4">
                            <div class="flex-1">
                                <div class="wp-input-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="search-input" class="wp-input" placeholder="搜索姓名、警号、手机号...">
                                </div>
                            </div>
                            <select id="filter-level" class="wp-select w-40">
                                <option value="">全部权限</option>
                                <option value="市局">市局</option>
                                <option value="区县局">区县局</option>
                                <option value="民警">民警</option>
                            </select>
                            <select id="filter-status" class="wp-select w-40">
                                <option value="">全部状态</option>
                                <option value="1">已激活</option>
                                <option value="0">已禁用</option>
                            </select>
                        </div>
                    </div>

                    <!-- 表格 -->
                    <div class="flex-1 overflow-auto wp-scrollbar">
                        <table class="wp-table">
                            <thead class="sticky top-0 z-10">
                                <tr>
                                    <th class="w-[120px]">警号</th>
                                    <th class="w-[120px]">姓名</th>
                                    <th class="w-[120px]">昵称</th>
                                    <th class="w-[120px]">权限级别</th>
                                    <th class="min-w-[200px]">所属单位</th>
                                    <th class="w-[140px]">手机号</th>
                                    <th class="w-[100px] text-center">状态</th>
                                    <th class="w-[160px] text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                <!-- 数据将通过 JavaScript 动态加载 -->
                            </tbody>
                        </table>
                    </div>

                    <!-- 分页 -->
                    <div class="wp-pagination shrink-0" id="users-pagination">
                        <div class="wp-pagination-info">
                            <span class="wp-pagination-text" id="pagination-info">共 0 条记录</span>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-500">每页显示：</label>
                                <select id="page-size-select" class="wp-select" style="width: 80px;" onchange="window.workplace.controllers.users.onPageSizeChange()">
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

            <!-- 新增/编辑用户弹窗 -->
            <div id="user-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container">
                    <div class="wp-modal-header">
                        <div class="wp-modal-title">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                                <i class="fas fa-user-edit text-blue-600"></i>
                            </div>
                            <div>
                                <h3 id="modal-title">新增用户</h3>
                                <p class="text-sm text-gray-500 font-normal">填写系统用户基本信息和权限</p>
                            </div>
                        </div>
                        <button class="wp-modal-close" id="btn-cancel-icon">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="wp-modal-body space-y-4">
                        <input type="hidden" id="user-id">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">警号 <span class="text-red-500">*</span></label>
                                <input type="text" id="input-police-number" placeholder="请输入警号" class="wp-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">姓名 <span class="text-red-500">*</span></label>
                                <input type="text" id="input-name" placeholder="请输入姓名" class="wp-input">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                                <input type="text" id="input-nickname" placeholder="请输入昵称" class="wp-input">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                                <input type="text" id="input-phone" placeholder="请输入手机号" class="wp-input">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">权限级别 <span class="text-red-500">*</span></label>
                            <select id="input-permission-level" class="wp-select w-full">
                                <option value="">请选择权限级别</option>
                                <option value="市局">市局</option>
                                <option value="区县局">区县局</option>
                                <option value="民警">民警</option>
                            </select>
                        </div>
                        <div id="unit-select-container">
                            <label class="block text-sm font-medium text-gray-700 mb-2">所属单位 <span class="text-red-500">*</span></label>
                            <div class="grid grid-cols-3 gap-2">
                                <select id="input-unit-level1" class="wp-select w-full">
                                    <option value="">选择市局</option>
                                </select>
                                <select id="input-unit-level2" class="wp-select w-full" disabled>
                                    <option value="">选择区县局</option>
                                </select>
                                <select id="input-unit-level3" class="wp-select w-full" disabled>
                                    <option value="">选择科室所队</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">密码 <span id="password-required" class="text-red-500">*</span></label>
                            <input type="password" id="input-password" placeholder="请输入密码" class="wp-input">
                            <p class="text-xs text-gray-500 mt-1" id="password-hint">编辑时留空表示不修改密码</p>
                        </div>
                        <div class="flex items-center pt-2">
                            <div class="wp-checkbox">
                                <input type="checkbox" id="input-is-active" class="checkbox-input" checked>
                                <label for="input-is-active" class="wp-checkbox-label">激活账号</label>
                            </div>
                        </div>
                    </div>
                    <div class="wp-modal-footer">
                        <button id="btn-cancel" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                            取消
                        </button>
                        <button id="btn-save" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                            保存
                        </button>
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
                        <p class="text-gray-500 mb-6">确定要删除这个用户吗？此操作不可恢复。</p>
                        <div class="flex justify-center gap-3">
                            <button id="btn-cancel-delete" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                取消
                            </button>
                            <button id="btn-confirm-delete" class="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 重置密码弹窗 -->
            <div id="reset-password-modal" class="wp-modal-overlay hidden">
                <div class="wp-modal-container small">
                    <div class="p-6 text-center">
                        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-key text-amber-600 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-2">重置密码</h3>
                        <p class="text-gray-500 mb-4 text-sm">请输入新密码</p>
                        <input type="password" id="input-new-password" placeholder="请输入新密码" class="wp-input mb-6 text-left">
                        <div class="flex justify-center gap-3">
                            <button id="btn-cancel-reset" class="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                取消
                            </button>
                            <button id="btn-confirm-reset" class="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition">
                                确认重置
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.UsersHtml = UsersHtml;
