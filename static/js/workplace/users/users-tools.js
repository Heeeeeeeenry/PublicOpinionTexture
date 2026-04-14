/**
 * 用户管理辅助工具模块
 *
 * 负责与后端API的交互和数据处理
 */

const UsersTools = {
    /**
     * 加载当前用户信息
     * @returns {Promise<Object|null>} 当前用户信息
     */
    async loadCurrentUser() {
        try {
            const response = await fetch('/api/auth/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'check',
                    args: {}
                })
            });
            const data = await response.json();
            if (data.is_authenticated && data.data) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('[UsersTools] 加载当前用户信息失败:', error);
            return null;
        }
    },

    /**
     * 加载单位列表
     * @returns {Promise<Array>} 单位列表
     */
    async loadUnits() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_units',
                    args: {}
                })
            });
            const result = await response.json();
            if (result.success) {
                return result.data || [];
            } else {
                console.error('[UsersTools] 加载单位列表失败:', result.error);
                return [];
            }
        } catch (error) {
            console.error('[UsersTools] 加载单位列表出错:', error);
            return [];
        }
    },

    /**
     * 加载用户列表
     * @param {Object} args 请求参数
     * @returns {Promise<Object>} 用户数据和总数
     */
    async loadUsers(args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'get_user_list',
                    args: args
                })
            });
            const data = await response.json();
            if (data.success) {
                return {
                    users: data.data || [],
                    total: data.total || 0
                };
            } else {
                console.error('[UsersTools] 加载用户列表失败:', data.error);
                return { users: [], total: 0 };
            }
        } catch (error) {
            console.error('[UsersTools] 加载用户列表出错:', error);
            return { users: [], total: 0 };
        }
    },

    /**
     * 保存用户（新增或更新）
     * @param {string} order 'create_user' 或 'update_user'
     * @param {Object} args 用户数据
     * @returns {Promise<Object>} 操作结果
     */
    async saveUser(order, args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order, args })
            });
            return await response.json();
        } catch (error) {
            console.error('[UsersTools] 保存用户出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 删除用户
     * @param {number|string} id 用户ID
     * @returns {Promise<Object>} 操作结果
     */
    async deleteUser(id) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'delete_user',
                    args: { id: id }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[UsersTools] 删除用户出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 重置密码
     * @param {number|string} id 用户ID
     * @param {string} password 新密码
     * @returns {Promise<Object>} 操作结果
     */
    async resetPassword(id, password) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order: 'reset_password',
                    args: { id: id, password: password }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[UsersTools] 重置密码出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    }
};

window.UsersTools = UsersTools;
