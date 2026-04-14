/**
 * 组织管理辅助工具模块
 *
 * 负责与后端API的交互和数据处理
 */

const OrganizationTools = {
    /**
     * 检查当前用户权限
     * @returns {Promise<boolean>} 是否具有权限
     */
    async checkPermission() {
        try {
            const response = await fetch('/api/auth/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'check', args: {} })
            });
            const data = await response.json();
            if (data.is_authenticated && data.data) {
                return data.data.permission_level === 'CITY';
            }
            return false;
        } catch (error) {
            console.error('[OrganizationTools] 检查权限失败:', error);
            return false;
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_units', args: {} })
            });
            const result = await response.json();
            if (result.success) {
                return result.data || [];
            }
            console.error('[OrganizationTools] 加载单位列表失败:', result.error);
            return [];
        } catch (error) {
            console.error('[OrganizationTools] 加载单位列表出错:', error);
            return [];
        }
    },

    /**
     * 保存单位
     * @param {string} order 'create_unit' 或 'update_unit'
     * @param {Object} args {level1, level2, level3}
     */
    async saveUnit(order, args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, args })
            });
            return await response.json();
        } catch (error) {
            console.error('[OrganizationTools] 保存单位出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 删除单位
     * @param {string} fullName 单位全称
     */
    async deleteUnit(fullName) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'delete_unit',
                    args: { full_name: fullName }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[OrganizationTools] 删除单位出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 加载下发权限列表
     */
    async loadDispatchPermissions() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_dispatch_permissions', args: {} })
            });
            const result = await response.json();
            if (result.success) {
                return result.data || [];
            }
            console.error('[OrganizationTools] 加载下发权限失败:', result.error);
            return [];
        } catch (error) {
            console.error('[OrganizationTools] 加载下发权限出错:', error);
            return [];
        }
    },

    /**
     * 保存下发权限
     * @param {string} order 'create_dispatch_permission' 或 'update_dispatch_permission'
     * @param {Object} args {id, unit_full_name, dispatch_scope}
     */
    async saveDispatchPermission(order, args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, args })
            });
            return await response.json();
        } catch (error) {
            console.error('[OrganizationTools] 保存下发权限出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 删除下发权限
     * @param {number|string} id 
     */
    async deleteDispatchPermission(id) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'delete_dispatch_permission',
                    args: { id: id }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[OrganizationTools] 删除下发权限出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    }
};

window.OrganizationTools = OrganizationTools;
