#!/usr/bin/env python3
"""
导出MySQL数据库内容到文件
"""
import pymysql
import json
import os
from datetime import datetime

# 数据库连接配置
DB_CONFIG = {
    'host': '43.143.138.6',
    'port': 3306,
    'user': 'pot',
    'password': '000001',
    'database': 'pot_data',
    'charset': 'utf8mb4'
}

def export_database():
    """
    导出数据库所有表的数据到JSON文件
    """
    try:
        # 连接数据库
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 获取所有表名
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        table_key = list(tables[0].keys())[0] if tables else 'Tables_in_pot_data'
        table_names = [t[table_key] for t in tables]
        
        print(f"发现 {len(table_names)} 个表: {table_names}")
        
        # 导出每个表的数据
        all_data = {}
        for table_name in table_names:
            print(f"正在导出表: {table_name}")
            cursor.execute(f"SELECT * FROM `{table_name}`")
            rows = cursor.fetchall()
            
            # 处理datetime对象，使其可JSON序列化
            processed_rows = []
            for row in rows:
                processed_row = {}
                for key, value in row.items():
                    if isinstance(value, datetime):
                        processed_row[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        processed_row[key] = value
                processed_rows.append(processed_row)
            
            all_data[table_name] = processed_rows
            print(f"  - 共 {len(rows)} 条记录")
        
        # 保存到JSON文件
        output_file = os.path.join('/home/zhangmo/project/PublicOpinionTexture', 'database_export.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        
        print(f"\n导出完成！数据已保存到: {output_file}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"导出失败: {e}")
        raise

if __name__ == '__main__':
    export_database()
