"""
自定义认证后端

实现基于 PoliceUser 的认证系统
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from django.conf import settings
from .models import PoliceUser, UserSession


class PoliceAuthBackend:
    """
    公安用户认证后端
    
    替代 Django 内置认证，使用 PoliceUser 模型
    """
    
    @staticmethod
    def authenticate(police_number, password):
        """
        验证警号和密码

        Args:
            police_number: 警号
            password: 密码

        Returns:
            PoliceUser: 验证成功返回用户对象，失败返回 None
        """
        try:
            user = PoliceUser.objects.get(police_number=police_number, is_active=True)

            # 验证密码（使用简单的 SHA256 哈希）
            password_hash = hashlib.sha256(password.encode()).hexdigest()

            if user.password == password_hash:
                # 更新最后登录时间
                user.last_login = datetime.now()
                user.save(update_fields=['last_login'])
                return user

        except PoliceUser.DoesNotExist:
            pass

        return None
    
    @staticmethod
    def create_session(user, remember_me=False):
        """
        创建用户会话
        
        Args:
            user: PoliceUser 对象
            remember_me: 是否记住登录状态
            
        Returns:
            str: 会话密钥
        """
        # 生成会话密钥
        session_key = secrets.token_urlsafe(32)
        
        # 计算过期时间
        if remember_me:
            expires_at = datetime.now() + timedelta(days=30)
        else:
            expires_at = datetime.now() + timedelta(hours=8)
        
        # 创建会话记录
        UserSession.objects.create(
            user=user,
            session_key=session_key,
            expires_at=expires_at
        )
        
        return session_key
    
    @staticmethod
    def get_user_from_session(session_key):
        """
        从会话密钥获取用户
        
        Args:
            session_key: 会话密钥
            
        Returns:
            PoliceUser: 用户对象，会话无效返回 None
        """
        try:
            session = UserSession.objects.get(
                session_key=session_key,
                expires_at__gt=datetime.now()
            )
            
            # 检查用户是否激活
            if session.user.is_active:
                return session.user
            
        except UserSession.DoesNotExist:
            pass
        
        return None
    
    @staticmethod
    def destroy_session(session_key):
        """
        销毁会话
        
        Args:
            session_key: 会话密钥
        """
        UserSession.objects.filter(session_key=session_key).delete()
    
    @staticmethod
    def hash_password(password):
        """
        哈希密码
        
        Args:
            password: 明文密码
            
        Returns:
            str: 哈希后的密码
        """
        return hashlib.sha256(password.encode()).hexdigest()


class PermissionChecker:
    """
    权限检查器
    
    用于检查用户权限的装饰器和工具函数
    """
    
    PERMISSION_HIERARCHY = {
        'OFFICER': 1,
        'DISTRICT': 2,
        'CITY': 3
    }
    
    @classmethod
    def check_permission(cls, user, required_level):
        """
        检查用户是否满足权限级别要求
        
        Args:
            user: PoliceUser 对象
            required_level: 要求的权限级别 ('OFFICER', 'DISTRICT', 'CITY')
            
        Returns:
            bool: 是否有权限
        """
        if not user or not user.is_active:
            return False
        
        user_level = cls.PERMISSION_HIERARCHY.get(user.permission_level, 0)
        required = cls.PERMISSION_HIERARCHY.get(required_level, 999)
        
        return user_level >= required
    
    @classmethod
    def is_city_level(cls, user):
        """是否市局级别"""
        return cls.check_permission(user, 'CITY')
    
    @classmethod
    def is_district_level(cls, user):
        """是否区县局级别"""
        return cls.check_permission(user, 'DISTRICT')
    
    @classmethod
    def is_officer(cls, user):
        """是否民警级别"""
        return cls.check_permission(user, 'OFFICER')
