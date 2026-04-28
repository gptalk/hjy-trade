"""交易日历服务层"""
from typing import Dict, Any, List
from datetime import datetime
import akshare as ak
from ..data.trading_calendar import (
    init_trading_calendar_table,
    bulk_insert_trading_dates,
    get_trading_days_by_year_month,
    is_trading_day as db_is_trading_day,
    get_trading_calendar_count,
    get_all_trading_dates,
)


def init_trading_calendar():
    """初始化交易日历表"""
    init_trading_calendar_table()


def refresh_trading_calendar() -> Dict[str, Any]:
    """全量刷新交易日历

    从 akshare.tool_trade_date_hist_sina() 获取沪深统一日历，
    比对现有数据，仅新增缺失的日期。
    """
    try:
        df = ak.tool_trade_date_hist_sina()
        all_dates = df['trade_date'].tolist()

        existing = set(get_all_trading_dates())
        new_dates = [d for d in all_dates if d not in existing]

        if new_dates:
            bulk_insert_trading_dates(new_dates)

        return {
            "status": "success",
            "total": get_trading_calendar_count(),
            "message": f"成功刷新 {len(new_dates)} 个新交易日"
        }
    except Exception as e:
        return {"status": "error", "total": 0, "message": str(e)}


def get_calendar_by_year_month(year: int, month: int) -> Dict[str, Any]:
    """按年月获取交易日列表"""
    rows = get_trading_days_by_year_month(year, month)
    return {
        "year": year,
        "month": month,
        "total": len(rows),
        "data": rows,
    }


def check_is_trading_day(date: str) -> Dict[str, Any]:
    """判断是否为交易日"""
    result = db_is_trading_day(date)
    return {"date": date, "is_trading_day": result}


def get_sources_status() -> Dict[str, Any]:
    """获取数据源状态"""
    try:
        df = ak.tool_trade_date_hist_sina()
        akshare_ok = True
    except Exception:
        akshare_ok = False

    return {
        "akshare": {"available": akshare_ok, "status": "connected" if akshare_ok else "disconnected"},
        "total_days": get_trading_calendar_count(),
    }
