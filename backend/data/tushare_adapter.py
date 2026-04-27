"""Tushare 数据源适配器"""
import tushare as ts
from typing import List, Dict, Any, Optional
from datetime import datetime

# 免费 token（每小时限调用1次 stock_basic）
TUSHARE_TOKEN = "47b9a627f1563898aa332944ec91cc01218dda39d996ab2f2fe9e507"

_tushare_available = True
_last_call_time: Optional[float] = None
_CALL_INTERVAL_SECONDS = 3600  # 1小时限制


def _get_pro_api():
    """获取 Tushare pro API 实例"""
    return ts.pro_api(TUSHARE_TOKEN)


def check_tushare_available() -> bool:
    """检查 Tushare 是否可用（token 有效且未超限）"""
    global _tushare_available
    if not _tushare_available:
        return False
    try:
        import time
        global _last_call_time
        # 如果距离上次调用不足 1 小时，跳过（避免超限）
        if _last_call_time and (time.time() - _last_call_time) < _CALL_INTERVAL_SECONDS:
            return True  # 但 API 可用，只是暂时限速
        pro = _get_pro_api()
        # 尝试调用一次查询（用 fields 限制返回）
        pro.stock_basic(ts_code='000001.SZ', fields='ts_code,name')
        _last_call_time = time.time()
        return True
    except Exception:
        _tushare_available = False
        return False


def get_tushare_stock_basic() -> Optional[List[Dict[str, Any]]]:
    """获取 Tushare 股票基础信息（每调用1次/小时）

    免费 token 权限：
    - stock_basic: 可用（每分钟1次，但实际1小时1次）
    - daily_basic/stk_rewards: 无权限

    Returns:
        包含 list_date, market, exchange, industry 等字段的股票列表
    """
    global _last_call_time
    import time

    try:
        # 检查是否在限速窗口内
        if _last_call_time and (time.time() - _last_call_time) < _CALL_INTERVAL_SECONDS:
            return None  # 仍在限速窗口

        pro = _get_pro_api()
        df = pro.stock_basic(
            exchange='',
            list_status='L',  # 上市
            fields='ts_code,symbol,name,area,industry,list_date,market,exchange'
        )
        _last_call_time = time.time()

        result = []
        for _, row in df.iterrows():
            ts_code = str(row.get('ts_code', '')).strip()
            if not ts_code:
                continue
            # 解析 ts_code，如 "000001.SZ" -> code="000001", market="sz"
            if '.' in ts_code:
                code, suffix = ts_code.split('.', 1)
                market = 'sz' if suffix == 'SZ' else 'sh' if suffix == 'SH' else suffix.lower()
            else:
                code = ts_code
                market = ''

            result.append({
                "code": code,
                "name": str(row.get('name', '')).strip(),
                "market": market,
                "list_date": _format_date(str(row.get('list_date', '')).strip()),
                "stock_type": "A股",
                "industry": str(row.get('industry', '')).strip(),
                "area": str(row.get('area', '')).strip(),
                "status": "1",
            })
        return result
    except Exception:
        _last_call_time = None
        return None


def _format_date(date_str: str) -> Optional[str]:
    """将 YYYYMMDD 格式转换为 YYYY-MM-DD"""
    if not date_str or len(date_str) != 8:
        return None
    try:
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
    except Exception:
        return None
