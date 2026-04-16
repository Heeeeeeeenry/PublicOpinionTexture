"""
设置应用视图模块

处理系统设置相关的 API 请求，包括分类管理、用户管理、组织管理、专项关注等
"""

import json
import hashlib
import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.auth.views import get_current_user
from apps.auth.backends import PoliceAuthBackend
from apps.database.db_manager import db


@csrf_exempt
@require_http_methods(["POST"])
def setting_api(request):
    """
    设置统一 API 接口

    所有设置相关操作通过此接口处理，通过 order 参数区分具体操作

    Args:
        request: Django HTTP 请求对象
            - order: 操作命令
            - args: 操作参数

    Returns:
        JsonResponse: 操作结果

    支持的命令:
        - category_list: 获取分类列表
        - category_create: 创建分类
        - category_update: 更新分类
        - category_delete: 删除分类
        - get_units: 获取单位列表
        - get_user_list: 获取用户列表
        - create_user: 创建用户
        - update_user: 更新用户
        - delete_user: 删除用户
        - reset_password: 重置密码

    示例请求:
        POST /api/setting/
        {
            "order": "category_list",
            "args": {}
        }
    """
    user = get_current_user(request)
    if not user:
        return JsonResponse({
            'success': False,
            'error': '未登录'
        }, status=401)

    try:
        data = json.loads(request.body)
        order = data.get('order', '')
        args = data.get('args', {})
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '无效的 JSON 数据'
        }, status=400)

    city_only_commands = ['category_list', 'category_create', 'category_update', 'category_delete',
                          'get_dispatch_permissions', 'create_dispatch_permission', 'update_dispatch_permission', 'delete_dispatch_permission',
                          'create_unit', 'update_unit', 'delete_unit',
                          'get_special_focus_list', 'create_special_focus', 'update_special_focus', 'delete_special_focus']
    district_allowed_commands = ['get_units', 'get_user_list', 'create_user', 'update_user', 'delete_user', 'reset_password']

    if order in city_only_commands and user.permission_level != 'CITY':
        return JsonResponse({
            'success': False,
            'error': '权限不足'
        }, status=403)

    if order in district_allowed_commands and user.permission_level not in ['CITY', 'DISTRICT']:
        return JsonResponse({
            'success': False,
            'error': '权限不足'
        }, status=403)

    command_handlers = {
        'category_list': _handle_category_list,
        'category_create': _handle_category_create,
        'category_update': _handle_category_update,
        'category_delete': _handle_category_delete,
        'get_units': _handle_get_units,
        'get_dispatch_units': _handle_get_dispatch_units,
        'get_user_list': _handle_get_user_list,
        'create_user': _handle_create_user,
        'update_user': _handle_update_user,
        'delete_user': _handle_delete_user,
        'reset_password': _handle_reset_password,
        'create_unit': _handle_create_unit,
        'update_unit': _handle_update_unit,
        'delete_unit': _handle_delete_unit,
        'get_dispatch_permissions': _handle_get_dispatch_permissions,
        'create_dispatch_permission': _handle_create_dispatch_permission,
        'update_dispatch_permission': _handle_update_dispatch_permission,
        'delete_dispatch_permission': _handle_delete_dispatch_permission,
        'check_dispatch_permission': _handle_check_dispatch_permission,
        'get_special_focus_list': _handle_get_special_focus_list,
        'create_special_focus': _handle_create_special_focus,
        'update_special_focus': _handle_update_special_focus,
        'delete_special_focus': _handle_delete_special_focus,
    }

    handler = command_handlers.get(order)
    if not handler:
        return JsonResponse({
            'success': False,
            'error': f'未知的操作命令: {order}'
        }, status=400)

    try:
        return handler(args, user)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def _handle_category_list(args, user):
    """
    处理获取分类列表请求

    Args:
        args: 请求参数
            - limit: 每页数量（可选，默认全部）
            - page: 页码（可选，默认1）
        user: 当前用户对象

    Returns:
        JsonResponse: 分类列表
    """
    total_result = db.exec("SELECT COUNT(*) as total FROM 信件分类表", fetch=True)
    total = total_result[0]['total']

    limit = args.get('limit', total)
    page = args.get('page', 1)
    offset = (page - 1) * limit

    categories = db.exec(
        "SELECT 序号, 一级分类, 二级分类, 三级分类 FROM 信件分类表 ORDER BY 序号 LIMIT %s OFFSET %s",
        (limit, offset),
        fetch=True
    )

    return JsonResponse({
        'success': True,
        'data': categories,
        'total': total
    })


def _handle_check_dispatch_permission(args, user):
    """
    检查下发权限

    根据用户所属单位和目标单位，检查用户是否有权限将信件下发到目标单位。
    判定逻辑：
    1. 市局/民意智感中心：可向任何单位下发
    2. 区县局/支队/民意智感中心（三级）：只能向本单位及下属下发
    3. 其他单位：查询下发权限表获取额外配置

    Args:
        args: 请求参数
            - from_unit: 下发单位全称（当前用户单位）
            - to_unit: 接收单位全称（目标单位）
        user: 当前用户对象

    Returns:
        JsonResponse: 检查结果
    """
    from_unit = args.get('from_unit', '').strip()
    to_unit = args.get('to_unit', '').strip()
    print(f"检查下发权限: {from_unit} -> {to_unit}")

    if not from_unit or not to_unit:
        return JsonResponse({
            'success': False,
            'error': '下发单位和接收单位不能为空'
        }, status=400)

    from_parts = [p.strip() for p in from_unit.split('/')]
    to_parts = [p.strip() for p in to_unit.split('/')]

    from_level1 = from_parts[0] if len(from_parts) > 0 else ''
    from_level2 = from_parts[1] if len(from_parts) > 1 else ''
    from_level3 = from_parts[2] if len(from_parts) > 2 else ''

    to_level1 = to_parts[0] if len(to_parts) > 0 else ''
    to_level2 = to_parts[1] if len(to_parts) > 1 else ''
    to_level3 = to_parts[2] if len(to_parts) > 2 else ''

    if from_level1 == '市局' and '民意智感中心' in from_level2:
        return JsonResponse({
            'success': True,
            'has_permission': True,
            'permission_type': 'all',
            'from_unit': from_unit,
            'to_unit': to_unit,
            'message': '市局民意智感中心可向任何单位下发'
        })

    if '民意智感中心' in from_level3:
        if from_level1 == to_level1 and from_level2 == to_level2:
            return JsonResponse({
                'success': True,
                'has_permission': True,
                'permission_type': 'district',
                'from_unit': from_unit,
                'to_unit': to_unit,
                'message': f'{from_level2}民意智感中心可向本单位及下属下发'
            })
        else:
            return JsonResponse({
                'success': True,
                'has_permission': False,
                'permission_type': 'none',
                'from_unit': from_unit,
                'to_unit': to_unit,
                'message': f'{from_level2}民意智感中心只能向本单位及下属下发'
            })

    permission_records = db.exec(
        "SELECT 下发范围 FROM 下发权限表 WHERE 单位全称 = %s",
        (from_unit,),
        fetch=True
    )

    if permission_records:
        dispatch_scope = permission_records[0]['下发范围']
        scope_list = json.loads(dispatch_scope) if dispatch_scope else []

        if 'ALLDEPARTMENT' in scope_list:
            return JsonResponse({
                'success': True,
                'has_permission': True,
                'permission_type': 'all',
                'from_unit': from_unit,
                'to_unit': to_unit,
                'message': '具有额外下发权限：可向任何单位下发'
            })
        else:
            if to_unit in scope_list:
                return JsonResponse({
                    'success': True,
                    'has_permission': True,
                    'permission_type': 'specific',
                    'from_unit': from_unit,
                    'to_unit': to_unit,
                    'message': '具有额外下发权限：可向指定单位下发'
                })
            else:
                return JsonResponse({
                    'success': True,
                    'has_permission': False,
                    'permission_type': 'none',
                    'from_unit': from_unit,
                    'to_unit': to_unit,
                    'message': '不在额外下发权限范围内'
                })
    else:
        return JsonResponse({
            'success': True,
            'has_permission': False,
            'permission_type': 'none',
            'from_unit': from_unit,
            'to_unit': to_unit,
            'message': '非民意智感中心单位，无默认下发权限，也未配置额外权限'
        })


def _handle_category_create(args, user):
    """
    处理创建分类请求

    Args:
        args: 请求参数
            - 一级分类: 一级分类名称
            - 二级分类: 二级分类名称
            - 三级分类: 三级分类名称
        user: 当前用户对象

    Returns:
        JsonResponse: 创建结果
    """
    level1 = args.get('一级分类', '').strip()
    level2 = args.get('二级分类', '').strip()
    level3 = args.get('三级分类', '').strip()

    if not level1 or not level2 or not level3:
        return JsonResponse({
            'success': False,
            'error': '一级分类、二级分类、三级分类不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 信件分类表 WHERE 一级分类 = %s AND 二级分类 = %s AND 三级分类 = %s",
        (level1, level2, level3),
        fetch=True
    )
    if existing:
        return JsonResponse({
            'success': False,
            'error': '该分类已存在'
        }, status=400)

    db.exec(
        "INSERT INTO 信件分类表 (一级分类, 二级分类, 三级分类) VALUES (%s, %s, %s)",
        (level1, level2, level3),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '分类创建成功'
    })


def _handle_create_unit(args, user):
    """
    处理创建单位请求

    Args:
        args: 请求参数
            - full_name: 单位全称（格式：一级 / 二级 / 三级）
            - level1: 一级单位
            - level2: 二级单位
            - level3: 三级单位
        user: 当前用户对象

    Returns:
        JsonResponse: 创建结果
    """
    full_name = args.get('full_name', '').strip()
    level1 = args.get('level1', '').strip()
    level2 = args.get('level2', '').strip()
    level3 = args.get('level3', '').strip()

    if not full_name or not level1:
        return JsonResponse({
            'success': False,
            'error': '单位全称和一级单位不能为空'
        }, status=400)

    # 将空字符串转换为None（NULL）
    level2_for_db = level2 if level2 else None
    level3_for_db = level3 if level3 else None
    
    if level3_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (level1, level2_for_db, level3_for_db),
            fetch=True
        )
    elif level2_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (level1, level2_for_db),
            fetch=True
        )
    else:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (level1,),
            fetch=True
        )

    if existing:
        return JsonResponse({
            'success': False,
            'error': '该单位已存在'
        }, status=400)

    # 生成系统编码：使用单位全称的MD5哈希前8位 + 时间戳后6位
    # 确保编码唯一且长度适中
    import hashlib
    import time
    
    # 构建编码基础字符串
    code_base = f"{level1}_{level2 or ''}_{level3 or ''}_{int(time.time())}"
    # 生成MD5哈希
    md5_hash = hashlib.md5(code_base.encode('utf-8')).hexdigest()
    # 取前8位作为系统编码
    system_code = md5_hash[:8].upper()
    
    # 检查系统编码是否已存在（虽然概率极低）
    code_check = db.exec(
        "SELECT id FROM 单位 WHERE 系统编码 = %s",
        (system_code,),
        fetch=True
    )
    
    # 如果编码已存在，添加后缀
    if code_check:
        system_code = f"{system_code}_{int(time.time()) % 10000:04d}"

    db.exec(
        "INSERT INTO 单位 (一级, 二级, 三级, 系统编码) VALUES (%s, %s, %s, %s)",
        (level1, level2_for_db, level3_for_db, system_code),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '单位创建成功'
    })


def _handle_update_unit(args, user):
    """
    处理更新单位请求

    Args:
        args: 请求参数
            - full_name: 单位全称（格式：一级 / 二级 / 三级，用于定位要更新的单位）
            - level1: 一级单位（新值）
            - level2: 二级单位（新值）
            - level3: 三级单位（新值）
        user: 当前用户对象

    Returns:
        JsonResponse: 更新结果
    """
    full_name = args.get('full_name', '').strip()
    level1 = args.get('level1', '').strip()
    level2 = args.get('level2', '').strip()
    level3 = args.get('level3', '').strip()

    if not full_name or not level1:
        return JsonResponse({
            'success': False,
            'error': '单位全称和一级单位不能为空'
        }, status=400)

    parts = [p.strip() for p in full_name.split('/')]
    old_level1 = parts[0] if len(parts) > 0 else ''
    old_level2 = parts[1] if len(parts) > 1 else ''
    old_level3 = parts[2] if len(parts) > 2 else ''
    
    # 将空字符串转换为None（NULL）
    old_level2_for_db = old_level2 if old_level2 else None
    old_level3_for_db = old_level3 if old_level3 else None
    level2_for_db = level2 if level2 else None
    level3_for_db = level3 if level3 else None

    if old_level3_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (old_level1, old_level2_for_db, old_level3_for_db),
            fetch=True
        )
    elif old_level2_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (old_level1, old_level2_for_db),
            fetch=True
        )
    else:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (old_level1,),
            fetch=True
        )

    if not existing:
        return JsonResponse({
            'success': False,
            'error': '单位不存在'
        }, status=404)

    if old_level3_for_db:
        db.exec(
            "UPDATE 单位 SET 一级 = %s, 二级 = %s, 三级 = %s WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (level1, level2_for_db, level3_for_db, old_level1, old_level2_for_db, old_level3_for_db),
            fetch=False
        )
    elif old_level2_for_db:
        db.exec(
            "UPDATE 单位 SET 一级 = %s, 二级 = %s, 三级 = %s WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (level1, level2_for_db, level3_for_db, old_level1, old_level2_for_db),
            fetch=False
        )
    else:
        db.exec(
            "UPDATE 单位 SET 一级 = %s, 二级 = %s, 三级 = %s WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (level1, level2_for_db, level3_for_db, old_level1),
            fetch=False
        )

    return JsonResponse({
        'success': True,
        'message': '单位更新成功'
    })


def _handle_delete_unit(args, user):
    """
    处理删除单位请求

    Args:
        args: 请求参数
            - full_name: 单位全称（格式：一级 / 二级 / 三级）
        user: 当前用户对象

    Returns:
        JsonResponse: 删除结果
    """
    full_name = args.get('full_name', '').strip()

    if not full_name:
        return JsonResponse({
            'success': False,
            'error': '单位全称不能为空'
        }, status=400)

    parts = [p.strip() for p in full_name.split('/')]
    level1 = parts[0] if len(parts) > 0 else ''
    level2 = parts[1] if len(parts) > 1 else ''
    level3 = parts[2] if len(parts) > 2 else ''
    
    # 将空字符串转换为None（NULL）
    level2_for_db = level2 if level2 else None
    level3_for_db = level3 if level3 else None

    if level3_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (level1, level2_for_db, level3_for_db),
            fetch=True
        )
    elif level2_for_db:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (level1, level2_for_db),
            fetch=True
        )
    else:
        existing = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (level1,),
            fetch=True
        )

    if not existing:
        return JsonResponse({
            'success': False,
            'error': '单位不存在'
        }, status=404)

    if level3_for_db:
        db.exec(
            "DELETE FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (level1, level2_for_db, level3_for_db),
            fetch=False
        )
    elif level2_for_db:
        db.exec(
            "DELETE FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (level1, level2_for_db),
            fetch=False
        )
    else:
        db.exec(
            "DELETE FROM 单位 WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (level1,),
            fetch=False
        )

    return JsonResponse({
        'success': True,
        'message': '单位删除成功'
    })


def _handle_get_dispatch_permissions(args, user):
    """
    处理获取下发权限列表请求

    Args:
        args: 请求参数
            - limit: 每页数量（可选，默认全部）
            - page: 页码（可选，默认1）
        user: 当前用户对象

    Returns:
        JsonResponse: 下发权限列表
    """
    total_result = db.exec("SELECT COUNT(*) as total FROM 下发权限表", fetch=True)
    total = total_result[0]['total']

    limit = args.get('limit', total)
    page = args.get('page', 1)
    offset = (page - 1) * limit

    permissions = db.exec(
        "SELECT 序号, 单位全称, 下发范围, 创建时间, 最后更新时间 FROM 下发权限表 ORDER BY 序号 LIMIT %s OFFSET %s",
        (limit, offset),
        fetch=True
    )

    return JsonResponse({
        'success': True,
        'data': permissions,
        'total': total
    })


def _handle_create_dispatch_permission(args, user):
    """
    处理创建下发权限请求

    Args:
        args: 请求参数
            - unit_name: 单位全称
            - dispatch_scope: 下发范围（JSON字符串）
        user: 当前用户对象

    Returns:
        JsonResponse: 创建结果
    """
    unit_name = args.get('unit_name', '').strip()
    dispatch_scope = args.get('dispatch_scope', '')

    if not unit_name:
        return JsonResponse({
            'success': False,
            'error': '单位全称不能为空'
        }, status=400)

    parts = [p.strip() for p in unit_name.split('/')]
    level_1 = parts[0] if len(parts) > 0 else ''
    level_2 = parts[1] if len(parts) > 1 else ''
    level_3 = parts[2] if len(parts) > 2 else ''

    if level_3:
        unit_exists = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 = %s",
            (level_1, level_2, level_3),
            fetch=True
        )
    elif level_2:
        unit_exists = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NULL",
            (level_1, level_2),
            fetch=True
        )
    else:
        unit_exists = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 IS NULL AND 三级 IS NULL",
            (level_1,),
            fetch=True
        )

    if not unit_exists:
        return JsonResponse({
            'success': False,
            'error': '单位不存在'
        }, status=404)

    existing = db.exec(
        "SELECT 序号 FROM 下发权限表 WHERE 单位全称 = %s",
        (unit_name,),
        fetch=True
    )
    if existing:
        return JsonResponse({
            'success': False,
            'error': '该单位的下发权限已存在'
        }, status=400)

    db.exec(
        "INSERT INTO 下发权限表 (单位全称, 下发范围) VALUES (%s, %s)",
        (unit_name, dispatch_scope),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '下发权限创建成功'
    })


def _handle_update_dispatch_permission(args, user):
    """
    处理更新下发权限请求

    Args:
        args: 请求参数
            - id: 权限序号
            - unit_name: 单位全称
            - dispatch_scope: 下发范围（JSON字符串）
        user: 当前用户对象

    Returns:
        JsonResponse: 更新结果
    """
    perm_id = args.get('id')
    unit_name = args.get('unit_name', '').strip()
    dispatch_scope = args.get('dispatch_scope', '')

    if not perm_id:
        return JsonResponse({
            'success': False,
            'error': '权限ID不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 下发权限表 WHERE 序号 = %s",
        (perm_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '下发权限不存在'
        }, status=404)

    db.exec(
        "UPDATE 下发权限表 SET 单位全称 = %s, 下发范围 = %s WHERE 序号 = %s",
        (unit_name, dispatch_scope, perm_id),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '下发权限更新成功'
    })


def _handle_delete_dispatch_permission(args, user):
    """
    处理删除下发权限请求

    Args:
        args: 请求参数
            - id: 权限序号
        user: 当前用户对象

    Returns:
        JsonResponse: 删除结果
    """
    perm_id = args.get('id')

    if not perm_id:
        return JsonResponse({
            'success': False,
            'error': '权限ID不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 下发权限表 WHERE 序号 = %s",
        (perm_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '下发权限不存在'
        }, status=404)

    db.exec(
        "DELETE FROM 下发权限表 WHERE 序号 = %s",
        (perm_id,),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '下发权限删除成功'
    })


def _handle_category_update(args, user):
    """
    处理更新分类请求

    Args:
        args: 请求参数
            - id: 分类序号
            - 一级分类: 一级分类名称
            - 二级分类: 二级分类名称
            - 三级分类: 三级分类名称
        user: 当前用户对象

    Returns:
        JsonResponse: 更新结果
    """
    category_id = args.get('id')
    level1 = args.get('一级分类', '').strip()
    level2 = args.get('二级分类', '').strip()
    level3 = args.get('三级分类', '').strip()

    if not category_id:
        return JsonResponse({
            'success': False,
            'error': '分类ID不能为空'
        }, status=400)

    if not level1 or not level2 or not level3:
        return JsonResponse({
            'success': False,
            'error': '一级分类、二级分类、三级分类不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 信件分类表 WHERE 序号 = %s",
        (category_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '分类不存在'
        }, status=404)

    duplicate = db.exec(
        "SELECT 序号 FROM 信件分类表 WHERE 一级分类 = %s AND 二级分类 = %s AND 三级分类 = %s AND 序号 != %s",
        (level1, level2, level3, category_id),
        fetch=True
    )
    if duplicate:
        return JsonResponse({
            'success': False,
            'error': '该分类已存在'
        }, status=400)

    db.exec(
        "UPDATE 信件分类表 SET 一级分类 = %s, 二级分类 = %s, 三级分类 = %s WHERE 序号 = %s",
        (level1, level2, level3, category_id),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '分类更新成功'
    })


def _handle_category_delete(args, user):
    """
    处理删除分类请求

    Args:
        args: 请求参数
            - id: 分类序号
        user: 当前用户对象

    Returns:
        JsonResponse: 删除结果
    """
    category_id = args.get('id')

    if not category_id:
        return JsonResponse({
            'success': False,
            'error': '分类ID不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 信件分类表 WHERE 序号 = %s",
        (category_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '分类不存在'
        }, status=404)

    db.exec(
        "DELETE FROM 信件分类表 WHERE 序号 = %s",
        (category_id,),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '分类删除成功'
    })


def _handle_get_units(args, user):
    """
    处理获取单位列表请求

    Args:
        args: 请求参数
            - limit: 每页数量（可选，默认全部）
            - page: 页码（可选，默认1）
        user: 当前用户对象

    Returns:
        JsonResponse: 单位列表，包含 full_name 字段（单位全称）
    """
    total_result = db.exec("SELECT COUNT(*) as total FROM 单位", fetch=True)
    total = total_result[0]['total']

    limit = args.get('limit', total)
    page = args.get('page', 1)
    offset = (page - 1) * limit

    units = db.exec(
        "SELECT 一级, 二级, 三级 FROM 单位 ORDER BY 一级, 二级, 三级 LIMIT %s OFFSET %s",
        (limit, offset),
        fetch=True
    )

    for unit in units:
        level1 = unit.get('一级', '') or ''
        level2 = unit.get('二级', '') or ''
        level3 = unit.get('三级', '') or ''

        parts = [level1]
        if level2:
            parts.append(level2)
        if level3:
            parts.append(level3)
        unit['full_name'] = ' / '.join(parts)

    return JsonResponse({
        'success': True,
        'data': units,
        'total': total
    })


def _handle_get_dispatch_units(args, user):
    """
    处理获取可下发单位列表请求
    根据当前用户权限返回可下发的单位列表

    Args:
        args: 请求参数
        user: 当前用户对象

    Returns:
        JsonResponse: 可下发单位列表
    """
    if user.permission_level == 'CITY':
        units = db.exec(
            "SELECT 一级, 二级, 三级 FROM 单位 WHERE 二级 IS NOT NULL AND 三级 IS NULL ORDER BY 一级, 二级",
            fetch=True
        )
    elif user.permission_level == 'DISTRICT':
        user_unit_name = user.unit_name
        parts = [p.strip() for p in user_unit_name.split('/')]
        level_1 = parts[0] if len(parts) > 0 else ''
        level_2 = parts[1] if len(parts) > 1 else ''

        if level_1 and level_2:
            units = db.exec(
                "SELECT 一级, 二级, 三级 FROM 单位 WHERE 一级 = %s AND 二级 = %s AND 三级 IS NOT NULL ORDER BY 一级, 二级, 三级",
                (level_1, level_2),
                fetch=True
            )
        else:
            units = []
    else:
        units = []

    return JsonResponse({
        'success': True,
        'data': units
    })


def _handle_get_user_list(args, user):
    """
    处理获取用户列表请求

    Args:
        args: 请求参数
            - unit_name: 单位全称（可选，区县局用户需要传入）
            - limit: 每页数量（可选，默认全部）
            - page: 页码（可选，默认1）
        user: 当前用户对象

    Returns:
        JsonResponse: 用户列表
    """
    where_clause = "WHERE 1=1"
    params = []

    if user.permission_level == 'DISTRICT':
        user_unit_name = user.unit_name
        parts = [p.strip() for p in user_unit_name.split('/')]
        level_1 = parts[0] if len(parts) > 0 else ''
        level_2 = parts[1] if len(parts) > 1 else ''

        if level_1 and level_2:
            where_clause += " AND (unit_name = %s OR unit_name LIKE %s)"
            params.append(user_unit_name)
            params.append(f"{level_1} / {level_2} / %")

    if args.get('unit_name'):
        where_clause += " AND unit_name = %s"
        params.append(args['unit_name'])

    total_result = db.exec(f"SELECT COUNT(*) as total FROM police_users {where_clause}", params, fetch=True)
    total = total_result[0]['total']

    limit = args.get('limit', total)
    page = args.get('page', 1)
    offset = (page - 1) * limit

    users = db.exec(
        f"SELECT id, police_number, name, nickname, phone, permission_level, unit_name, is_active FROM police_users {where_clause} ORDER BY id LIMIT %s OFFSET %s",
        params + [limit, offset],
        fetch=True
    )

    return JsonResponse({
        'success': True,
        'data': users,
        'total': total
    })


def _handle_create_user(args, user):
    """
    处理创建用户请求

    Args:
        args: 请求参数
            - police_number: 警号
            - name: 姓名
            - nickname: 昵称
            - phone: 手机号
            - permission_level: 权限级别
            - unit_name: 单位全称
            - password: 密码
            - is_active: 是否激活
        user: 当前用户对象

    Returns:
        JsonResponse: 创建结果
    """
    police_number = args.get('police_number', '').strip()
    name = args.get('name', '').strip()
    nickname = args.get('nickname', '').strip()
    phone = args.get('phone', '').strip()
    permission_level = args.get('permission_level', '').strip()
    unit_name = args.get('unit_name', '').strip()
    password = args.get('password', '')
    is_active = args.get('is_active', 1)

    if not police_number or not name or not permission_level:
        return JsonResponse({
            'success': False,
            'error': '警号、姓名、权限级别不能为空'
        }, status=400)

    if not password:
        return JsonResponse({
            'success': False,
            'error': '密码不能为空'
        }, status=400)

    if user.permission_level == 'DISTRICT':
        if permission_level == 'CITY':
            return JsonResponse({
                'success': False,
                'error': '无权创建市局用户'
            }, status=403)

    existing = db.exec(
        "SELECT id FROM police_users WHERE police_number = %s",
        (police_number,),
        fetch=True
    )
    if existing:
        return JsonResponse({
            'success': False,
            'error': '该警号已存在'
        }, status=400)

    hashed_password = PoliceAuthBackend.hash_password(password)

    db.exec(
        "INSERT INTO police_users (police_number, name, nickname, phone, permission_level, unit_name, password, is_active, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())",
        (police_number, name, nickname, phone, permission_level, unit_name, hashed_password, is_active),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '用户创建成功'
    })


def _handle_update_user(args, user):
    """
    处理更新用户请求

    Args:
        args: 请求参数
            - id: 用户ID
            - police_number: 警号
            - name: 姓名
            - nickname: 昵称
            - phone: 手机号
            - permission_level: 权限级别
            - unit_name: 单位全称
            - password: 密码（可选）
            - is_active: 是否激活
        user: 当前用户对象

    Returns:
        JsonResponse: 更新结果
    """
    user_id = args.get('id')
    police_number = args.get('police_number', '').strip()
    name = args.get('name', '').strip()
    nickname = args.get('nickname', '').strip()
    phone = args.get('phone', '').strip()
    permission_level = args.get('permission_level', '').strip()
    unit_name = args.get('unit_name', '').strip()
    password = args.get('password', '')
    is_active = args.get('is_active', 1)

    if not user_id:
        return JsonResponse({
            'success': False,
            'error': '用户ID不能为空'
        }, status=400)

    if not police_number or not name or not permission_level:
        return JsonResponse({
            'success': False,
            'error': '警号、姓名、权限级别不能为空'
        }, status=400)

    target_users = db.exec(
        "SELECT id, unit_name FROM police_users WHERE id = %s",
        (user_id,),
        fetch=True
    )
    if not target_users:
        return JsonResponse({
            'success': False,
            'error': '用户不存在'
        }, status=404)

    target_user = target_users[0]

    if user.permission_level == 'DISTRICT':
        target_unit_name = target_user['unit_name']
        current_unit_name = user.unit_name

        target_parts = [p.strip() for p in target_unit_name.split('/')]
        current_parts = [p.strip() for p in current_unit_name.split('/')]

        target_level_1 = target_parts[0] if len(target_parts) > 0 else ''
        target_level_2 = target_parts[1] if len(target_parts) > 1 else ''
        current_level_1 = current_parts[0] if len(current_parts) > 0 else ''
        current_level_2 = current_parts[1] if len(current_parts) > 1 else ''

        if target_level_1 != current_level_1 or (target_level_2 and target_level_2 != current_level_2):
            return JsonResponse({
                'success': False,
                'error': '无权修改该用户'
            }, status=403)

        if permission_level == 'CITY':
            return JsonResponse({
                'success': False,
                'error': '无权设置市局权限'
            }, status=403)

    duplicate = db.exec(
        "SELECT id FROM police_users WHERE police_number = %s AND id != %s",
        (police_number, user_id),
        fetch=True
    )
    if duplicate:
        return JsonResponse({
            'success': False,
            'error': '该警号已存在'
        }, status=400)

    if password:
        hashed_password = PoliceAuthBackend.hash_password(password)
        db.exec(
            "UPDATE police_users SET police_number = %s, name = %s, nickname = %s, phone = %s, permission_level = %s, unit_name = %s, password = %s, is_active = %s WHERE id = %s",
            (police_number, name, nickname, phone, permission_level, unit_name, hashed_password, is_active, user_id),
            fetch=False
        )
    else:
        db.exec(
            "UPDATE police_users SET police_number = %s, name = %s, nickname = %s, phone = %s, permission_level = %s, unit_name = %s, is_active = %s WHERE id = %s",
            (police_number, name, nickname, phone, permission_level, unit_name, is_active, user_id),
            fetch=False
        )

    return JsonResponse({
        'success': True,
        'message': '用户更新成功'
    })


def _handle_delete_user(args, user):
    """
    处理删除用户请求

    Args:
        args: 请求参数
            - id: 用户ID
        user: 当前用户对象

    Returns:
        JsonResponse: 删除结果
    """
    user_id = args.get('id')

    if not user_id:
        return JsonResponse({
            'success': False,
            'error': '用户ID不能为空'
        }, status=400)

    if int(user_id) == user.id:
        return JsonResponse({
            'success': False,
            'error': '不能删除当前登录用户'
        }, status=400)

    target_users = db.exec(
        "SELECT id, unit_name FROM police_users WHERE id = %s",
        (user_id,),
        fetch=True
    )
    if not target_users:
        return JsonResponse({
            'success': False,
            'error': '用户不存在'
        }, status=404)

    target_user = target_users[0]

    if user.permission_level == 'DISTRICT':
        target_unit_name = target_user['unit_name']
        current_unit_name = user.unit_name

        target_parts = [p.strip() for p in target_unit_name.split('/')]
        current_parts = [p.strip() for p in current_unit_name.split('/')]

        target_level_1 = target_parts[0] if len(target_parts) > 0 else ''
        target_level_2 = target_parts[1] if len(target_parts) > 1 else ''
        current_level_1 = current_parts[0] if len(current_parts) > 0 else ''
        current_level_2 = current_parts[1] if len(current_parts) > 1 else ''

        if target_level_1 != current_level_1 or (target_level_2 and target_level_2 != current_level_2):
            return JsonResponse({
                'success': False,
                'error': '无权删除该用户'
            }, status=403)

    db.exec(
        "DELETE FROM police_users WHERE id = %s",
        (user_id,),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '用户删除成功'
    })


def _handle_reset_password(args, user):
    """
    处理重置密码请求

    Args:
        args: 请求参数
            - id: 用户ID
            - password: 新密码
        user: 当前用户对象

    Returns:
        JsonResponse: 重置结果
    """
    user_id = args.get('id')
    password = args.get('password', '')

    if not user_id:
        return JsonResponse({
            'success': False,
            'error': '用户ID不能为空'
        }, status=400)

    if not password:
        return JsonResponse({
            'success': False,
            'error': '密码不能为空'
        }, status=400)

    target_users = db.exec(
        "SELECT id, unit_name FROM police_users WHERE id = %s",
        (user_id,),
        fetch=True
    )
    if not target_users:
        return JsonResponse({
            'success': False,
            'error': '用户不存在'
        }, status=404)

    target_user = target_users[0]

    if user.permission_level == 'DISTRICT':
        target_unit_name = target_user['unit_name']
        current_unit_name = user.unit_name

        target_parts = [p.strip() for p in target_unit_name.split('/')]
        current_parts = [p.strip() for p in current_unit_name.split('/')]

        target_level_1 = target_parts[0] if len(target_parts) > 0 else ''
        target_level_2 = target_parts[1] if len(target_parts) > 1 else ''
        current_level_1 = current_parts[0] if len(current_parts) > 0 else ''
        current_level_2 = current_parts[1] if len(current_parts) > 1 else ''

        if target_level_1 != current_level_1 or (target_level_2 and target_level_2 != current_level_2):
            return JsonResponse({
                'success': False,
                'error': '无权重置该用户密码'
            }, status=403)

    hashed_password = PoliceAuthBackend.hash_password(password)

    db.exec(
        "UPDATE police_users SET password = %s WHERE id = %s",
        (hashed_password, user_id),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '密码重置成功'
    })


def _handle_get_special_focus_list(args, user):
    """
    处理获取专项关注列表请求

    Args:
        args: 请求参数
            - limit: 每页数量（可选，默认全部）
            - page: 页码（可选，默认1）
        user: 当前用户对象

    Returns:
        JsonResponse: 专项关注列表
    """
    total_result = db.exec("SELECT COUNT(*) as total FROM 专项关注表", fetch=True)
    total = total_result[0]['total']

    limit = args.get('limit', total)
    page = args.get('page', 1)
    offset = (page - 1) * limit

    special_focus_list = db.exec(
        "SELECT 序号, 专项关注标题, 描述, 创建时间, 最后更新时间 FROM 专项关注表 ORDER BY 序号 LIMIT %s OFFSET %s",
        (limit, offset),
        fetch=True
    )

    return JsonResponse({
        'success': True,
        'data': special_focus_list,
        'total': total
    })


def _handle_create_special_focus(args, user):
    """
    处理创建专项关注请求

    Args:
        args: 请求参数
            - title: 专项关注标题
            - description: 描述
        user: 当前用户对象

    Returns:
        JsonResponse: 创建结果
    """
    title = args.get('title', '').strip()
    description = args.get('description', '').strip()

    if not title:
        return JsonResponse({
            'success': False,
            'error': '专项关注标题不能为空'
        }, status=400)

    db.exec(
        "INSERT INTO 专项关注表 (专项关注标题, 描述) VALUES (%s, %s)",
        (title, description),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '专项关注创建成功'
    })


def _handle_update_special_focus(args, user):
    """
    处理更新专项关注请求

    Args:
        args: 请求参数
            - id: 序号
            - title: 专项关注标题
            - description: 描述
        user: 当前用户对象

    Returns:
        JsonResponse: 更新结果
    """
    focus_id = args.get('id')
    title = args.get('title', '').strip()
    description = args.get('description', '').strip()

    if not focus_id:
        return JsonResponse({
            'success': False,
            'error': 'ID不能为空'
        }, status=400)

    if not title:
        return JsonResponse({
            'success': False,
            'error': '专项关注标题不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 专项关注表 WHERE 序号 = %s",
        (focus_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '专项关注不存在'
        }, status=404)

    db.exec(
        "UPDATE 专项关注表 SET 专项关注标题 = %s, 描述 = %s WHERE 序号 = %s",
        (title, description, focus_id),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '专项关注更新成功'
    })


def _handle_delete_special_focus(args, user):
    """
    处理删除专项关注请求

    Args:
        args: 请求参数
            - id: 序号
        user: 当前用户对象

    Returns:
        JsonResponse: 删除结果
    """
    focus_id = args.get('id')

    if not focus_id:
        return JsonResponse({
            'success': False,
            'error': 'ID不能为空'
        }, status=400)

    existing = db.exec(
        "SELECT 序号 FROM 专项关注表 WHERE 序号 = %s",
        (focus_id,),
        fetch=True
    )
    if not existing:
        return JsonResponse({
            'success': False,
            'error': '专项关注不存在'
        }, status=404)

    db.exec(
        "DELETE FROM 专项关注表 WHERE 序号 = %s",
        (focus_id,),
        fetch=False
    )

    return JsonResponse({
        'success': True,
        'message': '专项关注删除成功'
    })
