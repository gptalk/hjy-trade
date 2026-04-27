"""个股信息数据访问层"""
import sqlite3
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent.parent / "data" / "db" / "trading.db"

def init_stock_info_table():
    """确保 stock_info 表存在"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
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


def upsert_stock_info(stocks: List[Dict[str, Any]], source: str = "baostock"):
    """批量插入或更新个股信息

    Args:
        stocks: 股票信息列表
        source: 数据来源标记
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    for s in stocks:
        cursor.execute("""
            INSERT INTO stock_info (code, name, market, total_share, float_share,
                                    list_date, stock_type, status, source, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET
                name=excluded.name,
                market=excluded.market,
                total_share=COALESCE(excluded.total_share, stock_info.total_share),
                float_share=COALESCE(excluded.float_share, stock_info.float_share),
                list_date=COALESCE(excluded.list_date, stock_info.list_date),
                stock_type=COALESCE(excluded.stock_type, stock_info.stock_type),
                status=COALESCE(excluded.status, stock_info.status),
                source=excluded.source,
                updated_at=excluded.updated_at
        """, (
            s.get('code'),
            s.get('name'),
            s.get('market'),
            s.get('total_share'),
            s.get('float_share'),
            s.get('list_date'),
            s.get('stock_type'),
            s.get('status'),
            source,
            now,
        ))
    conn.commit()
    conn.close()


def get_stock_info_list(
    page: int = 1,
    page_size: int = 50,
    search: str = "",
    market: str = "all"
) -> Dict[str, Any]:
    """分页获取个股信息列表

    Returns:
        {"total": int, "page": int, "page_size": int, "data": [row, ...]}
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    where_clauses = []
    params = []
    if search:
        where_clauses.append("(code LIKE ? OR name LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    if market != "all":
        where_clauses.append("market = ?")
        params.append(market)

    where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

    cursor.execute(f"SELECT COUNT(*) FROM stock_info WHERE {where_sql}", params)
    total = cursor.fetchone()[0]

    offset = (page - 1) * page_size
    cursor.execute(
        f"""SELECT * FROM stock_info WHERE {where_sql}
            ORDER BY code ASC LIMIT ? OFFSET ?""",
        params + [page_size, offset]
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"total": total, "page": page, "page_size": page_size, "data": rows}


def get_stock_info_by_code(code: str) -> Optional[Dict[str, Any]]:
    """根据代码获取单只股票信息"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stock_info WHERE code = ?", (code,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_last_refresh_time() -> Optional[str]:
    """获取最后一次全量刷新时间"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(updated_at) FROM stock_info")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row and row[0] else None


def get_stock_info_count() -> int:
    """获取个股信息总条数"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM stock_info")
    count = cursor.fetchone()[0]
    conn.close()
    return count
