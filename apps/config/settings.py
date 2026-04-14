"""
系统配置模块

所有配置信息硬编码在此模块中，按功能模块化组织
"""


class DatabaseConfig:
    """
    数据库配置
    """

    HOST = "localhost"
    PORT = 53306
    NAME = "pot_data"
    USER = "pot"
    PASSWORD = "000001"


class LLMConfig:
    """
    大模型配置
    """

    # DeepSeek API 配置
    DEEPSEEK_API_KEY = "sk-d0cd677143b045e1b65600d6ace3f8ec"
    DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
    DEEPSEEK_MODEL = "deepseek-chat"

    # 默认参数
    DEFAULT_TEMPERATURE = 0.7
    DEFAULT_MAX_TOKENS = None  # None 表示不限制最大 token 数


# 便捷访问方式
LLM = LLMConfig
DB = DatabaseConfig
