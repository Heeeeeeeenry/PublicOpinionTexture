"""
后台管理应用 URL 配置

处理后台管理页面的路由
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.workplace, name='workplace'),
    path('template/<str:page_name>/', views.page_template, name='page_template'),
]
