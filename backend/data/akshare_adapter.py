"""AKShare 东财接口适配器"""
import akshare as ak
from typing import List, Dict, Any, Optional
from datetime import datetime

_akshare_available = True


def get_akshare_stock_info() -> Optional[List[Dict[str, Any]]]:
    """获取 AKShare 接口的个股信息（深交所+上交所）

    - 深交所：stock_info_sz_name_code 包含 总股本、流通股、上市日期
    - 上交所：stock_info_sh_name_code 仅包含 上市日期

    Returns:
        包含总股本、流通股、上市日期等信息的列表，失败返回 None
    """
    try:
        result = []

        # 深交所数据（包含股本信息）
        try:
            df_sz = ak.stock_info_sz_name_code()
            for _, row in df_sz.iterrows():
                code = str(row.get('A股代码', '')).strip()
                if not code:
                    continue
                # 股本字段是带逗号的字符串（如 "19,405,918,198"），单位是股，转万股需除以 10000
                total_raw = _parse_share_number(row.get('A股总股本'))
                float_raw = _parse_share_number(row.get('A股流通股本'))
                result.append({
                    "code": code,
                    "name": str(row.get('A股简称', '')).strip(),
                    "market": "sz",
                    "total_share": round(total_raw / 10000, 2) if total_raw else None,
                    "float_share": round(float_raw / 10000, 2) if float_raw else None,
                    "list_date": str(row.get('A股上市日期', '')).strip(),
                    "stock_type": "A股",
                })
        except Exception:
            pass

        # 上交所数据（仅上市日期，无股本信息）
        try:
            df_sh = ak.stock_info_sh_name_code()
            for _, row in df_sh.iterrows():
                code = str(row.get('证券代码', '')).strip()
                if not code:
                    continue
                # 检查是否已存在（避免重复，深交所已覆盖的股票跳过）
                if any(r['code'] == code for r in result):
                    continue
                result.append({
                    "code": code,
                    "name": str(row.get('证券简称', '')).strip(),
                    "market": "sh",
                    "total_share": None,
                    "float_share": None,
                    "list_date": str(row.get('上市日期', '')).strip(),
                    "stock_type": "A股",
                })
        except Exception:
            pass

        return result if result else None
    except Exception:
        return None


def _parse_share_number(val: Any) -> Optional[float]:
    """解析股本数字（带逗号的字符串，如 "19,405,918,198"）"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '')
    if not s or s in ('-', 'nan', 'None'):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_number(val: Any) -> Optional[float]:
    """解析数字"""
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
        ak.stock_info_sz_name_code()
        return True
    except Exception:
        _akshare_available = False
        return False
