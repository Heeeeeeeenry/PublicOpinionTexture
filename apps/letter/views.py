"""
信件应用视图模块

处理信件相关的 API 请求
"""

import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.auth.views import get_current_user, require_login
from apps.database.db_manager import get, modify
from .db_utils import LetterDBHelper


@csrf_exempt
@require_http_methods(["POST"])
def letter_api(request):
    """
    信件统一 API 接口

    所有信件相关操作通过此接口处理，通过 order 参数区分具体操作

    Args:
        request: Django HTTP 请求对象
            - order: 操作命令
            - args: 操作参数

    Returns:
        JsonResponse: 操作结果

    支持的命令:
        - get_list: 获取信件列表
        - get_dispatch_list: 获取下发工作台列表
        - get_detail: 获取信件详情
        - get_by_phone: 通过手机号查询
        - get_by_idcard: 通过身份证号查询
        - create: 创建信件
        - update: 更新信件
        - delete: 删除信件
        - update_status: 更新信件状态
        - get_statistics: 获取统计信息
        - get_attachments: 获取附件
        - update_attachments: 更新附件
        - get_categories: 获取分类
        - dispatch: 下发信件
        - mark_invalid: 标记无效
        - handle_by_self: 自行处理

    示例请求:
        POST /api/letter/
        {
            "order": "get_list",
            "args": {
                "信件状态": "待下发",
                "limit": 10
            }
        }
    """
    user = get_current_user(request)
    if not user:
        return JsonResponse({
            'success': False,
            'error': '未登录'
        }, status=401)

    try:
        if request.content_type.startswith('multipart/form-data'):
            order = request.POST.get('order', '')
            args = json.loads(request.POST.get('args', '{}'))
        else:
            data = json.loads(request.body)
            order = data.get('order', '')
            args = data.get('args', {})
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '无效的 JSON 数据'
        }, status=400)

    command_handlers = {
        'get_list': _handle_get_list,
        'get_dispatch_list': _handle_get_dispatch_list,
        'get_processing_list': _handle_get_processing_list,
        'get_audit_list': _handle_get_audit_list,
        'get_detail': _handle_get_detail,
        'get_files': _handle_get_files,
        'get_by_phone': _handle_get_by_phone,
        'get_by_idcard': _handle_get_by_idcard,
        'create': _handle_create,
        'update': _handle_update,
        'delete': _handle_delete,
        'update_status': _handle_update_status,
        'get_statistics': _handle_get_statistics,
        'get_attachments': _handle_get_attachments,
        'update_attachments': _handle_update_attachments,
        'get_categories': _handle_get_categories,
        'dispatch': _handle_dispatch,
        'mark_invalid': _handle_mark_invalid,
        'submit_processing': _handle_submit_processing,
        'handle_by_self': _handle_handle_by_self,
        'return_letter': _handle_return_letter,
        'audit_approve': _handle_audit_approve,
        'audit_reject': _handle_audit_reject,
    }

    handler = command_handlers.get(order)
    if not handler:
        return JsonResponse({
            'success': False,
            'error': f'未知的操作命令: {order}'
        }, status=400)

    try:
        return handler(request, args, user)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def _handle_get_list(request, args, user):
    """
    处理获取信件列表请求
    """
    result = LetterDBHelper.get_all_letters(
        status=args.get('信件状态'),
        category_level1=args.get('信件一级分类'),
        category_level2=args.get('信件二级分类'),
        category_level3=args.get('信件三级分类'),
        search_keywords=args.get('搜索关键字'),
        start_time=args.get('start_time'),
        end_time=args.get('end_time'),
        order_by=args.get('order_by', '来信时间'),
        order_desc=args.get('order_desc', True),
        limit=args.get('limit'),
        page=args.get('page', 1)
    )

    return JsonResponse({
        'success': True,
        'data': result['data'],
        'total': result['total']
    })


def _handle_get_dispatch_list(request, args, user):
    """
    处理获取下发工作台信件列表请求
    """
    letters = LetterDBHelper.get_dispatch_letters_for_user(
        user_permission=user.permission_level if user else 'OFFICER',
        user_unit_name=user.unit_name if user else '',
        limit=args.get('limit'),
        page=args.get('page', 1)
    )

    return JsonResponse({
        'success': True,
        'data': letters
    })


def _handle_get_processing_list(request, args, user):
    """
    处理获取处理工作台信件列表请求

    返回当前信件处理单位为用户单位，且信件状态为"正在处理"的信件
    """
    letters = LetterDBHelper.get_processing_letters_for_user(
        user_unit_name=user.unit_name if user else '',
        limit=args.get('limit'),
        page=args.get('page', 1)
    )

    return JsonResponse({
        'success': True,
        'data': letters
    })


def _handle_get_audit_list(request, args, user):
    """
    处理获取核查工作台信件列表请求
    """
    letters = LetterDBHelper.get_audit_letters_for_user(
        user_unit_name=user.unit_name if user else '',
        limit=args.get('limit'),
        page=args.get('page', 1)
    )

    return JsonResponse({
        'success': True,
        'data': letters
    })


def _handle_get_detail(request, args, user):
    """
    处理获取信件详情请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    letter = LetterDBHelper.get_letter_by_number(letter_number)

    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    if letter.get('专项关注标签'):
        try:
            if isinstance(letter['专项关注标签'], str):
                letter['专项关注标签'] = json.loads(letter['专项关注标签'])
        except json.JSONDecodeError:
            letter['专项关注标签'] = []
    else:
        letter['专项关注标签'] = []

    attachments = LetterDBHelper.get_attachments(letter_number)
    letter['附件'] = attachments

    from apps.database.db_manager import get
    flow_dict = get("流转表", {"信件编号": [letter_number]})
    if flow_dict:
        flow_data = list(flow_dict.values())[0]
        flow_records = flow_data.get('流转记录')
        if flow_records and isinstance(flow_records, str):
            try:
                letter['流转记录'] = json.loads(flow_records)
            except json.JSONDecodeError:
                letter['流转记录'] = []
        else:
            letter['流转记录'] = flow_records or []
    else:
        letter['流转记录'] = []

    id_card = letter.get('身份证号')
    if id_card:
        history_letters = LetterDBHelper.get_letters_by_idcard(id_card)
        letter['历史来信'] = [l for l in history_letters if l.get('信件编号') != letter_number]
    else:
        letter['历史来信'] = []

    return JsonResponse({
        'success': True,
        'data': letter
    })


def _handle_get_files(request, args, user):
    """
    处理获取信件附件请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    attachments = LetterDBHelper.get_attachments(letter_number)

    return JsonResponse({
        'success': True,
        'data': attachments
    })


def _handle_get_by_phone(request, args, user):
    """
    处理通过手机号查询信件请求
    """
    phone = args.get('手机号')

    if not phone:
        return JsonResponse({
            'success': False,
            'error': '手机号不能为空'
        }, status=400)

    letters = LetterDBHelper.get_letters_by_phone(phone)

    # 解析流转记录
    for letter in letters:
        flow_records = letter.get('流转记录')
        if flow_records and isinstance(flow_records, str):
            try:
                letter['流转记录'] = json.loads(flow_records)
            except json.JSONDecodeError:
                letter['流转记录'] = []
        elif not flow_records:
            letter['流转记录'] = []

    return JsonResponse({
        'success': True,
        'data': letters
    })


def _handle_get_by_idcard(request, args, user):
    """
    处理通过身份证号查询信件请求
    """
    idcard = args.get('身份证号')

    if not idcard:
        return JsonResponse({
            'success': False,
            'error': '身份证号不能为空'
        }, status=400)

    letters = LetterDBHelper.get_letters_by_idcard(idcard)

    # 解析流转记录
    for letter in letters:
        flow_records = letter.get('流转记录')
        if flow_records and isinstance(flow_records, str):
            try:
                letter['流转记录'] = json.loads(flow_records)
            except json.JSONDecodeError:
                letter['流转记录'] = []
        elif not flow_records:
            letter['流转记录'] = []

    return JsonResponse({
        'success': True,
        'data': letters
    })


def _handle_create(request, args, user):
    """
    处理创建信件请求
    """
    from datetime import datetime

    letter_number = f"XJ{datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]}"

    data = {
        '信件编号': letter_number,
        '群众姓名': args.get('群众姓名'),
        '手机号': args.get('手机号'),
        '身份证号': args.get('身份证号'),
        '来信时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '来信渠道': args.get('来信渠道', '其他'),
        '信件一级分类': args.get('信件一级分类'),
        '信件二级分类': args.get('信件二级分类'),
        '信件三级分类': args.get('信件三级分类'),
        '诉求内容': args.get('诉求内容'),
        '专项关注标签': args.get('专项关注标签')
    }

    if not data['群众姓名']:
        return JsonResponse({
            'success': False,
            'error': '群众姓名不能为空'
        }, status=400)

    if not data['诉求内容']:
        return JsonResponse({
            'success': False,
            'error': '诉求内容不能为空'
        }, status=400)

    LetterDBHelper.create_letter(data)

    return JsonResponse({
        'success': True,
        'message': '创建成功',
        'data': {'信件编号': letter_number}
    })


def _handle_update(request, args, user):
    """
    处理更新信件请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    update_data = {
        '群众姓名': args.get('群众姓名'),
        '手机号': args.get('手机号'),
        '身份证号': args.get('身份证号'),
        '来信渠道': args.get('来信渠道'),
        '信件一级分类': args.get('信件一级分类'),
        '信件二级分类': args.get('信件二级分类'),
        '信件三级分类': args.get('信件三级分类'),
        '诉求内容': args.get('诉求内容'),
        '专项关注标签': args.get('专项关注标签')
    }

    update_data = {k: v for k, v in update_data.items() if v is not None}

    if not update_data:
        return JsonResponse({
            'success': False,
            'error': '没有要更新的数据'
        }, status=400)

    success = LetterDBHelper.update_letter(letter_number, update_data)

    if success:
        return JsonResponse({
            'success': True,
            'message': '更新成功'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '更新失败或信件不存在'
        }, status=404)


def _handle_delete(request, args, user):
    """
    处理删除信件请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    success = LetterDBHelper.delete_letter(letter_number)

    if success:
        return JsonResponse({
            'success': True,
            'message': '删除成功'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '删除失败或信件不存在'
        }, status=404)


def _handle_update_status(request, args, user):
    """
    处理更新信件状态请求
    """
    letter_number = args.get('信件编号')
    status = args.get('信件状态')
    remark = args.get('备注', '')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    if not status:
        return JsonResponse({
            'success': False,
            'error': '状态不能为空'
        }, status=400)

    # 检查信件是否存在
    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '更新失败或信件不存在'
        }, status=404)

    current_status = letter.get('当前信件状态')

    # 如果是市局民意智感中心审核，状态可能直接变为已办结
    # 在通用状态更新中记录正确的流转信息
    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.get_full_unit_path() if hasattr(user, 'get_full_unit_path') else (user.unit_name if user else '')

    flow_record = {
        '备注': remark,
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作类型': '状态更新',
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作前状态': current_status,
        '操作后单位': user_unit_full_name,
        '操作后状态': status
    }

    success = LetterDBHelper.update_letter_status(letter_number, status, flow_record)

    if success:
        return JsonResponse({
            'success': True,
            'message': '状态更新成功'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '更新失败或信件不存在'
        }, status=404)


def _handle_get_statistics(request, args, user):
    """
    处理获取统计信息请求
    """
    user_unit_name = user.get_full_unit_path() if hasattr(user, 'get_full_unit_path') else (user.unit_name if user else '')
    stats = LetterDBHelper.get_letter_statistics(
        start_time=args.get('start_time'),
        end_time=args.get('end_time'),
        unit_name=user_unit_name
    )

    return JsonResponse({
        'success': True,
        'data': stats
    })


def _handle_get_attachments(request, args, user):
    """
    处理获取附件请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    attachments = LetterDBHelper.get_attachments(letter_number)

    return JsonResponse({
        'success': True,
        'data': attachments or {}
    })


def _handle_update_attachments(request, args, user):
    """
    处理更新附件请求
    """
    letter_number = args.get('信件编号')
    attachment_type = args.get('附件类型')
    files = args.get('文件列表', [])

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    if not attachment_type:
        return JsonResponse({
            'success': False,
            'error': '附件类型不能为空'
        }, status=400)

    success = LetterDBHelper.update_attachments(letter_number, attachment_type, files)

    if success:
        return JsonResponse({
            'success': True,
            'message': '附件更新成功'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '更新失败'
        }, status=400)


def _handle_get_categories(request, args, user):
    """
    处理获取信件分类请求
    """
    categories = LetterDBHelper.get_categories()

    return JsonResponse({
        'success': True,
        'data': categories
    })


def _handle_dispatch(request, args, user):
    """
    处理下发信件请求

    完整的下发流程：
    1. 验证信件状态（是否处于"预处理"）
    2. 检查用户权限（是否有权向目标单位下发）
    3. 对比数据变更（检测用户编辑的字段）
    4. 创建流转记录（包含下发备注和变更记录）
    5. 更新信件状态和处理单位
    """
    # 从args中提取数据（中文key）
    letter_number = args.get('信件编号')
    target_unit = args.get('目标单位')
    dispatch_notes = args.get('下发备注', '')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    if not target_unit:
        return JsonResponse({
            'success': False,
            'error': '目标单位不能为空'
        }, status=400)

    # 获取当前用户信息
    user_police_number = user.police_number
    user_name = user.name

    # 直接使用用户对象的单位全称方法
    user_unit_full_name = user.get_full_unit_path()

    # 直接使用前端传递的目标单位全称（不再查询数据库）
    target_unit_full_name = target_unit

    # 添加详细日志
    print('========== 下发权限检查日志 ==========')
    print(f'用户警号: {user_police_number}')
    print(f'用户姓名: {user_name}')
    print(f'用户单位全称: {user_unit_full_name}')
    print(f'前端传递的目标单位: {target_unit}')
    print(f'目标单位全称: {target_unit_full_name}')
    print('====================================')

    # 从数据库查询信件最新状态
    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    current_status = letter.get('当前信件状态')

    # 检查信件是否可以下发
    if current_status not in ['预处理', '市局下发至区县局/支队', '已下发至分县局/支队']:
        # 从流转记录查找最后处理人
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        last_operator = '未知用户'
        if flow_dict:
            flow_data = list(flow_dict.values())[0]
            flow_records = flow_data.get('流转记录')
            if flow_records:
                try:
                    records = json.loads(flow_records) if isinstance(flow_records, str) else flow_records
                    if records:
                        last_record = records[-1]
                        last_operator = last_record.get('操作人警号', '未知用户')
                except (json.JSONDecodeError, TypeError):
                    pass

        return JsonResponse({
            'success': False,
            'error': f'该信件已被{last_operator}处理，现在处于{current_status}状态。'
        }, status=400)

    # 检查用户权限（是否有权向目标单位下发）
    # 调用setting应用的权限检查方法
    from apps.setting.views import _handle_check_dispatch_permission
    permission_result = _handle_check_dispatch_permission(
        {'from_unit': user_unit_full_name, 'to_unit': target_unit_full_name},
        user
    )
    
    # 解析权限检查结果
    if hasattr(permission_result, 'content'):
        permission_data = json.loads(permission_result.content)
    else:
        permission_data = permission_result
    
    if not permission_data.get('has_permission'):
        return JsonResponse({
            'success': False,
            'error': '您无权向该单位下发信件。请联系市局民意智感中心。'
        }, status=403)

    # 对比数据变更
    change_records = []
    fields_to_compare = [
        ('群众姓名', '群众姓名'),
        ('手机号', '手机号'),
        ('身份证号', '身份证号'),
        ('来信时间', '来信时间'),
        ('来信渠道', '来信渠道'),
        ('信件一级分类', '信件一级分类'),
        ('信件二级分类', '信件二级分类'),
        ('信件三级分类', '信件三级分类'),
        ('诉求内容', '诉求内容'),
        ('专项关注标签', '专项关注标签'),
    ]

    for field_name, db_field in fields_to_compare:
        new_value = args.get(field_name)
        old_value = letter.get(db_field)

        if new_value is None:
            continue

        if field_name == '来信时间':
            if old_value and hasattr(old_value, 'strftime'):
                old_value = old_value.strftime('%Y-%m-%d %H:%M:%S')
            elif old_value and isinstance(old_value, str):
                old_value = old_value.replace('T', ' ').split('.')[0]

        if new_value == '' and old_value is None:
            continue
        if new_value is None and old_value == '':
            continue

        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value_str = json.dumps(new_value, ensure_ascii=False)
            else:
                new_value_str = str(new_value)
            if isinstance(old_value, str):
                try:
                    old_value_list = json.loads(old_value)
                    old_value_str = json.dumps(old_value_list, ensure_ascii=False)
                except (json.JSONDecodeError, TypeError):
                    old_value_str = str(old_value)
            else:
                old_value_str = str(old_value) if old_value else '[]'
            if new_value_str != old_value_str:
                change_records.append({
                    '变更人': user_name,
                    '变更字段': field_name,
                    '变更前值': old_value if old_value is not None else '(空)',
                    '变更后值': new_value if new_value else '(空)'
                })
            continue

        if str(new_value) != str(old_value):
            change_records.append({
                '变更人': user_name,
                '变更字段': field_name,
                '变更前值': old_value if old_value is not None else '(空)',
                '变更后值': new_value if new_value else '(空)'
            })

    letter_row_id = letter.get('序号')
    for record in change_records:
        field_name = record['变更字段']
        new_value = record['变更后值']
        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value = json.dumps(new_value, ensure_ascii=False)
            modify("信件表", letter_row_id, field_name, new_value)
        else:
            modify("信件表", letter_row_id, field_name, new_value)

    # 构建信息变更记录
    info_changes = []
    for record in change_records:
        info_changes.append({
            '内容类型': record['变更字段'],
            '变更前': record['变更前值'],
            '变更后': record['变更后值']
        })

    # 构建备注
    remark = {}
    if dispatch_notes:
        remark['下发备注'] = dispatch_notes
    if info_changes:
        remark['信息变更'] = info_changes

    # 构建流转记录
    is_target_myzgzx = '民意智感中心' in target_unit_full_name
    is_user_city = '市局' in user_unit_full_name

    if is_target_myzgzx:
        action_type = '市局下发' if is_user_city else '分县局/支队下发'
        new_status = '市局下发至区县局/支队' if is_user_city else '已下发至处理单位'
    else:
        action_type = '市局直发' if is_user_city else '分县局/支队下发'
        new_status = '正在处理'

    flow_record = {
        '备注': remark,
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作类型': action_type,
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作前状态': current_status,
        '操作后单位': target_unit_full_name,
        '操作后状态': new_status
    }

    # 调用dispatch_letter完成下发
    success = LetterDBHelper.dispatch_letter(letter_number, target_unit, flow_record, new_status)

    if success:
        return JsonResponse({
            'success': True,
            'message': '下发成功'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '下发失败'
        }, status=500)


def _handle_mark_invalid(request, args, user):
    """
    处理标记信件为不属实请求
    """
    return _process_feedback(request, args, user, is_valid=False)


def _handle_return_letter(request, args, user):
    """
    处理退回信件请求
    """
    from datetime import datetime
    import json
    from apps.database.db_manager import get

    letter_number = args.get('信件编号')
    reason = args.get('退回原因')

    if not letter_number:
        return JsonResponse({'success': False, 'error': '信件编号不能为空'}, status=400)
    
    if not reason:
        return JsonResponse({'success': False, 'error': '退回原因不能为空'}, status=400)

    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({'success': False, 'error': '信件不存在'}, status=404)

    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.unit_name if user else ''

    # 获取流转记录
    flow_dict = get("流转表", {"信件编号": [letter_number]})
    flow_data = list(flow_dict.values())[0] if flow_dict else {}
    flow_records_str = flow_data.get('流转记录', '[]')
    try:
        records = json.loads(flow_records_str) if isinstance(flow_records_str, str) else flow_records_str
    except json.JSONDecodeError:
        records = []

    target_unit = None
    target_status = None
    
    # 遍历寻找最后一个操作后状态为“正在处理”的记录
    for rec in reversed(records):
        if rec.get('操作后状态') == '正在处理':
            target_unit = rec.get('操作前单位')
            target_status = rec.get('操作前状态')
            break
            
    if not target_unit or not target_status:
        return JsonResponse({'success': False, 'error': '无法找到信件的下发来源'}, status=400)

    flow_record = {
        '操作类型': '退回至分县局/支队',
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作后单位': target_unit,
        '操作前状态': letter.get('当前信件状态', '正在处理'),
        '操作后状态': target_status,
        '备注': reason
    }

    success = LetterDBHelper.return_letter(letter_number, target_unit, target_status, flow_record)

    if success:
        return JsonResponse({'success': True, 'message': '退回成功'})
    else:
        return JsonResponse({'success': False, 'error': '退回失败'}, status=500)


def _handle_submit_processing(request, args, user):
    """
    处理提交信件请求
    """
    return _process_feedback(request, args, user, is_valid=True)


def _process_feedback(request, args, user, is_valid: bool):
    """
    处理工作台反馈的统一逻辑
    """
    import os
    from django.conf import settings
    from django.core.files.storage import default_storage

    letter_number = args.get('信件编号') or args.get('letter_number')
    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    if letter.get('当前信件状态') != '正在处理':
        return JsonResponse({
            'success': False,
            'error': '该信件不在"正在处理"状态，无法反馈'
        }, status=400)

    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.unit_name if user else ''

    # 1. 比较数据变更
    letter_data = args.get('letterData', {})
    change_records = []
    fields_to_compare = [
        ('群众姓名', '群众姓名'),
        ('手机号', '手机号'),
        ('身份证号', '身份证号'),
        ('来信时间', '来信时间'),
        ('来信渠道', '来信渠道'),
        ('信件一级分类', '信件一级分类'),
        ('信件二级分类', '信件二级分类'),
        ('信件三级分类', '信件三级分类'),
        ('诉求内容', '诉求内容'),
        ('专项关注标签', '专项关注标签'),
    ]

    for field_name, db_field in fields_to_compare:
        new_value = letter_data.get(field_name)
        old_value = letter.get(db_field)

        if new_value is None:
            continue

        if field_name == '来信时间':
            if old_value and hasattr(old_value, 'strftime'):
                old_value = old_value.strftime('%Y-%m-%d %H:%M:%S')
            elif old_value and isinstance(old_value, str):
                old_value = old_value.replace('T', ' ').split('.')[0]

        if new_value == '' and old_value is None:
            continue
        if new_value is None and old_value == '':
            continue

        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value_str = json.dumps(new_value, ensure_ascii=False)
            else:
                new_value_str = str(new_value)
            if isinstance(old_value, str):
                try:
                    old_value_list = json.loads(old_value)
                    old_value_str = json.dumps(old_value_list, ensure_ascii=False)
                except (json.JSONDecodeError, TypeError):
                    old_value_str = str(old_value)
            else:
                old_value_str = str(old_value) if old_value else '[]'
            if new_value_str != old_value_str:
                change_records.append({
                    '变更人': user_name,
                    '变更字段': field_name,
                    '变更前值': old_value if old_value is not None else '(空)',
                    '变更后值': new_value if new_value else '(空)'
                })
            continue

        if str(new_value) != str(old_value):
            change_records.append({
                '变更人': user_name,
                '变更字段': field_name,
                '变更前值': old_value if old_value is not None else '(空)',
                '变更后值': new_value if new_value else '(空)'
            })

    # 更新数据库中的变更字段
    letter_row_id = letter.get('序号')
    for record in change_records:
        field_name = record['变更字段']
        new_value = record['变更后值']
        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value = json.dumps(new_value, ensure_ascii=False)
        modify("信件表", letter_row_id, field_name, new_value)

    # 2. 确定反馈单位和新的状态
    flow_dict = get("流转表", {"信件编号": [letter_number]})
    flow_data = list(flow_dict.values())[0] if flow_dict else {}
    flow_records_str = flow_data.get('流转记录', '[]')
    try:
        records = json.loads(flow_records_str) if isinstance(flow_records_str, str) else flow_records_str
    except json.JSONDecodeError:
        records = []

    feedback_unit = '未知单位'
    for rec in reversed(records):
        if rec.get('操作后状态') == '正在处理':
            feedback_unit = rec.get('操作前单位', '未知单位')
            break

    # 根据反馈单位确定新的状态
    # 如果反馈给市局民意智感中心，则状态为待市局审核
    # 否则状态为待分县局/支队审核
    if feedback_unit == '市局 / 民意智感中心':
        new_status = '待市局审核'
    else:
        new_status = '待分县局/支队审核'

    # 3. 处理上传的文件
    recordings_files = []
    result_files = []
    for key, f in request.FILES.items():
        if key.startswith('recordings'):
            file_path = f"letters/{letter_number}/recordings/{f.name}"
            saved_path = default_storage.save(file_path, f)
            recordings_files.append({
                'name': f.name,
                'url': f"{settings.MEDIA_URL}{saved_path}"
            })
        elif key.startswith('resultFiles'):
            file_path = f"letters/{letter_number}/results/{f.name}"
            saved_path = default_storage.save(file_path, f)
            result_files.append({
                'name': f.name,
                'url': f"{settings.MEDIA_URL}{saved_path}"
            })

    if recordings_files:
        LetterDBHelper.update_attachments(letter_number, '通话录音附件', recordings_files)
    if result_files:
        LetterDBHelper.update_attachments(letter_number, '办案单位反馈附件', result_files)

    # 4. 生成流转记录
    info_changes = []
    for record in change_records:
        info_changes.append({
            '内容类型': record['变更字段'],
            '变更前': record['变更前值'],
            '变更后': record['变更后值']
        })

    remark_text = args.get('remark') if is_valid else args.get('reason')
    remark_obj = {
        '诉求情况': '属实' if is_valid else '不属实',
        '反馈内容': remark_text or '',
    }
    if info_changes:
        remark_obj['信息变更'] = info_changes
    if recordings_files:
        remark_obj['通话录音附件'] = [f['name'] for f in recordings_files]
    if result_files:
        remark_obj['附件文件'] = [f['name'] for f in result_files]

    flow_record = {
        '操作类型': '办案单位反馈',
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作后单位': feedback_unit,
        '操作前状态': '正在处理',
        '操作后状态': new_status,
        '备注': remark_obj
    }

    success = LetterDBHelper.submit_feedback_with_status(letter_number, feedback_unit, new_status, flow_record)

    if success:
        return JsonResponse({
            'success': True,
            'message': '提交成功' if is_valid else '已标记为不属实'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '提交失败'
        }, status=500)


def _handle_handle_by_self(request, args, user):
    """
    处理由当前用户自行处理信件请求
    """
    letter_number = args.get('信件编号')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.unit_name if user else ''

    print('====================================')
    print('处理自行处理请求')
    print(f'信件编号: {letter_number}')
    print(f'用户警号: {user_police_number}')
    print(f'用户姓名: {user_name}')
    print(f'用户单位全称: {user_unit_full_name}')
    print('====================================')

    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    current_status = letter.get('当前信件状态')

    if current_status not in ['预处理', '市局下发至区县局/支队', '已下发至分县局/支队']:
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        last_operator = '未知用户'
        if flow_dict:
            flow_data = list(flow_dict.values())[0]
            flow_records = flow_data.get('流转记录')
            if flow_records:
                try:
                    records = json.loads(flow_records) if isinstance(flow_records, str) else flow_records
                    if records:
                        last_record = records[-1]
                        last_operator = last_record.get('操作人警号', '未知用户')
                except (json.JSONDecodeError, TypeError):
                    pass

        return JsonResponse({
            'success': False,
            'error': f'该信件已被{last_operator}处理，现在处于{current_status}状态。'
        }, status=400)

    change_records = []
    fields_to_compare = [
        ('群众姓名', '群众姓名'),
        ('手机号', '手机号'),
        ('身份证号', '身份证号'),
        ('来信时间', '来信时间'),
        ('来信渠道', '来信渠道'),
        ('信件一级分类', '信件一级分类'),
        ('信件二级分类', '信件二级分类'),
        ('信件三级分类', '信件三级分类'),
        ('诉求内容', '诉求内容'),
        ('专项关注标签', '专项关注标签'),
    ]

    for field_name, db_field in fields_to_compare:
        new_value = args.get(field_name)
        old_value = letter.get(db_field)

        if new_value is None:
            continue

        if field_name == '来信时间':
            if old_value and hasattr(old_value, 'strftime'):
                old_value = old_value.strftime('%Y-%m-%d %H:%M:%S')
            elif old_value and isinstance(old_value, str):
                old_value = old_value.replace('T', ' ').split('.')[0]

        if new_value == '' and old_value is None:
            continue
        if new_value is None and old_value == '':
            continue

        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value_str = json.dumps(new_value, ensure_ascii=False)
            else:
                new_value_str = str(new_value)
            if isinstance(old_value, str):
                try:
                    old_value_list = json.loads(old_value)
                    old_value_str = json.dumps(old_value_list, ensure_ascii=False)
                except (json.JSONDecodeError, TypeError):
                    old_value_str = str(old_value)
            else:
                old_value_str = str(old_value) if old_value else '[]'
            if new_value_str != old_value_str:
                change_records.append({
                    '变更人': user_name,
                    '变更字段': field_name,
                    '变更前值': old_value if old_value is not None else '(空)',
                    '变更后值': new_value if new_value else '(空)'
                })
            continue

        if str(new_value) != str(old_value):
            change_records.append({
                '变更人': user_name,
                '变更字段': field_name,
                '变更前值': old_value if old_value is not None else '(空)',
                '变更后值': new_value if new_value else '(空)'
            })

    letter_row_id = letter.get('序号')
    for record in change_records:
        field_name = record['变更字段']
        new_value = record['变更后值']
        if field_name == '专项关注标签':
            if isinstance(new_value, list):
                new_value = json.dumps(new_value, ensure_ascii=False)
            modify("信件表", letter_row_id, field_name, new_value)
        else:
            modify("信件表", letter_row_id, field_name, new_value)

    info_changes = []
    for record in change_records:
        info_changes.append({
            '内容类型': record['变更字段'],
            '变更前': record['变更前值'],
            '变更后': record['变更后值']
        })

    remark = {
        '自行处理备注': '由当前用户自行处理'
    }
    if info_changes:
        remark['信息变更'] = info_changes

    flow_record = {
        '备注': remark,
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作类型': '自行处理',
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作前状态': current_status,
        '操作后单位': user_unit_full_name,
        '操作后状态': '正在处理'
    }

    success = LetterDBHelper.handle_by_self(letter_number, user_unit_full_name, flow_record)

    if success:
        return JsonResponse({
            'success': True,
            'message': '已分配给当前用户处理'
        })
    else:
        return JsonResponse({
            'success': False,
            'error': '操作失败或信件不存在'
        }, status=404)


def _handle_audit_approve(request, args, user):
    """
    处理核查通过请求
    """
    letter_number = args.get('信件编号')
    remark = args.get('备注', '')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    current_status = letter.get('当前信件状态')
    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.get_full_unit_path() if hasattr(user, 'get_full_unit_path') else (user.unit_name if user else '')

    user_parts = [p.strip() for p in user_unit_full_name.split('/')]
    user_level1 = user_parts[0] if len(user_parts) > 0 else ''
    user_level2 = user_parts[1] if len(user_parts) > 1 else ''
    is_city_myzgzx = (user_level1 == '市局' and '民意智感中心' in user_level2)

    if is_city_myzgzx:
        action_type = '市局审核通过'
        new_status = '已办结'
        target_unit = '市局 / 民意智感中心'
    else:
        action_type = '分县局/支队审核通过'
        new_status = '待市局审核'
        target_unit = '市局 / 民意智感中心'

    flow_record = {
        '备注': remark,
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作类型': action_type,
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作前状态': current_status,
        '操作后单位': target_unit,
        '操作后状态': new_status
    }

    success = LetterDBHelper.update_letter_status_with_unit(letter_number, new_status, target_unit, flow_record)

    if success:
        return JsonResponse({'success': True, 'message': '审核通过'})
    else:
        return JsonResponse({'success': False, 'error': '审核失败'}, status=500)


def _handle_audit_reject(request, args, user):
    """
    处理核查不通过请求（退回）
    """
    letter_number = args.get('信件编号')
    remark = args.get('退回原因', '')

    if not letter_number:
        return JsonResponse({
            'success': False,
            'error': '信件编号不能为空'
        }, status=400)

    letter = LetterDBHelper.get_letter_by_number(letter_number)
    if not letter:
        return JsonResponse({
            'success': False,
            'error': '信件不存在'
        }, status=404)

    current_status = letter.get('当前信件状态')
    user_name = user.name if user else 'system'
    user_police_number = user.police_number if user else 'system'
    user_unit_full_name = user.get_full_unit_path() if hasattr(user, 'get_full_unit_path') else (user.unit_name if user else '')

    flow_dict = get("流转表", {"信件编号": [letter_number]})
    flow_data = list(flow_dict.values())[0] if flow_dict else {}
    flow_records_str = flow_data.get('流转记录', '[]')
    try:
        records = json.loads(flow_records_str) if isinstance(flow_records_str, str) else flow_records_str
    except json.JSONDecodeError:
        records = []

    target_unit = '未知单位'
    target_status = '正在处理'
    for rec in reversed(records):
        if rec.get('操作后状态') in ['待分县局/支队审核', '待市局审核', '正在处理']:
            target_unit = rec.get('操作前单位', '未知单位')
            target_status = rec.get('操作前状态', '正在处理')
            break

    flow_record = {
        '备注': remark,
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        '操作类型': '审核退回',
        '操作人姓名': user_name,
        '操作人警号': user_police_number,
        '操作前单位': user_unit_full_name,
        '操作前状态': current_status,
        '操作后单位': target_unit,
        '操作后状态': target_status
    }

    success = LetterDBHelper.return_letter(letter_number, target_unit, target_status, flow_record)

    if success:
        return JsonResponse({'success': True, 'message': '已退回'})
    else:
        return JsonResponse({'success': False, 'error': '退回失败'}, status=500)
