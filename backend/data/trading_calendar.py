"""交易日历数据访问层"""
import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta

DB_PATH = Path(__file__).parent.parent.parent / "data" / "db" / "trading.db"


def init_trading_calendar_table():
    """确保 trading_calendar 表存在

    字段说明：
    - trade_date: 日期 (YYYY-MM-DD)
    - exchange: 交易所（上交所/深交所/沪深统一）
    - timezone: 时区（Asia/Shanghai）
    - is_trading: 是否交易 (0=休市, 1=交易)
    - previous_trading_day: 上一个交易日
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trading_calendar (
            trade_date TEXT PRIMARY KEY,
            exchange TEXT DEFAULT '上交所',
            timezone TEXT DEFAULT 'Asia/Shanghai',
            is_trading INTEGER DEFAULT 0,
            previous_trading_day TEXT
        )
    """)
    conn.commit()
    conn.close()


def bulk_upsert_calendar(dates: List[Dict[str, Any]]):
    """批量写入或更新日历数据"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for d in dates:
        cursor.execute("""
            INSERT OR REPLACE INTO trading_calendar
            (trade_date, exchange, timezone, is_trading, previous_trading_day)
            VALUES (?, ?, ?, ?, ?)
        """, (
            d.get('trade_date'),
            d.get('exchange', '上交所'),
            d.get('timezone', 'Asia/Shanghai'),
            d.get('is_trading', 1),
            d.get('previous_trading_day'),
        ))
    conn.commit()
    conn.close()


def get_calendar_list(
    page: int = 1,
    page_size: int = 100,
    year: Optional[int] = None,
    month: Optional[int] = None,
    exchange: str = "all",
    is_trading: Optional[int] = None,
) -> Dict[str, Any]:
    """分页获取日历列表"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    where_clauses = []
    params = []
    if year:
        where_clauses.append("strftime('%Y', trade_date) = ?")
        params.append(str(year))
    if month:
        where_clauses.append("strftime('%m', trade_date) = ?")
        params.append(f"{month:02d}")
    if exchange != "all":
        where_clauses.append("exchange = ?")
        params.append(exchange)
    if is_trading is not None:
        where_clauses.append("is_trading = ?")
        params.append(is_trading)

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

    cursor.execute(f"SELECT COUNT(*) FROM trading_calendar WHERE {where_sql}", params)
    total = cursor.fetchone()[0]

    offset = (page - 1) * page_size
    cursor.execute(
        f"""SELECT * FROM trading_calendar WHERE {where_sql}
            ORDER BY trade_date DESC LIMIT ? OFFSET ?""",
        params + [page_size, offset]
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"total": total, "page": page, "page_size": page_size, "data": rows}


def is_trading_day(date: str) -> bool:
    """判断是否为交易日"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT is_trading FROM trading_calendar WHERE trade_date = ?", (date,))
    row = cursor.fetchone()
    conn.close()
    return row is not None and row[0] == 1


def get_all_trading_dates() -> List[str]:
    """获取所有交易日"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT trade_date FROM trading_calendar WHERE is_trading=1 ORDER BY trade_date"
    )
    dates = [row[0] for row in cursor.fetchall()]
    conn.close()
    return dates


def get_calendar_count() -> int:
    """获取总记录数"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM trading_calendar")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_latest_trade_date() -> Optional[str]:
    """获取最后一个交易日"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT trade_date FROM trading_calendar WHERE is_trading=1 ORDER BY trade_date DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None
