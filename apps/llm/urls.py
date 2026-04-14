"""
LLM 应用 URL 配置

处理大模型相关的 API 路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.llm_api, name='llm_api'),
]
