"""交易日历数据访问层"""
import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent.parent / "data" / "db" / "trading.db"


def init_trading_calendar_table():
    """确保 trading_calendar 表存在"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trading_calendar (
            trade_date TEXT PRIMARY KEY,
            is_today INTEGER DEFAULT 0,
            source TEXT DEFAULT 'akshare.sina'
        )
    """)
    conn.commit()
    conn.close()


def bulk_insert_trading_dates(dates: List[str], source: str = "akshare.sina"):
    """批量写入交易日历"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today = datetime.now().strftime('%Y-%m-%d')
    for d in dates:
        is_today = 1 if d == today else 0
        cursor.execute("""
            INSERT OR REPLACE INTO trading_calendar (trade_date, is_today, source)
            VALUES (?, ?, ?)
        """, (d, is_today, source))
    conn.commit()
    conn.close()


def get_trading_days_by_year_month(year: int, month: int) -> List[Dict[str, Any]]:
    """按年月查询交易日"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    pattern = f"{year:04d}-{month:02d}%"
    cursor.execute(
        "SELECT trade_date, is_today FROM trading_calendar WHERE trade_date LIKE ? ORDER BY trade_date",
        (pattern,)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def is_trading_day(date: str) -> bool:
    """判断是否为交易日"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM trading_calendar WHERE trade_date = ?", (date,))
    result = cursor.fetchone() is not None
    conn.close()
    return result


def get_trading_calendar_count() -> int:
    """获取总交易日数量"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM trading_calendar")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_all_trading_dates() -> List[str]:
    """获取所有交易日（用于全量刷新）"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT trade_date FROM trading_calendar ORDER BY trade_date")
    dates = [row[0] for row in cursor.fetchall()]
    conn.close()
    return dates
