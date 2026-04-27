"""FastAPI主入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.routers import api_router
from backend.data.database import init_db
from backend.services.stock_info_service import init_stock_info

app = FastAPI(
    title="小宇量化 API",
    description="A股量化交易回测系统",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    init_db()
    init_stock_info()


@app.get("/")
async def root():
    """健康检查"""
    return {"status": "ok", "message": "小宇量化 API Running"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)