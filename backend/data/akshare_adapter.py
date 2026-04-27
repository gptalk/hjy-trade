"""AKShare 东财接口适配器"""
import akshare as ak
from typing import List, Dict, Any, Optional
from datetime import datetime

_akshare_available = True


def get_akshare_stock_info() -> Optional[List[Dict[str, Any]]]:
    """获取 AKShare 东财接口的个股信息

    Returns:
        包含总股本、流通股、上市日期等信息的列表，失败返回 None
    """
    try:
        df = ak.stock_info_em()
        result = []
        for _, row in df.iterrows():
            code = str(row.get('代码', '')).strip()
            if not code:
                continue
            result.append({
                "code": code,
                "name": str(row.get('名称', '')).strip(),
                "total_share": _parse_number(row.get('总股本(万股)')),
                "float_share": _parse_number(row.get('流通股(万股)')),
                "list_date": str(row.get('上市时间', '')).strip(),
                "stock_type": str(row.get('股票类型', 'A股')).strip(),
            })
        return result
    except Exception:
        return None


def _parse_number(val: Any) -> Optional[float]:
    """解析数字，支持万/亿单位"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s in ('-', 'nan', 'None'):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def check_akshare_available() -> bool:
    """检查 AKShare 是否可用"""
    global _akshare_available
    if not _akshare_available:
        return False
    try:
        ak.stock_info_em()
        return True
    except Exception:
        _akshare_available = False
        return False
