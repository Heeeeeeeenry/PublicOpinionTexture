"""
用户认证视图模块

处理用户登录、登出等认证相关功能
使用自定义 PoliceUser 模型和三级权限体系
"""

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .backends import PoliceAuthBackend, PermissionChecker
from .models import PoliceUser


@csrf_exempt
@require_http_methods(["POST"])
def auth_api(request):
    """
    认证统一 API 接口

    所有认证相关操作通过此接口处理，通过 order 参数区分具体操作

    Args:
        request: Django HTTP 请求对象
            - order: 操作命令
            - args: 操作参数

    Returns:
        JsonResponse: 操作结果

    支持的命令:
        - login: 用户登录
        - logout: 用户登出
        - check: 检查登录状态

    示例请求:
        POST /api/auth/
        {
            "order": "login",
            "args": {
                "username": "admin",
                "password": "password123",
                "remember_me": true
            }
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
    if order == 'login':
        return _handle_login(request, args)
    elif order == 'logout':
        return _handle_logout(request, args)
    elif order == 'check':
        return _handle_check(request, args)
    else:
        return JsonResponse({
            'success': False,
            'error': f'未知的操作命令: {order}'
        }, status=400)


def _handle_login(request, args):
    """
    处理用户登录请求

    Args:
        request: Django HTTP 请求对象
        args: 请求参数
            - police_number: 警号
            - password: 密码
            - remember_me: 是否记住登录状态（可选）

    Returns:
        JsonResponse: 登录结果
    """
    police_number = args.get('police_number', '').strip()
    password = args.get('password', '')
    remember_me = args.get('remember_me', False)

    # 参数验证
    if not police_number:
        return JsonResponse({
            'success': False,
            'error': '请输入警号'
        }, status=400)

    if not password:
        return JsonResponse({
            'success': False,
            'error': '请输入密码'
        }, status=400)

    # 使用自定义认证
    user = PoliceAuthBackend.authenticate(police_number, password)

    if user is not None:
        # 登录成功，创建会话
        session_key = PoliceAuthBackend.create_session(user, remember_me)

        # 设置 Cookie
        response = JsonResponse({
            'success': True,
            'message': '登录成功',
            'data': {
                'police_number': user.police_number,
                'name': user.name,
                'nickname': user.nickname,
                'phone': user.phone,
                'permission_level': user.permission_level,
                'permission_name': user.get_permission_level_display(),
                'unit_name': user.unit_name,
                'unit_path': user.get_full_unit_path(),
                'permissions': user.get_permissions()
            }
        })

        # 设置会话 Cookie
        max_age = 30 * 24 * 60 * 60 if remember_me else None
        response.set_cookie(
            'session_key',
            session_key,
            max_age=max_age,
            httponly=True,
            secure=False  # 生产环境设为 True
        )

        return response
    else:
        # 登录失败
        return JsonResponse({
            'success': False,
            'error': '用户名或密码错误'
        }, status=401)


def _handle_logout(request, args):
    """
    处理用户登出请求

    Args:
        request: Django HTTP 请求对象
        args: 请求参数

    Returns:
        JsonResponse: 登出结果
    """
    # 获取会话密钥
    session_key = request.COOKIES.get('session_key')

    if session_key:
        # 销毁会话
        PoliceAuthBackend.destroy_session(session_key)

    # 清除 Cookie
    response = JsonResponse({
        'success': True,
        'message': '登出成功'
    })
    response.delete_cookie('session_key')

    return response


def _handle_check(request, args):
    """
    处理检查登录状态请求

    Args:
        request: Django HTTP 请求对象
        args: 请求参数

    Returns:
        JsonResponse: 认证状态
    """
    # 从 Cookie 获取会话密钥
    session_key = request.COOKIES.get('session_key')

    if session_key:
        user = PoliceAuthBackend.get_user_from_session(session_key)
        if user:
            return JsonResponse({
                'success': True,
                'is_authenticated': True,
                'data': {
                    'police_number': user.police_number,
                    'name': user.name,
                    'nickname': user.nickname,
                    'phone': user.phone,
                    'permission_level': user.permission_level,
                    'permission_name': user.get_permission_level_display(),
                    'unit_name': user.unit_name,
                    'unit_path': user.get_full_unit_path(),
                    'permissions': user.get_permissions()
                }
            })

    return JsonResponse({
        'success': True,
        'is_authenticated': False
    })


def get_current_user(request):
    """
    获取当前登录用户

    Args:
        request: Django HTTP 请求对象

    Returns:
        PoliceUser: 用户对象，未登录返回 None
    """
    session_key = request.COOKIES.get('session_key')
    if session_key:
        return PoliceAuthBackend.get_user_from_session(session_key)
    return None


# 权限检查装饰器
def require_permission(level):
    """
    权限检查装饰器工厂

    Args:
        level: 要求的权限级别 ('OFFICER', 'DISTRICT', 'CITY')

    Returns:
        decorator: 装饰器函数
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            user = get_current_user(request)

            if not user:
                return JsonResponse({
                    'success': False,
                    'error': '未登录'
                }, status=401)

            if not PermissionChecker.check_permission(user, level):
                return JsonResponse({
                    'success': False,
                    'error': '权限不足'
                }, status=403)

            # 将用户对象添加到请求
            request.current_user = user
            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


# 预定义的权限装饰器
require_login = require_permission('OFFICER')
require_district = require_permission('DISTRICT')
require_city = require_permission('CITY')
