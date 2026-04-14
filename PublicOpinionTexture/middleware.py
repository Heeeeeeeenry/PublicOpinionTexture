"""
自定义中间件模块

用于处理请求和响应的自定义中间件
"""


class IPLoggingMiddleware:
    """
    IP 地址日志中间件

    在终端显示每个请求的客户端 IP 地址和请求信息
    便于调试和监控访问来源
    """

    def __init__(self, get_response):
        """
        初始化中间件

        Args:
            get_response: 获取响应的回调函数
        """
        self.get_response = get_response

    def __call__(self, request):
        """
        处理每个请求

        在终端打印客户端 IP 地址、请求方法和路径

        Args:
            request: Django HTTP 请求对象

        Returns:
            HttpResponse: 响应对象
        """
        # 获取客户端 IP 地址
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')

        # 在终端打印请求信息
        print(f"[IP日志] {ip} - {request.method} {request.path}")

        # 继续处理请求
        response = self.get_response(request)

        return response
