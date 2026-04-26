import sqlite3
import json
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

    # 市场表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS markets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            market_type TEXT DEFAULT 'A股',
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 股票详细信息表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_info (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            market TEXT DEFAULT 'A股',
            industry TEXT,
            listing_date TEXT,
            total_shares REAL,
            float_shares REAL,
            mainBusiness TEXT,
            issuedShares TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    # stock_cache 表：跟踪已缓存股票信息
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_cache (
            code TEXT PRIMARY KEY,
            name TEXT,
            start_date TEXT,
            end_date TEXT,
            record_count INTEGER DEFAULT 0,
            last_update TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 为 klines 表添加 last_update 字段（如果不存在）
    try:
        cursor.execute('ALTER TABLE klines ADD COLUMN last_update TEXT DEFAULT CURRENT_TIMESTAMP')
    except sqlite3.OperationalError:
        pass  # 列已存在

    # 创建索引加速查询
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_klines_code_date ON klines(code, date)')

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

def init_default_strategies():
    """初始化默认策略"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 检查是否已有策略
    existing = cursor.execute('SELECT COUNT(*) FROM strategies').fetchone()[0]
    if existing > 0:
        conn.close()
        return

    # 创建默认策略
    default_strategies = [
        {
            'name': '均线交叉策略',
            'description': '使用MA5和MA20的黄金交叉/死叉进行买卖',
            'conditions': {'buy': 'MA5 > MA20', 'sell': 'MA5 < MA20'}
        },
        {
            'name': 'MACD策略',
            'description': '使用MACD金叉死叉信号',
            'conditions': {'buy': 'MACD > MACD_signal', 'sell': 'MACD < MACD_signal'}
        },
        {
            'name': 'RSI超卖策略',
            'description': 'RSI低于30买入，高于70卖出',
            'conditions': {'buy': 'RSI6 < 30', 'sell': 'RSI6 > 70'}
        }
    ]

    for strategy in default_strategies:
        cursor.execute(
            'INSERT INTO strategies (name, description, conditions) VALUES (?, ?, ?)',
            (strategy['name'], strategy['description'], json.dumps(strategy['conditions']))
        )

    conn.commit()
    conn.close()

# 初始化数据库
init_db()
init_default_strategies()