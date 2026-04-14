"""
信件应用数据库工具模块

基于通用CRUD方法封装信件业务逻辑
"""

import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from apps.database.db_manager import get, modify, delete, insert, exec


class LetterDBHelper:
    """
    信件数据库操作助手类

    基于通用CRUD方法封装信件业务操作
    """

    @staticmethod
    def get_all_letters(
        status: Optional[str] = None,
        category_level1: Optional[str] = None,
        category_level2: Optional[str] = None,
        category_level3: Optional[str] = None,
        search_keywords: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        order_by: str = '来信时间',
        order_desc: bool = True,
        limit: Optional[int] = None,
        page: int = 1,
        user_permission: Optional[str] = None,
        user_unit_name: Optional[str] = None
    ) -> List[Dict]:
        """
        获取信件列表

        Args:
            status: 信件状态筛选（基于信件表的当前信件状态）
            category_level1: 一级分类筛选
            category_level2: 二级分类筛选
            category_level3: 三级分类筛选
            search_keywords: 搜索关键字（支持|分割的"或"搜索）
            start_time: 开始时间
            end_time: 结束时间
            order_by: 排序字段
            order_desc: 是否降序
            limit: 限制数量
            page: 页码（从1开始）
            user_permission: 用户权限级别 (CITY/DISTRICT/OFFICER)
            user_unit_name: 用户单位全称

        Returns:
            List[Dict]: 信件列表
        """
        # 构建匹配字典
        match_dict = {"ALL": "ALL"}

        # 使用通用get方法获取所有信件
        letters_dict = get("信件表", match_dict)
        letters = list(letters_dict.values())

        # 应用筛选条件
        filtered_letters = []
        for letter in letters:
            # 状态筛选（现在从信件表直接获取）
            if status and letter.get('当前信件状态') != status:
                continue

            # 分类筛选
            if category_level1 and letter.get('信件一级分类') != category_level1:
                continue
            if category_level2 and letter.get('信件二级分类') != category_level2:
                continue
            if category_level3 and letter.get('信件三级分类') != category_level3:
                continue

            # 时间筛选
            if start_time:
                letter_time = letter.get('来信时间')
                if letter_time and str(letter_time) < start_time:
                    continue
            if end_time:
                letter_time = letter.get('来信时间')
                if letter_time and str(letter_time) > end_time:
                    continue

            # 搜索关键字
            if search_keywords:
                keywords = [k.strip() for k in search_keywords.split('|') if k.strip()]
                if keywords:
                    found = False
                    content = str(letter.get('诉求内容', ''))
                    name = str(letter.get('群众姓名', ''))
                    number = str(letter.get('信件编号', ''))
                    for keyword in keywords:
                        if keyword in content or keyword in name or keyword in number:
                            found = True
                            break
                    if not found:
                        continue

            filtered_letters.append(letter)

        # 区县局用户过滤
        if user_permission == 'DISTRICT' and status == '市局下发至区县局/支队' and user_unit_name:
            filtered_letters = LetterDBHelper._filter_letters_by_dispatch_unit(filtered_letters, user_unit_name)

        # 排序
        reverse = order_desc
        try:
            filtered_letters.sort(key=lambda x: x.get(order_by) or '', reverse=reverse)
        except Exception:
            pass

        # 获取总数
        total_count = len(filtered_letters)

        # 分页
        if limit:
            offset = (page - 1) * limit
            filtered_letters = filtered_letters[offset:offset + limit]

        return {
            'data': filtered_letters,
            'total': total_count
        }

    @staticmethod
    def _filter_letters_by_dispatch_unit(letters: List[Dict], user_unit_name: str) -> List[Dict]:
        """
        根据下发单位过滤信件

        Args:
            letters: 信件列表
            user_unit_name: 用户单位全称

        Returns:
            List[Dict]: 过滤后的信件列表
        """
        filtered_letters = []

        for letter in letters:
            letter_number = letter.get('信件编号')
            if not letter_number:
                continue

            # 获取流转记录
            flow_dict = get("流转表", {"信件编号": [letter_number]})
            if flow_dict:
                flow_record = list(flow_dict.values())[0]
                flow_records = flow_record.get('流转记录')
                if flow_records:
                    try:
                        records = json.loads(flow_records) if isinstance(flow_records, str) else flow_records
                        for record in reversed(records):
                            if '下发' in record.get('操作类型', '') or '直发' in record.get('操作类型', ''):
                                remark = record.get('备注', '')
                                target = record.get('目标单位', '')
                                
                                # 特殊处理：如果是区县局民意智感中心，可以看下发给本分局的信件
                                is_district_myzgzx = '民意智感中心' in user_unit_name
                                user_parts = [p.strip() for p in user_unit_name.split('/')]
                                user_prefix = f"{user_parts[0]} / {user_parts[1]}" if len(user_parts) > 1 else user_unit_name
                                
                                if user_unit_name in str(remark) or target == user_unit_name:
                                    filtered_letters.append(letter)
                                    break
                                elif is_district_myzgzx and target == user_prefix:
                                    filtered_letters.append(letter)
                                    break
                    except (json.JSONDecodeError, TypeError):
                        pass

        return filtered_letters

    @staticmethod
    def get_dispatch_letters_for_user(
        user_permission: str,
        user_unit_name: str,
        limit: Optional[int] = None,
        page: int = 1
    ) -> List[Dict]:
        """
        获取下发工作台的信件列表

        Args:
            user_permission: 用户权限级别 (CITY/DISTRICT/OFFICER)
            user_unit_name: 用户单位全称
            limit: 限制数量
            page: 页码

        Returns:
            List[Dict]: 信件列表
        """
        if user_permission == 'CITY':
            result = LetterDBHelper.get_all_letters(
                status='预处理',
                order_by='来信时间',
                order_desc=True,
                limit=limit,
                page=page
            )
            return result['data']
        elif user_permission == 'DISTRICT':
            result = LetterDBHelper.get_all_letters(
                status='市局下发至区县局/支队',
                order_by='来信时间',
                order_desc=True,
                limit=limit,
                page=page,
                user_permission=user_permission,
                user_unit_name=user_unit_name
            )
            return result['data']
        else:
            return []

    @staticmethod
    def get_letter_by_number(letter_number: str) -> Optional[Dict]:
        """
        根据信件编号获取信件详情

        Args:
            letter_number: 信件编号

        Returns:
            Optional[Dict]: 信件详情
        """
        print(f"[get_letter_by_number] 查询信件: {letter_number}")
        result = get("信件表", {"信件编号": [letter_number]})
        print(f"[get_letter_by_number] 查询结果: {result}")
        if result:
            letter = list(result.values())[0]
            print(f"[get_letter_by_number] 返回信件: 序号={letter.get('序号')}, 编号={letter.get('信件编号')}")
            return letter
        return None

    @staticmethod
    def get_letters_by_phone(phone: str, limit: int = 50) -> List[Dict]:
        """
        通过手机号查询信件

        Args:
            phone: 手机号
            limit: 限制数量

        Returns:
            List[Dict]: 信件列表，包含流转记录
        """
        result = get("信件表", {"手机号": [phone]})
        letters = list(result.values())

        # 为每个信件添加流转记录
        for letter in letters:
            letter_number = letter.get('信件编号')
            if letter_number:
                flow_dict = get("流转表", {"信件编号": [letter_number]})
                if flow_dict:
                    flow_data = list(flow_dict.values())[0]
                    flow_records = flow_data.get('流转记录')
                    if flow_records:
                        try:
                            letter['流转记录'] = json.loads(flow_records) if isinstance(flow_records, str) else flow_records
                        except json.JSONDecodeError:
                            letter['流转记录'] = []
                    else:
                        letter['流转记录'] = []
                else:
                    letter['流转记录'] = []

        # 按来信时间降序排序
        letters.sort(key=lambda x: x.get('来信时间') or '', reverse=True)
        return letters[:limit]

    @staticmethod
    def get_letters_by_idcard(idcard: str, limit: int = 50) -> List[Dict]:
        """
        通过身份证号查询信件

        Args:
            idcard: 身份证号
            limit: 限制数量

        Returns:
            List[Dict]: 信件列表，包含流转记录
        """
        result = get("信件表", {"身份证号": [idcard]})
        letters = list(result.values())

        # 为每个信件添加流转记录
        for letter in letters:
            letter_number = letter.get('信件编号')
            if letter_number:
                flow_dict = get("流转表", {"信件编号": [letter_number]})
                if flow_dict:
                    flow_data = list(flow_dict.values())[0]
                    flow_records = flow_data.get('流转记录')
                    if flow_records:
                        try:
                            letter['流转记录'] = json.loads(flow_records) if isinstance(flow_records, str) else flow_records
                        except json.JSONDecodeError:
                            letter['流转记录'] = []
                    else:
                        letter['流转记录'] = []
                else:
                    letter['流转记录'] = []

        letters.sort(key=lambda x: x.get('来信时间') or '', reverse=True)
        return letters[:limit]

    @staticmethod
    def create_letter(data: Dict) -> str:
        """
        创建新信件

        Args:
            data: 信件数据

        Returns:
            str: 新创建的信件编号
        """
        letter_number = data.get('信件编号')

        # 准备信件表数据
        letter_data = {
            '信件编号': letter_number,
            '群众姓名': data.get('群众姓名'),
            '手机号': data.get('手机号'),
            '身份证号': data.get('身份证号'),
            '来信时间': data.get('来信时间'),
            '来信渠道': data.get('来信渠道'),
            '信件一级分类': data.get('信件一级分类'),
            '信件二级分类': data.get('信件二级分类'),
            '信件三级分类': data.get('信件三级分类'),
            '诉求内容': data.get('诉求内容'),
            '专项关注标签': data.get('专项关注标签'),
            '当前信件状态': '预处理',
            '当前信件处理单位': ''
        }

        # 插入信件表
        insert("信件表", letter_data)

        # 插入流转表
        flow_data = {
            '信件编号': letter_number,
            '流转记录': json.dumps([{
                "action": "create",
                "status": "预处理",
                "time": data.get('来信时间')
            }])
        }
        insert("流转表", flow_data)

        return letter_number

    @staticmethod
    def update_letter(letter_number: str, data: Dict) -> bool:
        """
        更新信件信息

        Args:
            letter_number: 信件编号
            data: 更新的数据

        Returns:
            bool: 是否更新成功
        """
        # 获取信件序号
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        row_id = letter.get('序号')
        allowed_fields = [
            '群众姓名', '手机号', '身份证号', '来信渠道',
            '信件一级分类', '信件二级分类', '信件三级分类',
            '诉求内容', '专项关注标签'
        ]

        success = False
        for field, value in data.items():
            if field in allowed_fields and value is not None:
                result = modify("信件表", row_id, field, value)
                if "error" not in result:
                    success = True

        return success

    @staticmethod
    def delete_letter(letter_number: str) -> bool:
        """
        删除信件

        Args:
            letter_number: 信件编号

        Returns:
            bool: 是否删除成功
        """
        # 获取信件序号
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        row_id = letter.get('序号')

        # 删除流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if flow_dict:
            flow_id = list(flow_dict.values())[0].get('序号')
            delete("流转表", flow_id)

        # 删除附件记录
        file_dict = get("文件表", {"信件编号": [letter_number]})
        if file_dict:
            file_id = list(file_dict.values())[0].get('序号')
            delete("文件表", file_id)

        # 删除信件
        result = delete("信件表", row_id)
        return "error" not in result

    @staticmethod
    def update_letter_status(letter_number: str, status: str, flow_record: Dict) -> bool:
        """
        更新信件状态

        Args:
            letter_number: 信件编号
            status: 新状态
            flow_record: 流转记录

        Returns:
            bool: 是否更新成功
        """
        # 获取信件
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        letter_row_id = letter.get('序号')

        # 更新信件表的当前信件状态
        modify("信件表", letter_row_id, "当前信件状态", status)

        # 获取现有流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if not flow_dict:
            return False

        flow_data = list(flow_dict.values())[0]
        flow_row_id = flow_data.get('序号')
        existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

        # 添加新记录
        existing_records.append(flow_record)

        # 更新流转记录
        modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records))

        return True

    @staticmethod
    def get_letter_statistics(
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        unit_name: Optional[str] = None
    ) -> Dict:
        """
        获取信件统计信息

        权限逻辑：
        - 市局民意智感中心：统计所有信件
        - 分县局/支队民意智感中心：统计流转记录中操作后单位属于本单位或下属单位的信件
        - 普通单位：只能看本单位当前处理的信件

        Args:
            start_time: 开始时间
            end_time: 结束时间
            unit_name: 单位全称

        Returns:
            Dict: 统计信息
        """
        # 解析用户的单位层级
        user_parts = [p.strip() for p in unit_name.split('/')] if unit_name else []
        user_level1 = user_parts[0] if len(user_parts) > 0 else ''
        user_level2 = user_parts[1] if len(user_parts) > 1 else ''
        user_level3 = user_parts[2] if len(user_parts) > 2 else ''

        is_city_myzgzx = (user_level1 == '市局' and '民意智感中心' in user_level2)
        is_district_myzgzx = ('民意智感中心' in user_level3)

        # 获取所有信件
        letters_dict = get("信件表", {"ALL": "ALL"})
        letters = list(letters_dict.values())

        # 如果是分县局/支队民意智感中心，需要基于流转记录筛选信件
        if is_district_myzgzx and unit_name:
            # 获取本单位前缀（用于匹配下属单位）
            unit_prefix = f"{user_level1} / {user_level2}"

            # 获取所有流转记录
            flow_dict = get("流转表", {"ALL": "ALL"})

            # 收集操作后单位属于本单位或下属单位的信件编号
            related_letter_numbers = set()

            for flow_data in flow_dict.values():
                letter_number = flow_data.get('信件编号')
                if not letter_number:
                    continue

                flow_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

                for record in flow_records:
                    after_unit = record.get('操作后单位', '')
                    # 如果操作后单位以本单位前缀开头，说明该信件曾流转到本单位或下属单位
                    if after_unit.startswith(unit_prefix) or after_unit == unit_name:
                        related_letter_numbers.add(letter_number)
                        break

            # 筛选信件
            filtered_letters = []
            for letter in letters:
                letter_number = letter.get('信件编号')

                # 时间筛选
                letter_time = str(letter.get('来信时间', ''))
                if start_time and letter_time < start_time:
                    continue
                if end_time and letter_time > end_time:
                    continue

                # 单位权限筛选：只保留在流转记录中出现过本单位或下属单位的信件
                if letter_number in related_letter_numbers:
                    filtered_letters.append(letter)

        else:
            # 市局民意智感中心或普通单位：使用原有逻辑
            filtered_letters = []
            for letter in letters:
                letter_time = str(letter.get('来信时间', ''))
                if start_time and letter_time < start_time:
                    continue
                if end_time and letter_time > end_time:
                    continue

                if unit_name:
                    target_unit = letter.get('当前信件处理单位') or ''

                    # 1. 市局民意智感中心：可看所有
                    if is_city_myzgzx:
                        pass
                    # 2. 普通单位：只能看本单位
                    else:
                        if target_unit != unit_name:
                            continue

                filtered_letters.append(letter)

        # 统计
        total = len(filtered_letters)
        preprocessing = sum(1 for l in filtered_letters if l.get('当前信件状态') == '预处理')
        dispatching = sum(1 for l in filtered_letters if l.get('当前信件状态') == '市局下发至区县局/支队')
        processing = sum(1 for l in filtered_letters if l.get('当前信件状态') == '正在处理')
        feedback = sum(1 for l in filtered_letters if l.get('当前信件状态') == '正在反馈')
        completed = sum(1 for l in filtered_letters if l.get('当前信件状态') == '已办结')

        return {
            '信件总量': total,
            '预处理': preprocessing,
            '市局下发至区县局/支队': dispatching,
            '正在处理': processing,
            '正在反馈': feedback,
            '已办结': completed
        }

    @staticmethod
    def get_attachments(letter_number: str) -> Optional[Dict]:
        """
        获取信件附件

        Args:
            letter_number: 信件编号

        Returns:
            Optional[Dict]: 附件信息
        """
        result = get("文件表", {"信件编号": [letter_number]})
        if result:
            return list(result.values())[0]
        return None

    @staticmethod
    def update_attachments(letter_number: str, attachment_type: str, files: List[Dict]) -> bool:
        """
        更新信件附件

        Args:
            letter_number: 信件编号
            attachment_type: 附件类型
            files: 文件列表

        Returns:
            bool: 是否更新成功
        """
        result = get("文件表", {"信件编号": [letter_number]})

        if result:
            # 更新
            row_id = list(result.values())[0].get('序号')
            modify("文件表", row_id, attachment_type, json.dumps(files))
        else:
            # 插入
            data = {
                '信件编号': letter_number,
                attachment_type: json.dumps(files)
            }
            insert("文件表", data)

        return True

    @staticmethod
    def update_letter_status_with_unit(letter_number: str, status: str, target_unit: str, flow_record: Dict) -> bool:
        """
        更新信件状态、处理单位并添加流转记录
        """
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        letter_row_id = letter.get('序号')
        modify("信件表", letter_row_id, "当前信件状态", status)
        modify("信件表", letter_row_id, "当前信件处理单位", target_unit)

        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if flow_dict:
            flow_data = list(flow_dict.values())[0]
            flow_row_id = flow_data.get('序号')
            existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []
            existing_records.append(flow_record)
            modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records, ensure_ascii=False))

        return True

    @staticmethod
    def get_categories() -> Dict:
        """
        获取信件分类数据

        Returns:
            Dict: 分类数据
        """
        result = get("信件分类表", {"ALL": "ALL"})

        categories = {}
        for row in result.values():
            level1 = row.get('一级分类')
            level2 = row.get('二级分类')
            level3 = row.get('三级分类')

            if level1 not in categories:
                categories[level1] = {}

            if level2 not in categories[level1]:
                categories[level1][level2] = []

            if level3 and level3 not in categories[level1][level2]:
                categories[level1][level2].append(level3)

        return categories

    @staticmethod
    def dispatch_letter(letter_number: str, target_unit: str, flow_record: Dict, new_status: str = "市局下发至区县局/支队") -> bool:
        """
        下发信件

        Args:
            letter_number: 信件编号
            target_unit: 目标单位全称
            flow_record: 流转记录
            new_status: 新的信件状态

        Returns:
            bool: 是否下发成功
        """
        # 获取信件
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        letter_row_id = letter.get('序号')

        # 更新信件状态和处理单位
        modify("信件表", letter_row_id, "当前信件状态", new_status)
        modify("信件表", letter_row_id, "当前信件处理单位", target_unit)

        # 更新流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if not flow_dict:
            return False

        flow_data = list(flow_dict.values())[0]
        flow_row_id = flow_data.get('序号')
        existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

        flow_record['目标单位'] = target_unit
        flow_record['操作时间'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        existing_records.append(flow_record)

        modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records))

        return True

    @staticmethod
    def mark_invalid(letter_number: str, flow_record: Dict) -> bool:
        """
        标记信件为不属实（已办结）

        Args:
            letter_number: 信件编号
            flow_record: 流转记录

        Returns:
            bool: 是否操作成功
        """
        return LetterDBHelper.update_letter_status(letter_number, "已办结", flow_record)

    @staticmethod
    def submit_feedback(letter_number: str, feedback_unit: str, flow_record: Dict) -> bool:
        """
        提交反馈（更新状态为正在反馈，并更新处理单位）
        
        Args:
            letter_number: 信件编号
            feedback_unit: 反馈目标单位（即上一个下发单位）
            flow_record: 流转记录
            
        Returns:
            bool: 是否成功
        """
        return LetterDBHelper.submit_feedback_with_status(letter_number, feedback_unit, "正在反馈", flow_record)

    @staticmethod
    def submit_feedback_with_status(letter_number: str, feedback_unit: str, new_status: str, flow_record: Dict) -> bool:
        """
        提交反馈（更新状态为指定状态，并更新处理单位）
        
        Args:
            letter_number: 信件编号
            feedback_unit: 反馈目标单位（即上一个下发单位）
            new_status: 新的信件状态
            flow_record: 流转记录
            
        Returns:
            bool: 是否成功
        """
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        letter_row_id = letter.get('序号')

        # 更新信件状态和处理单位
        modify("信件表", letter_row_id, "当前信件状态", new_status)
        modify("信件表", letter_row_id, "当前信件处理单位", feedback_unit)

        # 更新流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if not flow_dict:
            return False

        flow_data = list(flow_dict.values())[0]
        flow_row_id = flow_data.get('序号')
        existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

        existing_records.append(flow_record)
        modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records))

        return True

    @staticmethod
    def handle_by_self(letter_number: str, user_unit: str, flow_record: Dict) -> bool:
        """
        由当前用户自行处理信件

        Args:
            letter_number: 信件编号
            user_unit: 用户单位全称
            flow_record: 流转记录

        Returns:
            bool: 是否操作成功
        """
        print(f"[handle_by_self] 开始执行: letter_number={letter_number}, user_unit={user_unit}")
        
        # 获取信件
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            print(f"[handle_by_self] 信件不存在: {letter_number}")
            return False

        letter_row_id = letter.get('序号')
        print(f"[handle_by_self] 信件序号: {letter_row_id}")

        # 更新信件状态和处理单位
        print(f"[handle_by_self] 更新信件状态为: 正在处理")
        result1 = modify("信件表", letter_row_id, "当前信件状态", "正在处理")
        print(f"[handle_by_self] 更新状态结果: {result1}")
        
        print(f"[handle_by_self] 更新处理单位为: {user_unit}")
        result2 = modify("信件表", letter_row_id, "当前信件处理单位", user_unit)
        print(f"[handle_by_self] 更新单位结果: {result2}")

        # 获取现有流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if not flow_dict:
            print(f"[handle_by_self] 流转记录不存在")
            return False

        flow_data = list(flow_dict.values())[0]
        flow_row_id = flow_data.get('序号')
        existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

        # 添加新记录（flow_record 已包含完整的流转信息）
        existing_records.append(flow_record)

        # 更新流转记录
        print(f"[handle_by_self] 更新流转记录")
        result3 = modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records))
        print(f"[handle_by_self] 更新流转记录结果: {result3}")

        return True

    @staticmethod
    def get_processing_letters_for_user(
        user_unit_name: str,
        limit: Optional[int] = None,
        page: int = 1
    ) -> List[Dict]:
        """
        获取处理工作台的信件列表

        筛选条件：
        - 当前信件处理单位 = 用户单位
        - 当前信件状态 = "正在处理"

        Args:
            user_unit_name: 用户单位全称
            limit: 限制数量
            page: 页码

        Returns:
            List[Dict]: 信件列表
        """
        result = LetterDBHelper.get_all_letters(
            status='正在处理',
            order_by='来信时间',
            order_desc=True,
            limit=limit,
            page=page
        )

        # 进一步过滤：只保留当前处理单位严格匹配本单位的信件
        letters = result['data']
        filtered_letters = [
            letter for letter in letters
            if letter.get('当前信件处理单位') == user_unit_name
        ]

        return filtered_letters

    @staticmethod
    def get_audit_letters_for_user(
        user_unit_name: str,
        limit: Optional[int] = None,
        page: int = 1
    ) -> List[Dict]:
        """
        获取核查工作台的信件列表

        筛选条件：
        - 如果是市局民意智感中心：当前信件处理单位包含"民意智感中心"，且状态为"待市局审核"
        - 如果是其他民意智感中心：当前信件处理单位为本单位，且状态为"待分县局/支队审核"

        Args:
            user_unit_name: 用户单位全称
            limit: 限制数量
            page: 页码

        Returns:
            List[Dict]: 信件列表
        """
        user_parts = [p.strip() for p in user_unit_name.split('/')] if user_unit_name else []
        user_level1 = user_parts[0] if len(user_parts) > 0 else ''
        user_level2 = user_parts[1] if len(user_parts) > 1 else ''
        
        is_city_myzgzx = (user_level1 == '市局' and '民意智感中心' in user_level2)

        target_status = '待市局审核' if is_city_myzgzx else '待分县局/支队审核'

        result = LetterDBHelper.get_all_letters(
            status=target_status,
            order_by='来信时间',
            order_desc=True,
            limit=limit,
            page=page
        )

        letters = result['data']
        filtered_letters = []
        for letter in letters:
            target_unit = letter.get('当前信件处理单位') or ''
            if is_city_myzgzx:
                if '民意智感中心' in target_unit:
                    filtered_letters.append(letter)
            else:
                if target_unit == user_unit_name:
                    filtered_letters.append(letter)

        return filtered_letters

    @staticmethod
    def return_letter(letter_number: str, target_unit: str, target_status: str, flow_record: Dict) -> bool:
        """
        退回信件

        Args:
            letter_number: 信件编号
            target_unit: 目标单位
            target_status: 目标状态
            flow_record: 流转记录

        Returns:
            bool: 是否操作成功
        """
        letter = LetterDBHelper.get_letter_by_number(letter_number)
        if not letter:
            return False

        letter_row_id = letter.get('序号')

        # 更新信件状态和处理单位
        modify("信件表", letter_row_id, "当前信件状态", target_status)
        modify("信件表", letter_row_id, "当前信件处理单位", target_unit)

        # 更新流转记录
        flow_dict = get("流转表", {"信件编号": [letter_number]})
        if not flow_dict:
            return False

        flow_data = list(flow_dict.values())[0]
        flow_row_id = flow_data.get('序号')
        existing_records = json.loads(flow_data.get('流转记录', '[]')) if flow_data.get('流转记录') else []

        existing_records.append(flow_record)
        modify("流转表", flow_row_id, "流转记录", json.dumps(existing_records, ensure_ascii=False))

        return True
