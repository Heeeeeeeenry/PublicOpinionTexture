"""
设置应用 URL 配置

处理设置相关的 API 路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.setting_api, name='setting_api'),
]
