"""
初始化公安用户命令

创建默认的市局、区县局、民警账号
"""

from django.core.management.base import BaseCommand
from apps.auth.models import PoliceUser
from apps.auth.backends import PoliceAuthBackend


class Command(BaseCommand):
    """
    初始化公安用户数据
    """
    help = '初始化公安用户（市局、区县局、民警）'

    def handle(self, *args, **options):
        """
        执行命令
        """
        self.stdout.write('开始初始化公安用户...')

        # 默认用户数据
        default_users = [
            {
                'username': 'city_admin',
                'password': 'city123',
                'name': '市局管理员',
                'permission_level': 'CITY',
                'unit_name': '衡水市公安局',
                'unit_code': 'HSGAJ'
            },
            {
                'username': 'district_admin',
                'password': 'district123',
                'name': '区县局管理员',
                'permission_level': 'DISTRICT',
                'unit_name': '桃城区公安分局',
                'unit_code': 'TCQGAJ'
            },
            {
                'username': 'officer_01',
                'password': 'officer123',
                'name': '张警官',
                'permission_level': 'OFFICER',
                'unit_name': '桃城区公安分局河东派出所',
                'unit_code': 'HDPCS'
            }
        ]

        created_count = 0
        for user_data in default_users:
            username = user_data['username']

            # 检查用户是否已存在
            if PoliceUser.objects.filter(username=username).exists():
                self.stdout.write(f'  用户 {username} 已存在，跳过')
                continue

            # 创建用户
            password = user_data.pop('password')
            user = PoliceUser(**user_data)
            user.password = PoliceAuthBackend.hash_password(password)
            user.save()

            created_count += 1
            self.stdout.write(
                f'  创建用户: {username} ({user_data["name"]}) - {user_data["permission_level"]}'
            )

        self.stdout.write(f'\n完成！共创建 {created_count} 个用户')
        self.stdout.write('\n默认账号密码：')
        self.stdout.write('  市局: city_admin / city123')
        self.stdout.write('  区县局: district_admin / district123')
        self.stdout.write('  民警: officer_01 / officer123')
