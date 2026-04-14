"""
LLM 应用视图模块

处理大模型相关的 API 请求，包括聊天接口
直接实现 DeepSeek API 调用，不依赖外部客户端模块
"""

import json
import urllib.request
from typing import List, Dict, Generator
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.config.settings import LLM
from apps.database.db_manager import db


def _get_prompt_from_db(prompt_type: str) -> str:
    """
    从数据库获取提示词

    Args:
        prompt_type: 提示词类型（如：群众提示词、信件提示词、基础提示词）

    Returns:
        str: 提示词内容，如果不存在则返回空字符串
    """
    try:
        results = db.exec("SELECT 内容 FROM 提示词 WHERE 类型 = %s", [prompt_type], fetch=True)
        if results:
            return results[0]['内容']
        return ""
    except Exception as e:
        print(f"[_get_prompt_from_db] 读取提示词失败: {e}")
        return ""


def _chat_with_api(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> str:
    """
    调用 DeepSeek API 进行非流式聊天

    Args:
        messages: 消息列表
        temperature: 温度参数
        max_tokens: 最大令牌数

    Returns:
        str: 模型回复内容
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LLM.DEEPSEEK_API_KEY}"
    }

    data = {
        "model": LLM.DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False
    }
    if max_tokens is not None:
        data["max_tokens"] = max_tokens

    req = urllib.request.Request(
        LLM.DEEPSEEK_API_URL,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=60) as response:
        result = json.loads(response.read().decode('utf-8'))
        return result.get("choices", [{}])[0].get("message", {}).get("content", "")


def _chat_stream_with_api(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> Generator[str, None, None]:
    """
    调用 DeepSeek API 进行流式聊天

    Args:
        messages: 消息列表
        temperature: 温度参数
        max_tokens: 最大令牌数

    Yields:
        str: 每次生成的文本片段
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LLM.DEEPSEEK_API_KEY}"
    }

    data = {
        "model": LLM.DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": True
    }
    if max_tokens is not None:
        data["max_tokens"] = max_tokens

    req = urllib.request.Request(
        LLM.DEEPSEEK_API_URL,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=60) as response:
        for line in response:
            line = line.decode('utf-8').strip()
            if line.startswith('data: '):
                json_str = line[6:]
                if json_str == '[DONE]':
                    break
                try:
                    chunk = json.loads(json_str)
                    delta = chunk.get('choices', [{}])[0].get('delta', {})
                    content = delta.get('content', '')
                    if content:
                        yield content
                except json.JSONDecodeError:
                    continue


@csrf_exempt
@require_http_methods(["POST"])
def llm_api(request):
    """
    LLM 统一 API 接口

    所有大模型相关操作通过此接口处理，通过 order 参数区分具体操作

    Args:
        request: Django HTTP 请求对象
            - order: 操作命令
            - args: 操作参数
                - messages: 聊天列表(聊天历史、用户消息由前端组装)
                - temperature: 温度参数（可选）
                - max_tokens: 最大令牌数参数（可选，默认 0.3)

    Returns:
        JsonResponse 或 StreamingHttpResponse: 操作结果

    支持的命令:
        - chat: 普通聊天，返回完整回复
        - chat_stream: 流式聊天，返回 SSE 流式响应
        - get_prompt: 获取提示词，根据类型返回数据库中的提示词内容

    示例请求:
        POST /api/llm/
        {
            "order": "chat",
            "args": {
                "messages": [{"role": "user", "content": "你好"}],
            }
        }
    """
    try:
        data = json.loads(request.body)
        order = data.get('order', '')
        args = data.get('args', {})
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '无效的 JSON 数据'
        }, status=400)

    if order == 'chat':
        messages = args.get('messages', [])
        temperature = args.get('temperature', LLM.DEFAULT_TEMPERATURE)
        max_tokens = args.get('max_tokens', LLM.DEFAULT_MAX_TOKENS)

        if not messages:
            return JsonResponse({
                'success': False,
                'error': '消息列表不能为空'
            }, status=400)
        return _handle_chat(messages, temperature, max_tokens)

    elif order == 'chat_stream':
        messages = args.get('messages', [])
        temperature = args.get('temperature', LLM.DEFAULT_TEMPERATURE)
        max_tokens = args.get('max_tokens', LLM.DEFAULT_MAX_TOKENS)

        if not messages:
            return JsonResponse({
                'success': False,
                'error': '消息列表不能为空'
            }, status=400)
        return _handle_chat_stream(messages, temperature, max_tokens)

    elif order == 'get_prompt':
        prompt_type = args.get('type', '')
        return _handle_get_prompt(prompt_type)

    else:
        return JsonResponse({
            'success': False,
            'error': f'未知的操作命令: {order}'
        }, status=400)


def _handle_chat(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> JsonResponse:
    """
    处理普通聊天请求

    Args:
        messages: 消息列表
        temperature: 温度参数
        max_tokens: 最大令牌数

    Returns:
        JsonResponse: 大模型的回复内容
    """
    try:
        response = _chat_with_api(messages, temperature, max_tokens)
        return JsonResponse({
            'success': True,
            'message': response
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def _handle_chat_stream(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> StreamingHttpResponse:
    """
    处理流式聊天请求

    Args:
        messages: 消息列表
        temperature: 温度参数
        max_tokens: 最大令牌数

    Returns:
        StreamingHttpResponse: SSE 流式响应
    """
    def generate():
        try:
            for chunk in _chat_stream_with_api(messages, temperature, max_tokens):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(
        generate(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


def _handle_get_prompt(prompt_type: str) -> JsonResponse:
    """
    处理获取提示词请求

    Args:
        prompt_type: 提示词类型（如：群众提示词、信件提示词、基础提示词、单位提示词）

    Returns:
        JsonResponse: 提示词内容
    """
    if not prompt_type:
        return JsonResponse({
            'success': False,
            'error': '提示词类型不能为空'
        }, status=400)

    if prompt_type == '单位级别提示词':
        prompt_content = build_units_prompt()
        if not prompt_content:
            return JsonResponse({
                'success': False,
                'error': '构建单位提示词失败'
            }, status=500)
        return JsonResponse({
            'success': True,
            'data': {
                'type': prompt_type,
                'content': prompt_content
            }
        })

    if prompt_type == '信件分类提示词':
        prompt_content = build_letters_category_prompt()
        if not prompt_content:
            return JsonResponse({
                'success': False,
                'error': '构建信件分类提示词失败'
            }, status=500)
        return JsonResponse({
            'success': True,
            'data': {
                'type': prompt_type,
                'content': prompt_content
            }
        })

    if prompt_type == '专项关注提示词':
        prompt_content = build_special_focus_prompt()
        if not prompt_content:
            return JsonResponse({
                'success': False,
                'error': '构建专项关注提示词失败'
            }, status=500)
        return JsonResponse({
            'success': True,
            'data': {
                'type': prompt_type,
                'content': prompt_content
            }
        })

    prompt_content = _get_prompt_from_db(prompt_type)

    if not prompt_content:
        return JsonResponse({
            'success': False,
            'error': f'未找到类型为 "{prompt_type}" 的提示词'
        }, status=404)

    return JsonResponse({
        'success': True,
        'data': {
            'type': prompt_type,
            'content': prompt_content
        }
    })


def build_units_prompt():
    """
    从数据库读取单位信息，构建单位提示词

    Returns:
        str: 单位提示词
    """
    try:
        units = db.exec("SELECT 一级, 二级, 三级 FROM 单位 ORDER BY 一级, 二级, 三级", fetch=True)

        if not units:
            return ""

        prompt_parts = ["\n\n以下是衡水市公安局的单位组织架构，在处理信件时请参考：\n"]

        current_level1 = None
        current_level2 = None

        for unit in units:
            level1 = unit['一级']
            level2 = unit['二级']
            level3 = unit['三级']

            if level1 != current_level1:
                prompt_parts.append(f"\n【{level1}】")
                current_level1 = level1
                current_level2 = None

            if level3:
                if level2 != current_level2:
                    prompt_parts.append(f"  - {level2}：")
                    current_level2 = level2
                prompt_parts.append(f"    - {level3}")
            else:
                prompt_parts.append(f"  - {level2}")

        prompt_parts.append("\n\n在处理涉及具体单位的信件时，请根据以上组织架构选择合适的处理单位。")

        return "\n".join(prompt_parts)

    except Exception as e:
        print(f"[build_units_prompt] 读取单位信息失败: {e}")
        return ""


def build_letters_category_prompt():
    """
    从数据库读取信件分类信息，构建信件分类提示词

    Returns:
        str: 信件分类提示词
    """
    try:
        categories = db.exec("""
            SELECT 一级分类, 二级分类, GROUP_CONCAT(三级分类 SEPARATOR '、') as 三级分类列表
            FROM 信件分类表
            GROUP BY 一级分类, 二级分类
            ORDER BY MIN(序号)
        """, fetch=True)

        if not categories:
            return ""

        prompt_parts = ["信件的一级、二级、三级分类体系如下：\n"]

        current_level1 = None

        for category in categories:
            level1 = category['一级分类']
            level2 = category['二级分类']
            level3_list = category['三级分类列表']

            if level1 != current_level1:
                prompt_parts.append(f"\n【一级分类：{level1}】")
                current_level1 = level1

            prompt_parts.append(f"  - 【二级分类】{level2}：【三级分类】{level3_list}")

        return "\n".join(prompt_parts)

    except Exception as e:
        print(f"[build_letters_category_prompt] 读取信件分类信息失败: {e}")
        return ""


def build_special_focus_prompt():
    """
    从数据库读取专项关注信息，构建专项关注提示词

    Returns:
        str: 专项关注提示词
    """
    try:
        focus_items = db.exec("""
            SELECT 专项关注标题, 描述
            FROM 专项关注表
            ORDER BY 创建时间 DESC
        """, fetch=True)

        if not focus_items:
            return ""

        prompt_parts = ["\n\n以下是当前上级或专项行动关注的议题标签：\n"]
        if len(focus_items) == 0:
            prompt_parts.append("暂无专项关注标签。")
        else:
            for item in focus_items:
                title = item['专项关注标题']
                description = item['描述'] or '无详细说明'
                prompt_parts.append(f"\n【{title}】")
                prompt_parts.append(f"  说明：{description}")

        prompt_parts.append("\n\n")

        return "\n".join(prompt_parts)

    except Exception as e:
        print(f"[build_special_focus_prompt] 读取专项关注信息失败: {e}")
        return ""
