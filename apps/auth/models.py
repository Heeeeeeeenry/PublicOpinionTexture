"""
自定义用户模型和权限管理

定义三种权限级别：
- 市局 (CITY): 市级管理员，拥有最高权限
- 区县局/支队 (DISTRICT): 区县级管理员/支队，管理本区县/支队
- 民警 (OFFICER): 基层民警，处理具体信件
"""

from django.db import models


class Unit(models.Model):
    """
    单位模型

    对应数据库中的单位表
    """
    id = models.AutoField(primary_key=True)
    level_1 = models.CharField('一级', max_length=100, db_column='一级')
    level_2 = models.CharField('二级', max_length=100, db_column='二级')
    level_3 = models.CharField('三级', max_length=100, db_column='三级', blank=True, null=True)
    system_code = models.CharField('系统编码', max_length=100, db_column='系统编码', unique=True)

    class Meta:
        db_table = '单位'
        managed = False  # 不管理此表，由外部维护
        verbose_name = '单位'
        verbose_name_plural = '单位'

    def __str__(self):
        return self.level_3 or self.level_2

    @property
    def name(self):
        """单位名称（三级或二级）"""
        return self.level_3 or self.level_2

    @property
    def parent_level(self):
        """上级单位（二级）"""
        return self.level_2


class PoliceUser(models.Model):
    """
    公安用户模型
    
    替代 Django 内置 User 模型，支持三级权限体系
    包含完整的用户信息：姓名、昵称、手机号、警号、单位、画像等
    """
    
    # 权限级别定义
    PERMISSION_CHOICES = [
        ('CITY', '市局'),           # 市级管理员
        ('DISTRICT', '区县局/支队'),     # 区县级管理员/支队
        ('OFFICER', '民警'),        # 基层民警
    ]
    
    # 基本信息
    password = models.CharField('密码', max_length=128)

    # 个人信息
    name = models.CharField('姓名', max_length=50)
    nickname = models.CharField('昵称', max_length=50, blank=True)
    police_number = models.CharField('警号', max_length=20, unique=True)
    
    # 联系方式
    phone = models.CharField('手机号码', max_length=20, blank=True)

    # 单位信息 - 直接存储单位全称
    unit_name = models.CharField('单位全称', max_length=255, blank=True, db_index=True, db_column='unit_name')
    
    # 权限级别
    permission_level = models.CharField(
        '权限级别', 
        max_length=20, 
        choices=PERMISSION_CHOICES,
        default='OFFICER'
    )
    
    # 状态
    is_active = models.BooleanField('是否激活', default=True)
    
    # 时间戳
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    last_login = models.DateTimeField('最后登录时间', null=True, blank=True)
    
    class Meta:
        db_table = 'police_users'
        verbose_name = '公安用户'
        verbose_name_plural = '公安用户'
    
    def __str__(self):
        return f"{self.name} ({self.get_permission_level_display()})"

    def get_unit(self):
        """
        根据单位全称获取单位信息

        Returns:
            Unit: 单位对象，未找到返回 None
        """
        if self.unit_name:
            try:
                # 解析单位全称获取各级名称
                parts = [p.strip() for p in self.unit_name.split('/')]
                level_1 = parts[0] if len(parts) > 0 else ''
                level_2 = parts[1] if len(parts) > 1 else ''
                level_3 = parts[2] if len(parts) > 2 else ''
                
                # 根据各级名称查询单位
                if level_3:
                    return Unit.objects.get(level_1=level_1, level_2=level_2, level_3=level_3)
                elif level_2:
                    return Unit.objects.get(level_1=level_1, level_2=level_2, level_3__isnull=True)
                else:
                    return Unit.objects.get(level_1=level_1, level_2__isnull=True, level_3__isnull=True)
            except Unit.DoesNotExist:
                pass
        return None

    def is_city_level(self):
        """是否市局权限"""
        return self.permission_level == 'CITY'
    
    def is_district_level(self):
        """是否区县局/支队权限"""
        return self.permission_level == 'DISTRICT'
    
    def is_officer(self):
        """是否民警权限"""
        return self.permission_level == 'OFFICER'
    
    def get_full_unit_path(self):
        """
        获取完整单位路径

        Returns:
            str: 如 "分局 / 桃城分局 / 民意智感中心"
        """
        if self.unit_name:
            return self.unit_name
        return '未分配单位'
    
    def get_permissions(self):
        """
        获取用户权限列表
        
        Returns:
            list: 权限代码列表
        """
        permissions = []
        
        if self.is_officer():
            permissions = ['view_letters', 'process_letters', 'view_statistics']
        
        if self.is_district_level():
            permissions = [
                'view_letters', 'process_letters', 'view_statistics',
                'manage_officers', 'audit_letters', 'export_reports'
            ]
        
        if self.is_city_level():
            permissions = [
                'view_letters', 'process_letters', 'view_statistics',
                'manage_officers', 'audit_letters', 'export_reports',
                'manage_districts', 'system_settings', 'user_management'
            ]
        
        return permissions
    
    def has_permission(self, permission_code):
        """
        检查是否有特定权限
        
        Args:
            permission_code: 权限代码
            
        Returns:
            bool: 是否有权限
        """
        return permission_code in self.get_permissions()
    
    def to_dict(self):
        """
        转换为字典格式

        Returns:
            dict: 用户信息字典
        """
        return {
            'id': self.id,
            'police_number': self.police_number,
            'name': self.name,
            'nickname': self.nickname,
            'phone': self.phone,
            'unit': {
                'name': self.unit_name,
                'full_path': self.get_full_unit_path()
            },
            'permission_level': self.permission_level,
            'permission_name': self.get_permission_level_display(),
            'permissions': self.get_permissions(),
            'is_active': self.is_active,
            'last_login': self.last_login.strftime('%Y-%m-%d %H:%M:%S') if self.last_login else None
        }


class UserSession(models.Model):
    """
    用户会话模型
    
    用于管理用户登录会话
    """
    
    user = models.ForeignKey(PoliceUser, on_delete=models.CASCADE, verbose_name='用户')
    session_key = models.CharField('会话密钥', max_length=64, unique=True)
    ip_address = models.CharField('IP地址', max_length=45, blank=True)
    user_agent = models.TextField('用户代理', blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    expires_at = models.DateTimeField('过期时间')
    
    class Meta:
        db_table = 'user_sessions'
        verbose_name = '用户会话'
        verbose_name_plural = '用户会话'
