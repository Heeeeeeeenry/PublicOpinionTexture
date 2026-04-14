"""
后台管理视图模块

处理后台管理页面的渲染
"""

from django.shortcuts import render
from django.http import HttpResponseNotFound

from apps.auth.views import get_current_user


def require_auth(view_func):
    """
    自定义认证装饰器
    
    使用 PoliceAuthBackend 检查用户是否已登录
    """
    def wrapper(request, *args, **kwargs):
        user = get_current_user(request)
        if not user:
            return HttpResponseNotFound('未登录')
        request.current_user = user
        return view_func(request, *args, **kwargs)
    return wrapper


@require_auth
def workplace(request):
    """
    工作台首页视图

    渲染后台管理首页，需要用户登录才能访问

    Args:
        request: Django HTTP 请求对象

    Returns:
        HttpResponse: 渲染后的管理首页 HTML
    """
    return render(request, 'workplace/workplace.html')


@require_auth
def page_template(request, page_name):
    """
    页面模板 API

    返回指定页面的 HTML 模板内容，用于前端动态加载

    Args:
        request: Django HTTP 请求对象
        page_name: 页面名称，对应 templates/workplace/ 下的文件夹名

    Returns:
        HttpResponse: 页面的 HTML 内容

    支持的页面:
        - home: 首页
        - dispatch: 下发工作台
        - letters: 信件管理台
        - category: 分类管理台
    """
    valid_pages = ['home', 'dispatch', 'processing', 'letters', 'category', 'users', 'organization', 'special-focus']

    if page_name not in valid_pages:
        return HttpResponseNotFound('页面不存在')

    template_path = f'workplace/{page_name}/{page_name}.html'
    return render(request, template_path)
