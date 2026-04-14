"""
信件应用模型

定义信件、流转记录、附件等模型
"""

from django.db import models


class Letter(models.Model):
    """
    信件模型

    对应数据库中的信件表
    """
    序号 = models.AutoField(primary_key=True, db_column='序号')
    信件编号 = models.CharField('信件编号', max_length=100, unique=True, db_column='信件编号')
    群众姓名 = models.CharField('群众姓名', max_length=50, db_column='群众姓名')
    手机号 = models.CharField('手机号', max_length=20, blank=True, null=True, db_column='手机号')
    身份证号 = models.CharField('身份证号', max_length=18, blank=True, null=True, db_column='身份证号')
    来信时间 = models.DateTimeField('来信时间', db_column='来信时间')
    来信渠道 = models.CharField('来信渠道', max_length=50, db_column='来信渠道')
    信件一级分类 = models.CharField('信件一级分类', max_length=50, db_column='信件一级分类')
    信件二级分类 = models.CharField('信件二级分类', max_length=50, db_column='信件二级分类')
    信件三级分类 = models.CharField('信件三级分类', max_length=50, db_column='信件三级分类')
    诉求内容 = models.TextField('诉求内容', db_column='诉求内容')
    专项关注标签 = models.JSONField('专项关注标签', blank=True, null=True, db_column='专项关注标签')
    当前信件处理单位 = models.CharField('当前信件处理单位', max_length=100, blank=True, null=True, db_column='当前信件处理单位')
    当前信件状态 = models.CharField('当前信件状态', max_length=100, blank=True, null=True, db_column='当前信件状态')

    class Meta:
        db_table = '信件表'
        managed = False  # 不管理此表，由外部维护
        verbose_name = '信件'
        verbose_name_plural = '信件'

    def __str__(self):
        return f"{self.信件编号} - {self.群众姓名}"

    def to_dict(self):
        """转换为字典格式"""
        return {
            '序号': self.序号,
            '信件编号': self.信件编号,
            '群众姓名': self.群众姓名,
            '手机号': self.手机号,
            '身份证号': self.身份证号,
            '来信时间': self.来信时间.strftime('%Y-%m-%d %H:%M:%S') if self.来信时间 else None,
            '来信渠道': self.来信渠道,
            '信件一级分类': self.信件一级分类,
            '信件二级分类': self.信件二级分类,
            '信件三级分类': self.信件三级分类,
            '诉求内容': self.诉求内容,
            '专项关注标签': self.专项关注标签,
            '当前信件处理单位': self.当前信件处理单位,
            '当前信件状态': self.当前信件状态
        }


class LetterFlow(models.Model):
    """
    信件流转记录模型

    对应数据库中的流转表
    """
    序号 = models.AutoField(primary_key=True, db_column='序号')
    信件编号 = models.CharField('信件编号', max_length=100, db_index=True, db_column='信件编号')
    流转记录 = models.JSONField('流转记录', db_column='流转记录')
    创建时间 = models.DateTimeField('创建时间', auto_now_add=True, db_column='创建时间')
    更新时间 = models.DateTimeField('更新时间', auto_now=True, db_column='更新时间')

    class Meta:
        db_table = '流转表'
        managed = False  # 不管理此表，由外部维护
        verbose_name = '流转记录'
        verbose_name_plural = '流转记录'

    def __str__(self):
        return f"{self.信件编号} 的流转记录"

    def to_dict(self):
        """转换为字典格式"""
        return {
            '序号': self.序号,
            '信件编号': self.信件编号,
            '流转记录': self.流转记录,
            '创建时间': self.创建时间.strftime('%Y-%m-%d %H:%M:%S') if self.创建时间 else None,
            '更新时间': self.更新时间.strftime('%Y-%m-%d %H:%M:%S') if self.更新时间 else None
        }


class LetterAttachment(models.Model):
    """
    信件附件模型

    对应数据库中的文件表
    """
    序号 = models.AutoField(primary_key=True, db_column='序号')
    信件编号 = models.CharField('信件编号', max_length=100, unique=True, db_column='信件编号')
    市局下发附件 = models.JSONField('市局下发附件', blank=True, null=True, db_column='市局下发附件')
    区县局下发附件 = models.JSONField('区县局下发附件', blank=True, null=True, db_column='区县局下发附件')
    办案单位反馈附件 = models.JSONField('办案单位反馈附件', blank=True, null=True, db_column='办案单位反馈附件')
    区县局反馈附件 = models.JSONField('区县局反馈附件', blank=True, null=True, db_column='区县局反馈附件')
    通话录音附件 = models.JSONField('通话录音附件', blank=True, null=True, db_column='通话录音附件')
    创建时间 = models.DateTimeField('创建时间', auto_now_add=True, db_column='创建时间')
    更新时间 = models.DateTimeField('更新时间', auto_now=True, db_column='更新时间')

    class Meta:
        db_table = '文件表'
        managed = False  # 不管理此表，由外部维护
        verbose_name = '附件'
        verbose_name_plural = '附件'

    def __str__(self):
        return f"{self.信件编号} 的附件"

    def to_dict(self):
        """转换为字典格式"""
        return {
            '序号': self.序号,
            '信件编号': self.信件编号,
            '市局下发附件': self.市局下发附件,
            '区县局下发附件': self.区县局下发附件,
            '办案单位反馈附件': self.办案单位反馈附件,
            '区县局反馈附件': self.区县局反馈附件,
            '通话录音附件': self.通话录音附件,
            '创建时间': self.创建时间.strftime('%Y-%m-%d %H:%M:%S') if self.创建时间 else None,
            '更新时间': self.更新时间.strftime('%Y-%m-%d %H:%M:%S') if self.更新时间 else None
        }


class Feedback(models.Model):
    """
    反馈模型

    对应数据库中的反馈表

    反馈信息字段格式：
    [
        {
            "用户姓名": "",
            "警号": "",
            "单位": "",
            "信息": "",
            "时间": ""
        },
        ...
    ]
    """
    序号 = models.AutoField(primary_key=True, db_column='序号')
    信件编号 = models.CharField('信件编号', max_length=100, db_index=True, db_column='信件编号')
    反馈信息 = models.JSONField('反馈信息', db_column='反馈信息')
    创建时间 = models.DateTimeField('创建时间', auto_now_add=True, db_column='创建时间')
    更新时间 = models.DateTimeField('更新时间', auto_now=True, db_column='更新时间')

    class Meta:
        db_table = '反馈表'
        managed = False
        verbose_name = '反馈'
        verbose_name_plural = '反馈'

    def __str__(self):
        return f"{self.信件编号} 的反馈"

    def to_dict(self):
        """转换为字典格式"""
        return {
            '序号': self.序号,
            '信件编号': self.信件编号,
            '反馈信息': self.反馈信息,
            '创建时间': self.创建时间.strftime('%Y-%m-%d %H:%M:%S') if self.创建时间 else None,
            '更新时间': self.更新时间.strftime('%Y-%m-%d %H:%M:%S') if self.更新时间 else None
        }
