"""
菜单配置模块

根据用户权限级别返回不同的菜单结构
"""

# 菜单项配置
MENU_ITEMS = {
    # 工作台
    'home': {
        'id': 'home',
        'name': '首页',
        'icon': 'fa-home',
        'path': '/workplace/#/home',
        'permission': ['CITY', 'DISTRICT', 'OFFICER']
    },
    'letters': {
        'id': 'letters',
        'name': '所有信件',
        'icon': 'fa-envelope',
        'path': '/workplace/#/letters',
        'permission': ['CITY', 'DISTRICT', 'OFFICER']
    },
    'dispatch': {
        'id': 'dispatch',
        'name': '下发工作台',
        'icon': 'fa-paper-plane',
        'path': '/workplace/#/dispatch',
        'permission': ['CITY', 'DISTRICT']
    },
    'processing': {
        'id': 'processing',
        'name': '处理工作台',
        'icon': 'fa-tasks',
        'path': '/workplace/#/processing',
        'permission': ['CITY', 'DISTRICT', 'OFFICER']
    },
    'audit': {
        'id': 'audit',
        'name': '核查工作台',
        'icon': 'fa-search',
        'path': '/workplace/#/audit',
        'permission': ['CITY', 'DISTRICT']
    },
    'statistics': {
        'id': 'statistics',
        'name': '统计工作台',
        'icon': 'fa-chart-bar',
        'path': '/workplace/#/statistics',
        'permission': ['CITY', 'DISTRICT', 'OFFICER']
    },

    # 管理员功能 - 市局、区县局
    'users': {
        'id': 'users',
        'name': '用户管理',
        'icon': 'fa-users',
        'path': '/workplace/#/users',
        'permission': ['CITY', 'DISTRICT']
    },
    'organization': {
        'id': 'organization',
        'name': '组织管理',
        'icon': 'fa-sitemap',
        'path': '/workplace/#/organization',
        'permission': ['CITY']
    },
    'special-focus': {
        'id': 'special-focus',
        'name': '专项关注',
        'icon': 'fa-star',
        'path': '/workplace/#/special-focus',
        'permission': ['CITY']
    },
    'category': {
        'id': 'category',
        'name': '分类管理',
        'icon': 'fa-tags',
        'path': '/workplace/#/category',
        'permission': ['CITY']
    },

    # 系统相关
    'settings': {
        'id': 'settings',
        'name': '系统设置',
        'icon': 'fa-cog',
        'path': '/workplace/#/settings',
        'permission': ['CITY', 'DISTRICT', 'OFFICER']
    },
    'logout': {
        'id': 'logout',
        'name': '退出登录',
        'icon': 'fa-sign-out-alt',
        'path': '/api/auth/logout/',
        'permission': ['CITY', 'DISTRICT', 'OFFICER'],
        'is_action': True
    }
}


def get_menu_by_permission(permission_level):
    """
    根据权限级别获取菜单配置

    Args:
        permission_level: 权限级别 ('CITY', 'DISTRICT', 'OFFICER')

    Returns:
        list: 菜单结构列表
    """
    # 工作台菜单组
    workbench_items = [
        MENU_ITEMS['home'],
        MENU_ITEMS['letters'],
    ]

    # 根据权限添加工作台菜单
    if permission_level in ['CITY', 'DISTRICT']:
        workbench_items.append(MENU_ITEMS['dispatch'])

    workbench_items.append(MENU_ITEMS['processing'])

    if permission_level in ['CITY', 'DISTRICT']:
        workbench_items.append(MENU_ITEMS['audit'])

    workbench_items.append(MENU_ITEMS['statistics'])

    # 构建菜单结构
    menu = [
        {
            'group': '工作台',
            'items': workbench_items
        }
    ]

    # 管理员功能菜单组
    admin_items = []

    if permission_level in ['CITY', 'DISTRICT']:
        admin_items.append(MENU_ITEMS['users'])

    if permission_level == 'CITY':
        admin_items.append(MENU_ITEMS['organization'])
        admin_items.append(MENU_ITEMS['special-focus'])
        admin_items.append(MENU_ITEMS['category'])

    if admin_items:
        menu.append({
            'group': '管理员功能',
            'items': admin_items
        })

    # 系统相关菜单组
    menu.append({
        'group': '系统相关',
        'items': [
            MENU_ITEMS['settings'],
            MENU_ITEMS['logout']
        ]
    })

    return menu


def get_menu_for_user(user):
    """
    为指定用户获取菜单

    Args:
        user: PoliceUser 对象

    Returns:
        list: 菜单结构列表
    """
    if not user:
        return []

    return get_menu_by_permission(user.permission_level)
