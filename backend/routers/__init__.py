"""API路由"""
from fastapi import APIRouter
from .stocks import router as stocks_router
from .backtest import router as backtest_router
from .ai import router as ai_router
from .data import router as data_router

api_router = APIRouter(prefix="/api")

api_router.include_router(stocks_router, prefix="/stocks", tags=["股票"])
api_router.include_router(backtest_router, tags=["回测"])
api_router.include_router(ai_router, tags=["AI问诊"])
api_router.include_router(data_router, prefix="/data", tags=["数据管理"])

__all__ = ['api_router']