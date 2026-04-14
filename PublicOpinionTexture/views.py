"""
主视图模块

处理民意质感系统的主界面请求
"""

from django.shortcuts import render

def login(request):
    """
    登录页面视图

    渲染民意智感中心管理后台登录页面

    Args:
        request: Django HTTP 请求对象

    Returns:
        HttpResponse: 渲染后的登录页面 HTML
    """
    return render(request, 'login/login.html')

