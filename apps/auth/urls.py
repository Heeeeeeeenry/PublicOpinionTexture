"""
认证应用 URL 配置

处理用户认证相关的 API 路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.auth_api, name='auth_api'),
]
