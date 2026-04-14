from django.apps import AppConfig


class PoliceAuthConfig(AppConfig):
    """
    公安认证应用配置
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.auth'
    label = 'police_auth'  # 使用唯一的标签，避免与 django.contrib.auth 冲突
    verbose_name = '公安认证'
