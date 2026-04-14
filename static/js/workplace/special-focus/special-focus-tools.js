/**
 * 专项关注辅助工具模块
 *
 * 负责与后端API的交互和数据处理
 */

const SpecialFocusTools = {
    /**
     * 加载专项关注列表
     * @returns {Promise<Array>}
     */
    async loadSpecialFocusList() {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: 'get_special_focus_list', args: {} })
            });
            const data = await response.json();
            if (data.success) {
                return data.data || [];
            }
            console.error('[SpecialFocusTools] 加载专项关注列表失败:', data.error);
            return [];
        } catch (error) {
            console.error('[SpecialFocusTools] 加载专项关注列表出错:', error);
            return [];
        }
    },

    /**
     * 保存专项关注
     * @param {string} order 'create_special_focus' 或 'update_special_focus'
     * @param {Object} args {id, title, description}
     * @returns {Promise<Object>}
     */
    async saveSpecialFocus(order, args) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order, args })
            });
            return await response.json();
        } catch (error) {
            console.error('[SpecialFocusTools] 保存专项关注出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    },

    /**
     * 删除专项关注
     * @param {number|string} id
     * @returns {Promise<Object>}
     */
    async deleteSpecialFocus(id) {
        try {
            const response = await fetch('/api/setting/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: 'delete_special_focus',
                    args: { id: id }
                })
            });
            return await response.json();
        } catch (error) {
            console.error('[SpecialFocusTools] 删除专项关注出错:', error);
            return { success: false, error: '网络请求失败' };
        }
    }
};

window.SpecialFocusTools = SpecialFocusTools;
