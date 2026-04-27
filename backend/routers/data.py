"""数据管理相关API"""
from fastapi import APIRouter, Query, BackgroundTasks
from typing import Optional
from ..services.stock_info_service import (
    get_stock_info_list,
    get_stock_info_by_code,
    get_data_sources_status,
    refresh_stock_info,
    init_stock_info,
)

router = APIRouter()


@router.get("/stock-info/sources")
async def get_sources():
    """获取数据源状态"""
    return get_data_sources_status()


@router.get("/stock-info/list")
async def list_stock_info(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str = Query("", description="按代码或名称搜索"),
    market: str = Query("all", description="sh/sz/all")
):
    """分页获取个股信息列表"""
    result = get_stock_info_list(page=page, page_size=page_size, search=search, market=market)
    return result


@router.get("/stock-info/{code}")
async def get_stock_info(code: str):
    """获取单只股票详细信息"""
    info = get_stock_info_by_code(code)
    if not info:
        return {"error": "股票不存在"}
    return info


@router.post("/stock-info/refresh")
async def refresh_stock_info_bg(background_tasks: BackgroundTasks):
    """触发全量刷新（后台任务）"""
    import threading

    def _do_refresh():
        init_stock_info()
        refresh_stock_info()

    t = threading.Thread(target=_do_refresh, daemon=True)
    t.start()
    return {"status": "running", "message": "全量刷新任务已启动"}
