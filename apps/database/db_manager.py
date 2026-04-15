"""
数据库管理模块

提供 MySQL 数据库连接池和执行 SQL 命令的功能
其他模块可以通过调用 exec 方法执行数据库操作

使用 DBUtils 连接池管理数据库连接，提供：
- 线程安全的连接获取和归还
- 自动连接健康检查
- 连接使用情况实时输出

时区说明：
- 所有时间字段均采用上海时区（Asia/Shanghai，UTC+8）
- 数据库服务器时区设置为上海时区
- 时间存储格式统一为：YYYY-MM-DD HH:MM:SS
- 涉及时间计算时，需确保使用上海时区进行转换

时间字段处理：
- 输入：外界使用字符串格式(YYYY-MM-DD HH:MM:SS)，自动转为datetime存入数据库
- 输出：数据库datetime类型自动转为字符串格式返回
"""

import threading
import time
import inspect
import pymysql
from pymysql.cursors import DictCursor
from datetime import datetime
from dbutils.pooled_db import PooledDB
from apps.config.settings import DB


def _convert_datetime_to_str(value):
    """
    将datetime对象转换为字符串

    Args:
        value: 可能是datetime对象或其他类型

    Returns:
        字符串格式的日期时间，或原值
    """
    if isinstance(value, datetime):
        return value.strftime('%Y-%m-%d %H:%M:%S')
    return value


def _convert_str_to_datetime(value):
    """
    将字符串转换为datetime对象

    Args:
        value: 可能是字符串或其他类型

    Returns:
        datetime对象，或原值
    """
    if isinstance(value, str):
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d %H:%M',
            '%Y/%m/%d',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return value


def _process_row_datetime(row, to_str=True):
    """
    处理一行数据中的datetime字段

    Args:
        row: 字典形式的数据行
        to_str: True表示转为字符串，False表示转为datetime

    Returns:
        处理后的数据行
    """
    if not isinstance(row, dict):
        return row

    convert_func = _convert_datetime_to_str if to_str else _convert_str_to_datetime

    for key, value in row.items():
        if isinstance(value, datetime):
            row[key] = convert_func(value)
        elif isinstance(value, str) and not to_str:
            if any(keyword in key for keyword in ['时间', '日期', 'time', 'date', 'created', 'updated', 'login']):
                row[key] = convert_func(value)

    return row


class DatabaseManager:
    """
    数据库管理类

    使用 DBUtils 连接池管理 MySQL 数据库连接
    提供线程安全的 SQL 执行接口
    """

    def __init__(self):
        """
        初始化数据库管理器

        创建连接池
        """
        self.host = DB.HOST
        self.port = DB.PORT
        self.user = DB.USER
        self.password = DB.PASSWORD
        self.database = DB.NAME
        self.charset = 'utf8mb4'
        
        self._pool = None
        self._lock = threading.Lock()
        
        self._init_pool()

    def _init_pool(self):
        """
        初始化数据库连接池

        使用 DBUtils PooledDB 创建连接池
        - 初始创建10个连接
        - 最大连接数20个
        - 最大空闲连接15个
        """
        self._pool = PooledDB(
            creator=pymysql,
            maxconnections=20,
            mincached=10,
            maxcached=15,
            maxusage=0,
            blocking=True,
            host=self.host,
            port=self.port,
            user=self.user,
            passwd=self.password,
            db=self.database,
            charset=self.charset,
            cursorclass=DictCursor,
            init_command="SET SESSION time_zone = '+8:00'",
            connect_timeout=10,
            read_timeout=30,
            write_timeout=30
        )
        print("[DatabaseManager] 连接池初始化完成，初始连接数: 10")

    def _get_caller_info(self):
        """
        获取调用者信息

        Returns:
            str: 调用者的模块名和函数名
        """
        try:
            stack = inspect.stack()
            for frame_info in stack[2:]:
                frame = frame_info.frame
                module = frame.f_globals.get('__name__', '')
                if not module.startswith('apps.database'):
                    func_name = frame.f_code.co_name
                    return f"{module}.{func_name}"
            return "unknown"
        except Exception:
            return "unknown"

    def _get_pool_status(self):
        """
        获取连接池状态

        Returns:
            tuple: (总连接数, 使用中, 空闲)
        """
        idle_count = 0
        used_count = 0
        total_count = 0
        
        try:
            if hasattr(self._pool, '_idle_cache'):
                idle_cache = self._pool._idle_cache
                if isinstance(idle_cache, (list, tuple, dict)):
                    idle_count = len(idle_cache)
                elif isinstance(idle_cache, int):
                    idle_count = idle_cache
            
            if hasattr(self._pool, '_used'):
                used = self._pool._used
                if isinstance(used, (list, tuple, dict)):
                    used_count = len(used)
                elif isinstance(used, int):
                    used_count = used
            
            if hasattr(self._pool, '_connections'):
                conns = self._pool._connections
                if isinstance(conns, (list, tuple, dict)):
                    total_count = len(conns)
                elif isinstance(conns, int):
                    total_count = conns
            
            if total_count == 0:
                total_count = idle_count + used_count
        except Exception:
            pass
        
        return total_count, used_count, idle_count

    def _print_connection_event(self, event, caller):
        """
        输出连接事件

        Args:
            event: 事件类型 ('取出' 或 '归还')
            caller: 调用者信息
        """
        total, used, idle = self._get_pool_status()
        print(f"[连接池] {event} | 调用者: {caller} | 总连接: {total} | 使用中: {used} | 空闲: {idle}")

    def get_pool_status(self):
        """
        获取连接池状态信息

        Returns:
            dict: 包含连接池状态信息
        """
        if self._pool is None:
            return {"error": "连接池未初始化"}
        
        total, used, idle = self._get_pool_status()
        
        return {
            "total": total,
            "used": used,
            "idle": idle,
            "available": idle
        }

    def exec(self, sql, params=None, fetch=True, retry_count=0):
        """
        执行 SQL 命令

        从连接池获取连接，执行 SQL 语句，然后归还连接

        Args:
            sql (str): 要执行的 SQL 语句
            params (tuple/list/dict, optional): SQL 参数，用于参数化查询
            fetch (bool): 是否获取查询结果，默认为 True
            retry_count (int): 内部重试计数，外部调用无需传入

        Returns:
            list/dict/int:
                - SELECT 查询: 返回结果列表，每个元素是字典形式的记录
                - INSERT/UPDATE/DELETE: 返回受影响的行数
                - 查询失败: 抛出异常

        Raises:
            pymysql.Error: 数据库操作错误

        Example:
            results = db.exec("SELECT * FROM users WHERE id = %s", (1,))
            db.exec("INSERT INTO users (name, age) VALUES (%s, %s)", ("张三", 25), fetch=False)
        """
        connection = None
        cursor = None
        caller = self._get_caller_info()

        try:
            connection = self._pool.connection()
            self._print_connection_event("取出", caller)
            cursor = connection.cursor()

            processed_params = params
            if params:
                if isinstance(params, dict):
                    processed_params = {k: _convert_str_to_datetime(v) for k, v in params.items()}
                elif isinstance(params, (list, tuple)):
                    processed_params = tuple(_convert_str_to_datetime(v) for v in params)

            cursor.execute(sql, processed_params)

            if fetch and sql.strip().upper().startswith('SELECT'):
                results = cursor.fetchall()
                processed_results = []
                for row in results:
                    processed_row = _process_row_datetime(row.copy(), to_str=True)
                    processed_results.append(processed_row)
                return processed_results
            else:
                connection.commit()
                return cursor.rowcount

        except pymysql.OperationalError as e:
            error_code = e.args[0] if e.args else None
            if error_code in (2006, 2013, 2014) and retry_count < 3:
                print(f"[DatabaseManager] 连接错误({error_code})，正在重试({retry_count + 1}/3)...")
                if cursor:
                    try:
                        cursor.close()
                    except Exception:
                        pass
                if connection:
                    try:
                        connection.close()
                        self._print_connection_event("归还", caller)
                    except Exception:
                        pass
                time.sleep(1)
                return self.exec(sql, params, fetch, retry_count + 1)
            else:
                print(f"[DatabaseManager] 数据库连接失败，已重试{retry_count}次")
                raise
        except Exception as e:
            if retry_count < 3:
                print(f"[DatabaseManager] 数据库错误，正在重试({retry_count + 1}/3)... 错误: {e}")
                if cursor:
                    try:
                        cursor.close()
                    except Exception:
                        pass
                if connection:
                    try:
                        connection.close()
                        self._print_connection_event("归还", caller)
                    except Exception:
                        pass
                time.sleep(1)
                return self.exec(sql, params, fetch, retry_count + 1)
            else:
                print(f"[DatabaseManager] 数据库操作失败，已重试{retry_count}次")
                raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if connection:
                try:
                    connection.close()
                    self._print_connection_event("归还", caller)
                except Exception:
                    pass

    def exec_many(self, sql, params_list):
        """
        批量执行 SQL 命令

        用于批量插入或更新数据

        Args:
            sql (str): 要执行的 SQL 语句
            params_list (list): 参数列表，每个元素是一个参数元组

        Returns:
            int: 受影响的行数

        Example:
            users = [("张三", 25), ("李四", 30), ("王五", 28)]
            db.exec_many("INSERT INTO users (name, age) VALUES (%s, %s)", users)
        """
        connection = None
        cursor = None
        caller = self._get_caller_info()

        try:
            connection = self._pool.connection()
            self._print_connection_event("取出", caller)
            cursor = connection.cursor()
            cursor.executemany(sql, params_list)
            connection.commit()
            return cursor.rowcount
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if connection:
                try:
                    connection.close()
                    self._print_connection_event("归还", caller)
                except Exception:
                    pass

    def close(self):
        """
        关闭数据库连接池

        释放所有数据库连接资源
        """
        if self._pool:
            try:
                self._pool.close()
            except Exception:
                pass
        print("[DatabaseManager] 连接池已关闭")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


db_manager = DatabaseManager()
db = db_manager


def exec(sql, params=None, fetch=True):
    """
    全局 exec 函数

    提供便捷的数据库执行接口，其他模块可直接调用

    Args:
        sql (str): 要执行的 SQL 语句
        params (tuple/list/dict, optional): SQL 参数
        fetch (bool): 是否获取查询结果

    Returns:
        list/dict/int: 查询结果或受影响的行数

    Example:
        from apps.database.db_manager import exec
        users = exec("SELECT * FROM users WHERE age > %s", (18,))
        exec("INSERT INTO users (name) VALUES (%s)", ("张三",), fetch=False)
    """
    return db_manager.exec(sql, params, fetch)


def exec_many(sql, params_list):
    """
    全局批量执行函数

    提供便捷的批量数据库操作接口

    Args:
        sql (str): 要执行的 SQL 语句
        params_list (list): 参数列表，每个元素是一个参数元组

    Returns:
        int: 受影响的行数

    Example:
        from apps.database.db_manager import exec_many
        users = [("张三", 25), ("李四", 30), ("王五", 28)]
        exec_many("INSERT INTO users (name, age) VALUES (%s, %s)", users)
    """
    return db_manager.exec_many(sql, params_list)


def exec_transaction(sql_statements):
    """
    事务执行多条 SQL 语句

    将多条 SQL 语句作为一个事务执行，要么全部成功，要么全部回滚

    Args:
        sql_statements (list): SQL 语句列表，每个元素可以是:
            - str: 纯 SQL 语句
            - tuple: (sql, params) 参数化查询

    Returns:
        list: 每条语句的执行结果列表

    Raises:
        pymysql.Error: 事务执行失败时回滚并抛出异常

    Example:
        from apps.database.db_manager import exec_transaction
        statements = [
            ("INSERT INTO accounts (user_id, balance) VALUES (%s, %s)", (1, 1000)),
            ("UPDATE accounts SET balance = balance - %s WHERE user_id = %s", (100, 1)),
        ]
        results = exec_transaction(statements)
    """
    connection = None
    cursor = None
    results = []
    caller = db_manager._get_caller_info()

    try:
        connection = db_manager._pool.connection()
        db_manager._print_connection_event("取出", caller)
        cursor = connection.cursor()

        for statement in sql_statements:
            if isinstance(statement, tuple):
                sql, params = statement
                cursor.execute(sql, params)
            else:
                cursor.execute(statement)

            if cursor.description:
                results.append(cursor.fetchall())
            else:
                results.append(cursor.rowcount)

        connection.commit()
        return results

    except Exception:
        if connection:
            connection.rollback()
        raise
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if connection:
            try:
                connection.close()
                db_manager._print_connection_event("归还", caller)
            except Exception:
                pass


def exec_script(sql_script):
    """
    执行 SQL 脚本

    执行包含多条 SQL 语句的脚本，语句之间用分号分隔

    Args:
        sql_script (str): SQL 脚本内容

    Returns:
        list: 每条语句的执行结果列表

    Example:
        from apps.database.db_manager import exec_script
        script = '''
            CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, name VARCHAR(50));
            INSERT INTO users VALUES (1, '张三');
        '''
        results = exec_script(script)
    """
    statements = [s.strip() for s in sql_script.split(';') if s.strip()]
    return exec_transaction(statements)


def exec_batch(sql_list):
    """
    批量执行独立 SQL 语句

    顺序执行多条独立的 SQL 语句，每条语句单独提交

    Args:
        sql_list (list): SQL 语句列表，每个元素可以是:
            - str: 纯 SQL 语句
            - tuple: (sql, params, fetch) 完整参数

    Returns:
        list: 每条语句的执行结果列表

    Example:
        from apps.database.db_manager import exec_batch
        statements = [
            "INSERT INTO logs (message) VALUES ('开始处理')",
            ("UPDATE users SET status = %s WHERE id = %s", ('active', 1), False),
        ]
        results = exec_batch(statements)
    """
    results = []

    for item in sql_list:
        if isinstance(item, tuple):
            if len(item) == 2:
                sql, params = item
                fetch_flag = True
            else:
                sql, params, fetch_flag = item
            results.append(exec(sql, params, fetch_flag))
        else:
            results.append(exec(item))

    return results


def get(table_name, match_dict):
    """
    通用查询方法

    根据匹配字典查询指定表的数据

    Args:
        table_name (str): 表名
        match_dict (dict): 匹配字典
            - {"ALL": "ALL"}: 返回所有数据
            - {"字段名": ["值1", "值2"]}: 返回字段匹配任一值的行
            - {"字段1": ["值"], "字段2": ["值"]}: 多字段AND条件

    Returns:
        dict: 查询结果，key为数据表中的序号，value为行数据字典

    Example:
        from apps.database.db_manager import get
        all_data = get("信件表", {"ALL": "ALL"})
        result = get("信件表", {"来信渠道": ["局长信箱", "12345"]})
    """
    structure_sql = """
        SELECT COLUMN_NAME as Field 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
    """
    try:
        structure = exec(structure_sql, (table_name,))
        valid_fields = {row.get('Field') or row.get('field') or row.get('COLUMN_NAME') or row.get('column_name') for row in structure}
    except Exception:
        valid_fields = set()

    where_conditions = []
    params = []

    if match_dict == {"ALL": "ALL"}:
        pass
    else:
        for field, values in match_dict.items():
            if field not in valid_fields:
                continue
            if not isinstance(values, list):
                values = [values]
            if len(values) == 1:
                where_conditions.append(f"`{field}` = %s")
                params.append(values[0])
            else:
                placeholders = ', '.join(['%s'] * len(values))
                where_conditions.append(f"`{field}` IN ({placeholders})")
                params.extend(values)

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    sql = f"SELECT * FROM `{table_name}` {where_clause}"

    results = exec(sql, params if params else None)

    result_dict = {}
    for row in results:
        key = row.get('序号', row.get('id'))
        if key is not None:
            result_dict[key] = row

    return result_dict


def modify(table_name, row_id, field, new_value):
    """
    通用修改方法

    修改指定表中指定行的某个字段值

    Args:
        table_name (str): 表名
        row_id: 序号（主键值）
        field (str): 要修改的字段名
        new_value: 新的字段值

    Returns:
        dict: 包含修改前和修改后的整行信息

    Example:
        from apps.database.db_manager import modify
        result = modify("信件表", 1, "当前信件状态", "已处理")
    """
    select_sql = "SELECT * FROM `%s` WHERE `序号` = %%s" % table_name
    before_data = exec(select_sql, (row_id,))

    if not before_data:
        return {"error": f"未找到表 {table_name} 中序号为 {row_id} 的记录"}

    before_row = before_data[0]

    update_sql = "UPDATE `%s` SET `%s` = %%s WHERE `序号` = %%s" % (table_name, field)
    exec(update_sql, (new_value, row_id), fetch=False)

    after_data = exec(select_sql, (row_id,))
    after_row = after_data[0] if after_data else None

    return {
        "before": before_row,
        "after": after_row
    }


def delete(table_name, row_id):
    """
    通用删除方法

    删除指定表中指定行的数据

    Args:
        table_name (str): 表名
        row_id: 序号（主键值）

    Returns:
        dict: 被删除的行数据

    Example:
        from apps.database.db_manager import delete
        deleted = delete("信件表", 1)
    """
    select_sql = "SELECT * FROM `%s` WHERE `序号` = %%s" % table_name
    before_data = exec(select_sql, (row_id,))

    if not before_data:
        return {"error": f"未找到表 {table_name} 中序号为 {row_id} 的记录"}

    deleted_row = before_data[0]

    delete_sql = "DELETE FROM `%s` WHERE `序号` = %%s" % table_name
    exec(delete_sql, (row_id,), fetch=False)

    return deleted_row


def insert(table_name, content):
    """
    通用插入方法

    向指定表插入一行数据

    Args:
        table_name (str): 表名
        content (dict): 包含各字段内容的字典

    Returns:
        dict: 插入结果

    Example:
        from apps.database.db_manager import insert
        result = insert("信件表", {"信件编号": "XJ20240101001", "群众姓名": "张三"})
    """
    structure_sql = "DESCRIBE %s" % table_name
    try:
        structure = exec(structure_sql)
        valid_fields = {row['Field'] for row in structure}
    except Exception as e:
        return {"error": f"获取表结构失败: {str(e)}"}

    invalid_fields = [f for f in content.keys() if f not in valid_fields]
    if invalid_fields:
        return {"error": f"无效的字段: {', '.join(invalid_fields)}"}

    if not content:
        return {"error": "内容不能为空"}

    fields = list(content.keys())
    placeholders = ', '.join(['%s'] * len(fields))
    field_names = ', '.join([f"`{f}`" for f in fields])

    sql = f"INSERT INTO `{table_name}` ({field_names}) VALUES ({placeholders})"

    try:
        exec(sql, tuple(content.values()), fetch=False)

        last_id_sql = "SELECT LAST_INSERT_ID() as id"
        last_id_result = exec(last_id_sql)
        inserted_id = last_id_result[0]['id'] if last_id_result else None

        return {
            "success": True,
            "inserted_id": inserted_id
        }
    except Exception as e:
        return {"error": f"插入失败: {str(e)}"}
