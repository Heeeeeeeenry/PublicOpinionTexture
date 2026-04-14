#!/usr/bin/env python3
"""
将JSON数据导入到本地MySQL数据库
"""
import pymysql
import json
import os

# 本地数据库连接配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 53306,
    'user': 'pot',
    'password': '000001',
    'database': 'pot_data',
    'charset': 'utf8mb4'
}

# 表结构定义
TABLE_SCHEMAS = {
    'auth_group': """
        CREATE TABLE IF NOT EXISTS auth_group (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'auth_group_permissions': """
        CREATE TABLE IF NOT EXISTS auth_group_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            permission_id INT NOT NULL,
            UNIQUE KEY unique_group_permission (group_id, permission_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'auth_permission': """
        CREATE TABLE IF NOT EXISTS auth_permission (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            content_type_id INT NOT NULL,
            codename VARCHAR(100) NOT NULL,
            UNIQUE KEY unique_content_type_codename (content_type_id, codename)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'auth_user': """
        CREATE TABLE IF NOT EXISTS auth_user (
            id INT AUTO_INCREMENT PRIMARY KEY,
            password VARCHAR(128) NOT NULL,
            last_login DATETIME NULL,
            is_superuser TINYINT(1) NOT NULL DEFAULT 0,
            username VARCHAR(150) NOT NULL UNIQUE,
            first_name VARCHAR(150) NOT NULL DEFAULT '',
            last_name VARCHAR(150) NOT NULL DEFAULT '',
            email VARCHAR(254) NOT NULL DEFAULT '',
            is_staff TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            date_joined DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'auth_user_groups': """
        CREATE TABLE IF NOT EXISTS auth_user_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            group_id INT NOT NULL,
            UNIQUE KEY unique_user_group (user_id, group_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'auth_user_user_permissions': """
        CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            permission_id INT NOT NULL,
            UNIQUE KEY unique_user_permission (user_id, permission_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'django_admin_log': """
        CREATE TABLE IF NOT EXISTS django_admin_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action_time DATETIME NOT NULL,
            object_id LONGTEXT NULL,
            object_repr VARCHAR(200) NOT NULL,
            action_flag SMALLINT UNSIGNED NOT NULL,
            change_message LONGTEXT NOT NULL,
            content_type_id INT NULL,
            user_id INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'django_content_type': """
        CREATE TABLE IF NOT EXISTS django_content_type (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app_label VARCHAR(100) NOT NULL,
            model VARCHAR(100) NOT NULL,
            UNIQUE KEY unique_app_label_model (app_label, model)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'django_migrations': """
        CREATE TABLE IF NOT EXISTS django_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            applied DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'django_session': """
        CREATE TABLE IF NOT EXISTS django_session (
            session_key VARCHAR(40) NOT NULL PRIMARY KEY,
            session_data LONGTEXT NOT NULL,
            expire_date DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'police_users': """
        CREATE TABLE IF NOT EXISTS police_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(128) NOT NULL,
            name VARCHAR(50) NOT NULL,
            permission_level VARCHAR(20) NOT NULL,
            unit_code VARCHAR(50) NOT NULL,
            phone VARCHAR(20) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            last_login DATETIME NULL,
            nickname VARCHAR(50) NOT NULL DEFAULT '',
            police_number VARCHAR(20) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'user_profile': """
        CREATE TABLE IF NOT EXISTS user_profile (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL UNIQUE,
            avatar VARCHAR(100) NULL,
            bio LONGTEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    'user_sessions': """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_key VARCHAR(64) NOT NULL UNIQUE,
            ip_address VARCHAR(45) NOT NULL DEFAULT '',
            user_agent VARCHAR(255) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            user_id INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    '单位': """
        CREATE TABLE IF NOT EXISTS 单位 (
            id INT AUTO_INCREMENT PRIMARY KEY,
            一级 VARCHAR(50) NOT NULL,
            二级 VARCHAR(100) NULL,
            三级 VARCHAR(100) NULL,
            系统编码 VARCHAR(50) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    '已下发信件表': """
        CREATE TABLE IF NOT EXISTS 已下发信件表 (
            序号 INT AUTO_INCREMENT PRIMARY KEY,
            信件编号 VARCHAR(100) NOT NULL UNIQUE,
            群众姓名 VARCHAR(50) NOT NULL,
            手机号 VARCHAR(20) NULL,
            身份证号 VARCHAR(18) NULL,
            来信时间 DATETIME NOT NULL,
            来信渠道 VARCHAR(50) NOT NULL,
            信件一级分类 VARCHAR(50) NOT NULL,
            信件二级分类 VARCHAR(50) NOT NULL,
            信件三级分类 VARCHAR(50) NOT NULL,
            接收单位 VARCHAR(100) NOT NULL,
            创建时间 DATETIME NOT NULL,
            更新时间 DATETIME NOT NULL,
            诉求内容 LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    '已反馈信件表': """
        CREATE TABLE IF NOT EXISTS 已反馈信件表 (
            序号 INT AUTO_INCREMENT PRIMARY KEY,
            信件编号 VARCHAR(100) NOT NULL UNIQUE,
            群众姓名 VARCHAR(50) NOT NULL,
            手机号 VARCHAR(20) NULL,
            身份证号 VARCHAR(18) NULL,
            来信时间 DATETIME NOT NULL,
            来信渠道 VARCHAR(50) NOT NULL,
            信件一级分类 VARCHAR(50) NOT NULL,
            信件二级分类 VARCHAR(50) NOT NULL,
            信件三级分类 VARCHAR(50) NOT NULL,
            接收单位 VARCHAR(100) NOT NULL,
            创建时间 DATETIME NOT NULL,
            更新时间 DATETIME NOT NULL,
            诉求内容 LONGTEXT NOT NULL,
            反馈内容 LONGTEXT NOT NULL,
            反馈时间 DATETIME NOT NULL,
            反馈单位 VARCHAR(100) NOT NULL,
            反馈人 VARCHAR(50) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    '正在处理信件表': """
        CREATE TABLE IF NOT EXISTS 正在处理信件表 (
            序号 INT AUTO_INCREMENT PRIMARY KEY,
            信件编号 VARCHAR(100) NOT NULL UNIQUE,
            群众姓名 VARCHAR(50) NOT NULL,
            手机号 VARCHAR(20) NULL,
            身份证号 VARCHAR(18) NULL,
            来信时间 DATETIME NOT NULL,
            来信渠道 VARCHAR(50) NOT NULL,
            信件一级分类 VARCHAR(50) NOT NULL,
            信件二级分类 VARCHAR(50) NOT NULL,
            信件三级分类 VARCHAR(50) NOT NULL,
            接收单位 VARCHAR(100) NOT NULL,
            创建时间 DATETIME NOT NULL,
            更新时间 DATETIME NOT NULL,
            诉求内容 LONGTEXT NOT NULL,
            处理人 VARCHAR(50) NULL,
            开始处理时间 DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    '预处理信件表': """
        CREATE TABLE IF NOT EXISTS 预处理信件表 (
            序号 INT AUTO_INCREMENT PRIMARY KEY,
            信件编号 VARCHAR(100) NOT NULL UNIQUE,
            群众姓名 VARCHAR(50) NOT NULL,
            手机号 VARCHAR(20) NULL,
            身份证号 VARCHAR(18) NULL,
            来信时间 DATETIME NOT NULL,
            来信渠道 VARCHAR(50) NOT NULL,
            信件一级分类 VARCHAR(50) NOT NULL,
            信件二级分类 VARCHAR(50) NOT NULL,
            信件三级分类 VARCHAR(50) NOT NULL,
            接收单位 VARCHAR(100) NOT NULL,
            创建时间 DATETIME NOT NULL,
            更新时间 DATETIME NOT NULL,
            诉求内容 LONGTEXT NOT NULL,
            提交人 VARCHAR(50) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """
}

def create_tables(cursor):
    """
    创建所有表结构
    """
    for table_name, schema in TABLE_SCHEMAS.items():
        try:
            cursor.execute(schema)
            print(f"表 {table_name} 创建成功或已存在")
        except Exception as e:
            print(f"创建表 {table_name} 失败: {e}")
            raise

def import_data(cursor, data):
    """
    导入数据到各表
    """
    for table_name, rows in data.items():
        if not rows:
            print(f"表 {table_name} 没有数据，跳过")
            continue
        
        # 获取列名
        columns = list(rows[0].keys())
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join([f'`{col}`' for col in columns])
        
        # 清空表并导入数据
        cursor.execute(f"TRUNCATE TABLE `{table_name}`")
        
        insert_sql = f"INSERT IGNORE INTO `{table_name}` ({column_names}) VALUES ({placeholders})"
        
        inserted_count = 0
        for row in rows:
            values = [row[col] for col in columns]
            cursor.execute(insert_sql, values)
            if cursor.rowcount > 0:
                inserted_count += 1
        
        print(f"表 {table_name} 导入完成，共 {len(rows)} 条记录，成功插入 {inserted_count} 条")

def main():
    """
    主函数
    """
    # 读取JSON文件
    json_file = '/home/zhangmo/project/PublicOpinionTexture/database_export.json'
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"成功读取JSON文件，包含 {len(data)} 个表的数据")
    
    # 连接本地数据库
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        # 创建表
        print("\n开始创建表结构...")
        create_tables(cursor)
        
        # 导入数据
        print("\n开始导入数据...")
        import_data(cursor, data)
        
        conn.commit()
        print("\n数据导入完成！")
        
    except Exception as e:
        conn.rollback()
        print(f"导入失败: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
