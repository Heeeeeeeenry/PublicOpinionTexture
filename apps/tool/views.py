"""
Tool 应用视图模块

提供日期时间计算相关的 API 接口
采用统一接口格式：
{
    "success": True/False,
    "data": {...},      # 成功时返回的数据
    "error": "..."      # 失败时的错误信息
}
"""

import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .utils import DateTimeUtils


@method_decorator(csrf_exempt, name='dispatch')
class BaseToolView(View):
    """工具视图基类，统一接口格式"""

    def success_response(self, data):
        """成功响应"""
        return JsonResponse({
            'success': True,
            'data': data,
            'error': None
        })

    def error_response(self, message, status=400):
        """错误响应"""
        return JsonResponse({
            'success': False,
            'data': None,
            'error': message
        }, status=status)

    def parse_request_body(self, request):
        """解析请求体"""
        try:
            if request.body:
                return json.loads(request.body)
            return {}
        except json.JSONDecodeError:
            return {}


class TimeDiffView(BaseToolView):
    """
    计算时间差接口

    POST /api/tool/time_diff/
    {
        "start_time": "2024-01-01 08:00:00",
        "end_time": "2024-01-02 18:00:00"
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if not start_time or not end_time:
            return self.error_response('缺少必要参数：start_time 和 end_time')

        try:
            result = DateTimeUtils.calculate_time_diff(start_time, end_time)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)


class TimeAddView(BaseToolView):
    """
    日期时间加减接口

    POST /api/tool/time_add/
    {
        "base_time": "2024-01-01 12:00:00",
        "days": 1,
        "hours": 2,
        "minutes": 30,
        "seconds": 0
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        base_time = data.get('base_time')

        if not base_time:
            return self.error_response('缺少必要参数：base_time')

        days = data.get('days', 0)
        hours = data.get('hours', 0)
        minutes = data.get('minutes', 0)
        seconds = data.get('seconds', 0)

        try:
            result = DateTimeUtils.add_time(base_time, days, hours, minutes, seconds)
            return self.success_response({
                'base_time': base_time,
                'result_time': result,
                'added': {
                    'days': days,
                    'hours': hours,
                    'minutes': minutes,
                    'seconds': seconds
                }
            })
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)


class HolidayCheckView(BaseToolView):
    """
    查询某天是否为节假日接口

    POST /api/tool/holiday_check/
    {
        "date": "2024-10-01"
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        date_str = data.get('date')

        if not date_str:
            return self.error_response('缺少必要参数：date')

        try:
            result = DateTimeUtils.is_holiday(date_str)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'查询失败：{str(e)}', 500)


class WorkdaysCalculateView(BaseToolView):
    """
    计算工作日天数接口

    POST /api/tool/workdays_calculate/
    {
        "start_date": "2024-01-01",
        "end_date": "2024-01-31",
        "skip_holidays": true
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        skip_holidays = data.get('skip_holidays', True)

        if not start_date or not end_date:
            return self.error_response('缺少必要参数：start_date 和 end_date')

        try:
            result = DateTimeUtils.calculate_workdays(start_date, end_date, skip_holidays)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)


class WorkdaysAddView(BaseToolView):
    """
    日期加上指定工作日天数接口

    POST /api/tool/workdays_add/
    {
        "base_date": "2024-01-01",
        "workdays": 10,
        "skip_holidays": true
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        base_date = data.get('base_date')
        workdays = data.get('workdays')
        skip_holidays = data.get('skip_holidays', True)

        if not base_date or workdays is None:
            return self.error_response('缺少必要参数：base_date 和 workdays')

        try:
            workdays = int(workdays)
        except (TypeError, ValueError):
            return self.error_response('workdays 必须是整数')

        try:
            result = DateTimeUtils.add_workdays(base_date, workdays, skip_holidays)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)


class MonthCalendarView(BaseToolView):
    """
    获取某月日历信息接口

    POST /api/tool/month_calendar/
    {
        "year": 2024,
        "month": 10
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        year = data.get('year')
        month = data.get('month')

        if year is None or month is None:
            return self.error_response('缺少必要参数：year 和 month')

        try:
            year = int(year)
            month = int(month)
        except (TypeError, ValueError):
            return self.error_response('year 和 month 必须是整数')

        if not (1 <= month <= 12):
            return self.error_response('month 必须在 1-12 之间')

        try:
            result = DateTimeUtils.get_month_calendar(year, month)
            return self.success_response({
                'year': year,
                'month': month,
                'calendar': result
            })
        except Exception as e:
            return self.error_response(f'获取日历失败：{str(e)}', 500)


class ToolDispatchView(BaseToolView):
    """
    工具接口统一分发视图

    POST /api/tool/
    {
        "order": "time_diff",
        "args": {
            "start_time": "2024-01-01",
            "end_time": "2024-01-02"
        }
    }
    """

    def post(self, request):
        data = self.parse_request_body(request)
        order = data.get('order')
        args = data.get('args', {})

        if not order:
            return self.error_response('缺少必要参数：order')

        # 根据 order 分发到不同的处理方法
        handlers = {
            'time_diff': self.handle_time_diff,
            'time_add': self.handle_time_add,
            'holiday_check': self.handle_holiday_check,
            'workdays_calculate': self.handle_workdays_calculate,
            'workdays_add': self.handle_workdays_add,
            'month_calendar': self.handle_month_calendar,
        }

        handler = handlers.get(order)
        if not handler:
            return self.error_response(f'未知的 order：{order}')

        return handler(args)

    def handle_time_diff(self, args):
        """处理时间差计算"""
        start_time = args.get('start_time')
        end_time = args.get('end_time')

        if not start_time or not end_time:
            return self.error_response('缺少必要参数：start_time 和 end_time')

        try:
            result = DateTimeUtils.calculate_time_diff(start_time, end_time)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)

    def handle_time_add(self, args):
        """处理时间加减"""
        base_time = args.get('base_time')
        if not base_time:
            return self.error_response('缺少必要参数：base_time')

        days = args.get('days', 0)
        hours = args.get('hours', 0)
        minutes = args.get('minutes', 0)
        seconds = args.get('seconds', 0)

        try:
            result = DateTimeUtils.add_time(base_time, days, hours, minutes, seconds)
            return self.success_response({
                'base_time': base_time,
                'result_time': result,
                'added': {
                    'days': days,
                    'hours': hours,
                    'minutes': minutes,
                    'seconds': seconds
                }
            })
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)

    def handle_holiday_check(self, args):
        """处理节假日查询"""
        date_str = args.get('date')
        if not date_str:
            return self.error_response('缺少必要参数：date')

        try:
            result = DateTimeUtils.is_holiday(date_str)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'查询失败：{str(e)}', 500)

    def handle_workdays_calculate(self, args):
        """处理工作日计算"""
        start_date = args.get('start_date')
        end_date = args.get('end_date')
        skip_holidays = args.get('skip_holidays', True)

        if not start_date or not end_date:
            return self.error_response('缺少必要参数：start_date 和 end_date')

        try:
            result = DateTimeUtils.calculate_workdays(start_date, end_date, skip_holidays)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)

    def handle_workdays_add(self, args):
        """处理工作日加减"""
        base_date = args.get('base_date')
        workdays = args.get('workdays')
        skip_holidays = args.get('skip_holidays', True)

        if not base_date or workdays is None:
            return self.error_response('缺少必要参数：base_date 和 workdays')

        try:
            workdays = int(workdays)
        except (TypeError, ValueError):
            return self.error_response('workdays 必须是整数')

        try:
            result = DateTimeUtils.add_workdays(base_date, workdays, skip_holidays)
            return self.success_response(result)
        except ValueError as e:
            return self.error_response(str(e))
        except Exception as e:
            return self.error_response(f'计算失败：{str(e)}', 500)

    def handle_month_calendar(self, args):
        """处理月历查询"""
        year = args.get('year')
        month = args.get('month')

        if year is None or month is None:
            return self.error_response('缺少必要参数：year 和 month')

        try:
            year = int(year)
            month = int(month)
        except (TypeError, ValueError):
            return self.error_response('year 和 month 必须是整数')

        if not (1 <= month <= 12):
            return self.error_response('month 必须在 1-12 之间')

        try:
            result = DateTimeUtils.get_month_calendar(year, month)
            return self.success_response({
                'year': year,
                'month': month,
                'calendar': result
            })
        except Exception as e:
            return self.error_response(f'获取日历失败：{str(e)}', 500)
