"""个股信息服务层"""
from typing import Dict, Any, List
from ..data.stock_info import (
    init_stock_info_table,
    upsert_stock_info,
    get_stock_info_list as db_get_list,
    get_stock_info_by_code as db_get_by_code,
    get_last_refresh_time,
    get_stock_info_count,
)
from ..data.bao_adapter import get_stock_list as bao_get_stock_list, format_code
from ..data.akshare_adapter import get_akshare_stock_info, check_akshare_available


def init_stock_info():
    """初始化个股信息表"""
    init_stock_info_table()


def refresh_stock_info() -> Dict[str, Any]:
    """全量刷新个股信息

    流程：
    1. 优先使用 AKShare 东财接口获取全量数据（深证含股本，上证仅上市日期）
    2. 若 AKShare 失败或数据不足（<100），回退到 baostock
    3. 写入 stock_info 表

    Returns:
        {"status": str, "total": int, "message": str}
    """
    stock_map: Dict[str, Dict[str, Any]] = {}

    # 1. 优先从 AKShare 获取全量数据
    akshare_data = None
    akshare_available = check_akshare_available()
    if akshare_available:
        try:
            akshare_data = get_akshare_stock_info()
        except Exception:
            akshare_data = None

    if akshare_data and len(akshare_data) >= 100:
        # AKShare 数据充足，作为主数据源
        for item in akshare_data:
            code = item.get("code", "")
            if not code:
                continue
            stock_map[code] = {
                "code": code,
                "name": item.get("name", ""),
                "market": item.get("market", ""),
                "total_share": item.get("total_share"),
                "float_share": item.get("float_share"),
                "list_date": item.get("list_date"),
                "stock_type": item.get("stock_type", "A股"),
                "status": "1",
            }
        source = "akshare"
    else:
        # 2. 回退到 baostock
        bao_stocks = bao_get_stock_list()
        if not bao_stocks:
            return {"status": "error", "total": 0, "message": "baostock 数据获取失败"}

        for s in bao_stocks:
            code = s.get("code", "")
            if "." in code:
                code = code.split(".")[1]
            if not code:
                continue
            stock_map[code] = {
                "code": code,
                "name": s.get("name", ""),
                "market": s.get("market", ""),
                "status": s.get("status", ""),
                "stock_type": "A股",
                "total_share": None,
                "float_share": None,
                "list_date": None,
            }

        # AKShare 补全（仅补充空字段）
        if akshare_available and akshare_data:
            for item in akshare_data:
                code = item.get("code", "")
                if code in stock_map:
                    if stock_map[code]["total_share"] is None:
                        stock_map[code]["total_share"] = item.get("total_share")
                    if stock_map[code]["float_share"] is None:
                        stock_map[code]["float_share"] = item.get("float_share")
                    if stock_map[code]["list_date"] is None:
                        stock_map[code]["list_date"] = item.get("list_date")
        source = "baostock"

    # 3. 写入数据库
    all_stocks = list(stock_map.values())
    upsert_stock_info(all_stocks, source=source)

    return {
        "status": "success",
        "total": len(all_stocks),
        "message": f"成功刷新 {len(all_stocks)} 只股票，数据源: {source}"
    }


def get_stock_info_list(
    page: int = 1,
    page_size: int = 50,
    search: str = "",
    market: str = "all"
) -> Dict[str, Any]:
    """分页获取个股信息"""
    if page_size > 200:
        page_size = 200
    return db_get_list(page=page, page_size=page_size, search=search, market=market)


def get_stock_info_by_code(code: str) -> Dict[str, Any]:
    """获取单只股票信息，标准化 code 格式"""
    # 标准化 code
    if code.startswith("sh.") or code.startswith("sz."):
        code = code.split(".")[1]
    return db_get_by_code(code)


def get_data_sources_status() -> Dict[str, Any]:
    """获取数据源状态"""
    baostock_ok = True
    akshare_ok = check_akshare_available()
    count = get_stock_info_count()
    last_refresh = get_last_refresh_time()

    return {
        "baostock": {"available": baostock_ok, "status": "connected"},
        "akshare": {"available": akshare_ok, "status": "connected" if akshare_ok else "disconnected"},
        "stock_count": count,
        "last_full_refresh": last_refresh,
    }
