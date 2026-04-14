"""
URL configuration for PublicOpinionTexture project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    # 默认页面 - 登录页
    path('', views.login, name='login'),

    # 各应用路由
    path('api/config/', include('apps.config.urls')),
    path('api/letter/', include('apps.letter.urls')),
    path('api/llm/', include('apps.llm.urls')),
    path('api/auth/', include('apps.auth.urls')),
    path('api/setting/', include('apps.setting.urls')),
    path('api/tool/', include('apps.tool.urls')),
    path('workplace/', include('apps.workplace.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
