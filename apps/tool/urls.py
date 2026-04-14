"""
Tool 应用 URL 配置
"""

from django.urls import path
from . import views

urlpatterns = [
    # 独立接口
    path('time_diff/', views.TimeDiffView.as_view(), name='time_diff'),
    path('time_add/', views.TimeAddView.as_view(), name='time_add'),
    path('holiday_check/', views.HolidayCheckView.as_view(), name='holiday_check'),
    path('workdays_calculate/', views.WorkdaysCalculateView.as_view(), name='workdays_calculate'),
    path('workdays_add/', views.WorkdaysAddView.as_view(), name='workdays_add'),
    path('month_calendar/', views.MonthCalendarView.as_view(), name='month_calendar'),

    # 统一分发接口
    path('', views.ToolDispatchView.as_view(), name='tool_dispatch'),
]
