"""数据库模块"""
import sqlite3
from typing import List, Optional, Dict, Any
from pathlib import Path
import json
from datetime import datetime

DB_PATH = Path(__file__).parent.parent.parent / "data" / "db" / "trading.db"


def init_db():
    """初始化数据库"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 创建回测记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS backtest_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_code TEXT NOT NULL,
            stock_name TEXT,
            strategy_type TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            initial_capital REAL NOT NULL,
            final_capital REAL,
            total_return REAL,
            sharpe_ratio REAL,
            max_drawdown REAL,
            win_rate REAL,
            total_trades INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 创建交易记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trade_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backtest_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            action TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            amount REAL NOT NULL,
            FOREIGN KEY (backtest_id) REFERENCES backtest_records(id)
        )
    """)

    # 创建问诊记录表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS diagnosis_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_code TEXT NOT NULL,
            stock_name TEXT,
            analysis TEXT,
            signals TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 创建股票信息表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_info (
            code TEXT PRIMARY KEY,
            name TEXT,
            market TEXT,
            total_share REAL,
            float_share REAL,
            list_date TEXT,
            stock_type TEXT,
            status TEXT,
            source TEXT DEFAULT 'baostock',
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    """)

    conn.commit()
    conn.close()


def save_backtest_record(record: Dict[str, Any]) -> int:
    """保存回测记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO backtest_records (
            stock_code, stock_name, strategy_type, start_date, end_date,
            initial_capital, final_capital, total_return, sharpe_ratio,
            max_drawdown, win_rate, total_trades
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get('stock_code'),
        record.get('stock_name'),
        record.get('strategy_type'),
        record.get('start_date'),
        record.get('end_date'),
        record.get('initial_capital'),
        record.get('final_capital'),
        record.get('total_return'),
        record.get('sharpe_ratio'),
        record.get('max_drawdown'),
        record.get('win_rate'),
        record.get('total_trades'),
    ))

    backtest_id = cursor.lastrowid

    # 保存交易记录
    trades = record.get('trades', [])
    for trade in trades:
        cursor.execute("""
            INSERT INTO trade_records (backtest_id, date, action, price, quantity, amount)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (backtest_id, trade['date'], trade['action'], trade['price'], trade['quantity'], trade['amount']))

    conn.commit()
    conn.close()

    return backtest_id


def get_backtest_records(limit: int = 50) -> List[Dict[str, Any]]:
    """获取回测记录"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM backtest_records
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))

    records = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return records


def get_backtest_record(backtest_id: int) -> Optional[Dict[str, Any]]:
    """获取单个回测记录及交易明细"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM backtest_records WHERE id = ?", (backtest_id,))
    record = cursor.fetchone()

    if record:
        record = dict(record)
        cursor.execute("SELECT * FROM trade_records WHERE backtest_id = ? ORDER BY date", (backtest_id,))
        record['trades'] = [dict(row) for row in cursor.fetchall()]
    else:
        record = None

    conn.close()
    return record


def delete_backtest_record(backtest_id: int) -> bool:
    """删除回测记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM trade_records WHERE backtest_id = ?", (backtest_id,))
    cursor.execute("DELETE FROM backtest_records WHERE id = ?", (backtest_id,))

    conn.commit()
    result = cursor.rowcount > 0
    conn.close()

    return result


def save_diagnosis_record(record: Dict[str, Any]) -> int:
    """保存问诊记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO diagnosis_records (stock_code, stock_name, analysis, signals)
        VALUES (?, ?, ?, ?)
    """, (
        record.get('stock_code'),
        record.get('stock_name'),
        record.get('analysis'),
        json.dumps(record.get('signals', {}))
    ))

    diagnosis_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return diagnosis_id


def get_diagnosis_records(limit: int = 50) -> List[Dict[str, Any]]:
    """获取问诊记录"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM diagnosis_records
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))

    records = []
    for row in cursor.fetchall():
        record = dict(row)
        record['signals'] = json.loads(record.get('signals', '{}'))
        records.append(record)

    conn.close()
    return records


def delete_diagnosis_record(diagnosis_id: int) -> bool:
    """删除问诊记录"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM diagnosis_records WHERE id = ?", (diagnosis_id,))

    conn.commit()
    result = cursor.rowcount > 0
    conn.close()

    return result