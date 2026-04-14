"""
日期时间工具模块

提供日期时间计算、工作日计算、节假日查询等功能
"""

import datetime
from typing import List, Tuple, Optional
from chinese_calendar import is_workday, is_holiday


class DateTimeUtils:
    """日期时间工具类"""

    @staticmethod
    def parse_datetime(datetime_str: str) -> Optional[datetime.datetime]:
        """
        解析日期时间字符串
        支持格式：YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS
        """
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
        ]
        for fmt in formats:
            try:
                return datetime.datetime.strptime(datetime_str, fmt)
            except ValueError:
                continue
        return None

    @staticmethod
    def format_datetime(dt: datetime.datetime, fmt: str = '%Y-%m-%d %H:%M:%S') -> str:
        """格式化日期时间"""
        return dt.strftime(fmt)

    @staticmethod
    def calculate_time_diff(start_time: str, end_time: str) -> dict:
        """
        计算两个日期时间的时间差

        Args:
            start_time: 开始时间字符串
            end_time: 结束时间字符串

        Returns:
            dict: 包含总秒数、天数、小时数、分钟数、秒数
        """
        start = DateTimeUtils.parse_datetime(start_time)
        end = DateTimeUtils.parse_datetime(end_time)

        if not start or not end:
            raise ValueError("日期时间格式错误，支持的格式：YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS")

        diff = end - start
        total_seconds = int(diff.total_seconds())

        return {
            'total_seconds': total_seconds,
            'total_days': diff.days,
            'hours': total_seconds // 3600,
            'minutes': total_seconds // 60,
            'seconds': total_seconds,
            'detail': {
                'days': diff.days,
                'hours': (total_seconds % 86400) // 3600,
                'minutes': (total_seconds % 3600) // 60,
                'seconds': total_seconds % 60,
            },
            'start_time': DateTimeUtils.format_datetime(start),
            'end_time': DateTimeUtils.format_datetime(end),
        }

    @staticmethod
    def add_time(base_time: str, days: int = 0, hours: int = 0, minutes: int = 0, seconds: int = 0) -> str:
        """
        日期时间加减运算

        Args:
            base_time: 基础时间字符串
            days: 天数（可为负数）
            hours: 小时数（可为负数）
            minutes: 分钟数（可为负数）
            seconds: 秒数（可为负数）

        Returns:
            str: 计算后的时间字符串
        """
        base = DateTimeUtils.parse_datetime(base_time)
        if not base:
            raise ValueError("日期时间格式错误")

        delta = datetime.timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
        result = base + delta
        return DateTimeUtils.format_datetime(result)

    @staticmethod
    def is_holiday(date_str: str) -> dict:
        """
        查询某天是否为节假日

        Args:
            date_str: 日期字符串（YYYY-MM-DD）

        Returns:
            dict: 包含是否为节假日、是否为工作日、节假日名称（如果有）
        """
        try:
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("日期格式错误，应为：YYYY-MM-DD")

        # 检查年份是否在支持范围内（2004-2024）
        year = date_obj.year
        if year < 2004 or year > 2024:
            # 超出范围时，仅基于周末判断
            is_weekend = date_obj.weekday() >= 5
            return {
                'date': date_str,
                'is_holiday': is_weekend,
                'is_workday': not is_weekend,
                'holiday_name': None,
                'note': f'年份 {year} 超出支持范围（2004-2024），仅基于周末判断',
                'year_supported': False,
            }

        try:
            holiday = is_holiday(date_obj)
            workday = is_workday(date_obj)

            # 尝试获取节假日名称（chinesecalendar 不直接提供，这里简化处理）
            holiday_name = None
            if holiday:
                holiday_name = DateTimeUtils._get_holiday_name(date_obj)

            return {
                'date': date_str,
                'is_holiday': holiday,
                'is_workday': workday,
                'holiday_name': holiday_name,
                'note': None,
                'year_supported': True,
            }
        except Exception as e:
            # 如果 chinesecalendar 报错，回退到周末判断
            is_weekend = date_obj.weekday() >= 5
            return {
                'date': date_str,
                'is_holiday': is_weekend,
                'is_workday': not is_weekend,
                'holiday_name': None,
                'note': f'查询失败：{str(e)}',
                'year_supported': False,
            }

    @staticmethod
    def _get_holiday_name(date_obj: datetime.date) -> Optional[str]:
        """获取节假日名称（简化版）"""
        month_day = (date_obj.month, date_obj.day)

        # 固定日期节假日
        fixed_holidays = {
            (1, 1): '元旦',
            (5, 1): '劳动节',
            (10, 1): '国庆节',
            (10, 2): '国庆节',
            (10, 3): '国庆节',
        }

        if month_day in fixed_holidays:
            return fixed_holidays[month_day]

        return '节假日'

    @staticmethod
    def calculate_workdays(start_date: str, end_date: str, skip_holidays: bool = True) -> dict:
        """
        计算两个日期之间的工作日天数

        Args:
            start_date: 开始日期（YYYY-MM-DD）
            end_date: 结束日期（YYYY-MM-DD）
            skip_holidays: 是否跳过节假日（True=只算工作日，False=算所有天）

        Returns:
            dict: 包含工作日天数、总天数、节假日天数等
        """
        try:
            start = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            raise ValueError("日期格式错误，应为：YYYY-MM-DD")

        if start > end:
            raise ValueError("开始日期不能晚于结束日期")

        total_days = (end - start).days + 1
        workdays = 0
        holidays = 0
        weekend_days = 0
        holiday_dates = []
        weekend_dates = []

        current = start
        while current <= end:
            is_weekend = current.weekday() >= 5

            if skip_holidays:
                # 需要跳过节假日
                year = current.year
                if 2004 <= year <= 2024:
                    try:
                        if is_workday(current):
                            workdays += 1
                        else:
                            holidays += 1
                            if is_weekend:
                                weekend_days += 1
                                weekend_dates.append(current.strftime('%Y-%m-%d'))
                            else:
                                holiday_dates.append(current.strftime('%Y-%m-%d'))
                    except:
                        # 如果查询失败，回退到周末判断
                        if is_weekend:
                            weekend_days += 1
                            weekend_dates.append(current.strftime('%Y-%m-%d'))
                        else:
                            workdays += 1
                else:
                    # 超出支持范围，仅基于周末判断
                    if is_weekend:
                        weekend_days += 1
                        weekend_dates.append(current.strftime('%Y-%m-%d'))
                    else:
                        workdays += 1
            else:
                # 不跳过节假日，所有天都算上
                workdays += 1
                if is_weekend:
                    weekend_days += 1
                    weekend_dates.append(current.strftime('%Y-%m-%d'))

            current += datetime.timedelta(days=1)

        return {
            'start_date': start_date,
            'end_date': end_date,
            'skip_holidays': skip_holidays,
            'total_days': total_days,
            'workdays': workdays,
            'holidays': holidays,
            'weekend_days': weekend_days,
            'holiday_dates': holiday_dates,
            'weekend_dates': weekend_dates,
        }

    @staticmethod
    def add_workdays(base_date: str, workdays: int, skip_holidays: bool = True) -> dict:
        """
        日期加上指定工作日天数，支持带时间的字符串，返回结果也会带上原来的时间
        """
        base_dt = DateTimeUtils.parse_datetime(base_date)
        if not base_dt:
            raise ValueError("日期格式错误，支持的格式：YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS")
            
        base = base_dt.date()
        time_part = base_dt.time()

        if workdays == 0:
            return {
                'base_date': base_date,
                'target_date': base_date,
                'result_date': base_date,
                'workdays_added': 0,
                'actual_days': 0,
            }

        direction = 1 if workdays > 0 else -1
        remaining = abs(workdays)
        current = base
        actual_days = 0

        while remaining > 0:
            current += datetime.timedelta(days=direction)
            actual_days += 1

            if skip_holidays:
                year = current.year
                if 2004 <= year <= 2024:
                    try:
                        if is_workday(current):
                            remaining -= 1
                    except:
                        # 查询失败时，仅排除周末
                        if current.weekday() < 5:
                            remaining -= 1
                else:
                    # 超出支持范围，仅排除周末
                    if current.weekday() < 5:
                        remaining -= 1
            else:
                remaining -= 1

        target_dt = datetime.datetime.combine(current, time_part)
        
        return {
            'base_date': base_date,
            'target_date': current.strftime('%Y-%m-%d'),
            'result_date': target_dt.strftime('%Y-%m-%d %H:%M:%S') if len(base_date) > 10 else current.strftime('%Y-%m-%d'),
            'workdays_added': workdays,
            'actual_days': actual_days * direction,
        }

    @staticmethod
    def get_month_calendar(year: int, month: int) -> List[dict]:
        """
        获取某月的日历信息，包含每天是否为工作日

        Args:
            year: 年份
            month: 月份

        Returns:
            List[dict]: 每天的详细信息
        """
        import calendar

        cal = calendar.Calendar()
        month_days = cal.monthdayscalendar(year, month)

        result = []
        for week in month_days:
            week_data = []
            for day in week:
                if day == 0:
                    week_data.append(None)
                else:
                    date_obj = datetime.date(year, month, day)
                    date_str = date_obj.strftime('%Y-%m-%d')

                    # 查询是否为工作日
                    if 2004 <= year <= 2024:
                        try:
                            workday = is_workday(date_obj)
                            holiday = is_holiday(date_obj)
                        except:
                            workday = date_obj.weekday() < 5
                            holiday = date_obj.weekday() >= 5
                    else:
                        workday = date_obj.weekday() < 5
                        holiday = date_obj.weekday() >= 5

                    week_data.append({
                        'date': date_str,
                        'day': day,
                        'weekday': date_obj.weekday(),
                        'is_workday': workday,
                        'is_holiday': holiday,
                    })
            result.append(week_data)

        return result
