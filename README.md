# HJY Trade 量化交易平台

本地A股量化交易分析平台。

## 功能
- K线回测 - K线图展示、技术指标(MA/MACD/RSI/布林带)
- 策略编辑 - 策略代码编辑、参数配置、回测
- 自选股 - 分组管理
- 回测记录 - 历史回测查看、13项指标分析
- 数据管理 - A股数据同步、市场管理、股票信息管理
- AI问诊 - 基于规则的技术分析

## 快速启动

### 后端
```bash
cd backend
pip install -r requirements.txt
python app.py
```
后端运行在 http://localhost:5000

### 前端
```bash
cd frontend
npm install
npm run dev
```
前端运行在 http://localhost:5173

## 技术栈
- 前端: React, ECharts, TailwindCSS
- 后端: Flask, SQLite, pandas-ta
- 数据源: akshare (东方财富)