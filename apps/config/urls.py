"""
配置应用 URL 配置

处理配置相关的 API 路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.config_api, name='config_api'),
]
