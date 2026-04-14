"""
信件应用 URL 配置

处理信件相关的 API 路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.letter_api, name='letter_api'),
]
