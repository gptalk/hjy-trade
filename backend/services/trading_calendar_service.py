"""交易日历服务层"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from ..data.trading_calendar import (
    init_trading_calendar_table,
    bulk_upsert_calendar,
    get_calendar_list as db_get_list,
    is_trading_day as db_is_trading_day,
    get_calendar_count,
    get_all_trading_dates,
    get_latest_trade_date,
)
import akshare as ak


def init_trading_calendar():
    """初始化交易日历表"""
    init_trading_calendar_table()


def refresh_trading_calendar() -> Dict[str, Any]:
    """全量刷新交易日历

    从 akshare 获取沪深交易日历，计算每一日的：
    - is_trading: 是否交易（1=交易日，0=非交易日）
    - previous_trading_day: 上一个交易日
    - timezone: Asia/Shanghai
    - exchange: 上交所（统一日历）

    非交易日判断：不在 akshare 列表中的日期（周末、节假日）
    """
    # 1. 获取 akshare 原始交易日列表
    df = ak.tool_trade_date_hist_sina()
    raw_dates = df['trade_date'].tolist()
    # 统一转为字符串 YYYY-MM-DD
    trading_dates_set = set()
    for d in raw_dates:
        if hasattr(d, 'strftime'):
            trading_dates_set.add(d.strftime('%Y-%m-%d'))
        else:
            trading_dates_set.add(str(d)[:10])

    # 2. 确定日期范围（从最早交易日到今天+30天）
    if not trading_dates_set:
        return {"status": "error", "total": 0, "message": "akshare 数据获取失败"}

    min_date_str = min(trading_dates_set)
    max_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')

    # 3. 遍历范围内每一天，计算 is_trading 和 previous_trading_day
    current = datetime.strptime(min_date_str, '%Y-%m-%d')
    end = datetime.strptime(max_date, '%Y-%m-%d')
    prev_trading = None
    dates_to_write = []

    while current <= end:
        date_str = current.strftime('%Y-%m-%d')
        is_trading = 1 if date_str in trading_dates_set else 0

        if is_trading == 1:
            prev_trading = date_str

        dates_to_write.append({
            'trade_date': date_str,
            'exchange': '上交所',
            'timezone': 'Asia/Shanghai',
            'is_trading': is_trading,
            'previous_trading_day': prev_trading if is_trading == 0 else None,
        })
        current += timedelta(days=1)

    # 4. 写数据库
    bulk_upsert_calendar(dates_to_write)

    return {
        "status": "success",
        "total": len(dates_to_write),
        "message": f"成功刷新 {len(dates_to_write)} 天日历（含{sum(1 for d in dates_to_write if d['is_trading']==1)}个交易日）"
    }


def get_calendar_list(
    page: int = 1,
    page_size: int = 100,
    year: Optional[int] = None,
    month: Optional[int] = None,
    exchange: str = "all",
    is_trading: Optional[int] = None,
) -> Dict[str, Any]:
    """分页获取日历列表"""
    if page_size > 200:
        page_size = 200
    return db_get_list(page=page, page_size=page_size, year=year, month=month,
                       exchange=exchange, is_trading=is_trading)


def check_is_trading_day(date_str: str) -> Dict[str, Any]:
    """判断是否为交易日"""
    result = db_is_trading_day(date_str)
    return {"date": date_str, "is_trading": 1 if result else 0}


def get_sources_status() -> Dict[str, Any]:
    """获取数据源状态"""
    try:
        df = ak.tool_trade_date_hist_sina()
        akshare_ok = True
    except Exception:
        akshare_ok = False

    return {
        "akshare": {"available": akshare_ok, "status": "connected" if akshare_ok else "disconnected"},
        "total_days": get_calendar_count(),
        "latest_trade_date": get_latest_trade_date(),
    }
