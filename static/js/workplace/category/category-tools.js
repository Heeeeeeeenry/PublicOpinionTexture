/**
 * 分类管理辅助工具模块
 *
 * 负责与后端API的交互和数据处理
 */

const CategoryTools = {
    /**
     * 加载分类列表
     * @returns {Promise<Array>}
     */
    async loadCategories() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'category_list', args: {} })
            });
            const data = await response.json();
            if (data.success) {
                return data.data || [];
            }
            console.error('[CategoryTools] 加载分类列表失败:', data.error);
            return [];
        } catch (error) {
            console.error('[CategoryTools] 加载分类列表出错:', error);
            return [];
        }
    },

    /**
     * 保存分类
     * @param {string} order 'category_create' 或 'category_update'
     * @param {Object} args {id, level1, level2, level3}
     * @returns {Promise<Object>}
     */
    async saveCategory(order, args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, args })
            });
            return await response.json();
        } catch (error) {
            console.error('[CategoryTools] 保存分类出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 删除分类
     * @param {number|string} id
     * @returns {Promise<Object>}
     */
    async deleteCategory(id) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'category_delete',
                    args: { id: id }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[CategoryTools] 删除分类出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    }
};

window.CategoryTools = CategoryTools;
