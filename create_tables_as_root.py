#!/usr/bin/env python3
"""
使用root用户创建表结构
"""
import pymysql
import json

# root数据库连接配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 53306,
    'user': 'root',
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
            password VARCHAR(128)