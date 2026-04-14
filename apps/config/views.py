"""
配置应用视图模块

处理配置相关的 API 请求，包括菜单配置、系统配置等
"""

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.auth.views import get_current_user
from apps.config.menu_config import get_menu_for_user


@csrf_exempt
@require_http_methods(["POST"])
def config_api(request):
    """
    配置统一 API 接口

    所有配置相关操作通过此接口处理，通过 order 参数区分具体操作

    Args:
        request: Django HTTP 请求对象
            - order: 操作命令
            - args: 操作参数

    Returns:
        JsonResponse: 操作结果

    支持的命令:
        - get_menu: 获取用户菜单配置
        - get_system_config: 获取系统配置

    示例请求:
        POST /api/config/
        {
            "order": "get_menu",
            "args": {}
        }
    """
    try:
        data = json.loads(request.body)
        order = data.get('order', '')
        args = data.get('args', {})
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '无效的 JSON 数据'
        }, status=400)

    # 命令分发
    if order == 'get_menu':
        return _handle_get_menu(request, args)
    elif order == 'get_system_config':
        return _handle_get_system_config(request, args)
    else:
        return JsonResponse({
            'success': False,
            'error': f'未知的操作命令: {order}'
        }, status=400)


def _handle_get_menu(request, args):
    """
    处理获取菜单配置请求

    Args:
        request: Django HTTP 请求对象
        args: 请求参数

    Returns:
        JsonResponse: 菜单配置
    """
    # 获取当前用户
    user = get_current_user(request)

    if not user:
        return JsonResponse({
            'success': False,
            'error': '未登录'
        }, status=401)

    # 获取菜单
    menu = get_menu_for_user(user)

    # 构建用户信息
    user_info = {
        'police_number': user.police_number,
        'name': user.name,
        'nickname': user.nickname,
        'phone': user.phone,
        'permission_level': user.permission_level,
        'permission_name': user.get_permission_level_display(),
        'unit_name': user.unit_name,
        'unit_path': user.get_full_unit_path()
    }

    return JsonResponse({
        'success': True,
        'data': {
            'menu': menu,
            'user': user_info
        }
    })


def _handle_get_system_config(request, args):
    """
    处理获取系统配置请求

    Args:
        request: Django HTTP 请求对象
        args: 请求参数

    Returns:
        JsonResponse: 系统配置
    """
    # 系统配置信息
    config = {
        'system_name': '民意智感中心',
        'system_subtitle': '局长信箱管理系统',
        'version': '1.0.0',
        'copyright': '© 2026 民意智感中心 版权所有'
    }

    return JsonResponse({
        'success': True,
        'data': config
    })
