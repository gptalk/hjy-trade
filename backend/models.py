import sqlite3
from dataclasses import dataclass
from datetime import datetime
from typing import List

@dataclass
class Stock:
    code: str
    name: str
    market: str = "A股"

@dataclass
class KLine:
    code: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

@dataclass
class Strategy:
    id: int
    name: str
    description: str
    conditions: dict
    created_at: datetime

@dataclass
class BacktestRecord:
    id: int
    strategy_id: int
    stock_code: str
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: float
    return_rate: float
    win_rate: float
    max_drawdown: float
    sharpe_ratio: float
    trade_count: int
    created_at: datetime

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('data/stock_data.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    import os
    os.makedirs('data', exist_ok=True)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stocks (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            market TEXT DEFAULT 'A股'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS klines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            date TEXT,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume INTEGER,
            UNIQUE(code, date)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS strategies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            conditions TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS backtest_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strategy_id INTEGER,
            stock_code TEXT,
            start_date TEXT,
            end_date TEXT,
            initial_capital REAL,
            final_capital REAL,
            return_rate REAL,
            win_rate REAL,
            max_drawdown REAL,
            sharpe_ratio REAL,
            trade_count INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS watchlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_name TEXT,
            stock_code TEXT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

# 初始化数据库
init_db()