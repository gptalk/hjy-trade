# 本地数据库 + 数据管理页面设计

> 解决免费数据源不稳定问题，实现A股数据本地缓存和智能同步

## 1. 概述

**目标：** 建立本地SQLite数据库缓存A股K线数据，提供数据管理页面实现同步/查看/删除功能

**架构：**
```
akshare/备用源  →  后端API  →  SQLite数据库  →  前端页面
                      ↓
               本地缓存优先逻辑
               (智能同步策略)
```

## 2. 数据模型

### 2.1 klines 表扩展

```sql
ALTER TABLE klines ADD COLUMN last_update TEXT DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_klines_code_date ON klines(code, date);
```

### 2.2 stock_cache 表（新增）

```sql
CREATE TABLE IF NOT EXISTS stock_cache (
    code TEXT PRIMARY KEY,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    record_count INTEGER DEFAULT 0,
    last_update TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 3. 后端 API

### 3.1 数据管理 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/data/stats` | GET | 获取统计信息（股票数、记录数、数据库大小、更新时间） |
| `/api/data/sync` | POST | 同步指定股票数据 |
| `/api/data/list` | GET | 获取已缓存股票列表 |
| `/api/data/delete` | DELETE | 删除指定股票的缓存数据 |

### 3.2 数据同步逻辑

```python
def sync_stock_data(code, start_date=None, end_date=None):
    # 1. 检查本地数据
    local_data = get_local_klines(code)

    if local_data:
        # 2. 获取最后更新日期
        last_date = get_last_update_date(code)

        # 3. 智能同步策略
        if days_since(last_date) > 30:
            # 增量同步：只获取最新数据
            new_data = fetch_from_akshare(code, start=last_date)
            insert_new_data(new_data)
        else:
            # 跳过（数据足够新）
            return {'status': 'skipped', 'reason': 'data_fresh'}
    else:
        # 全量同步
        new_data = fetch_from_akshare(code, start_date, end_date)
        insert_all_data(new_data)

    # 4. 更新 stock_cache 表
    update_cache_info(code)
```

### 3.3 K线数据读取逻辑（修改 stock.py）

```python
def fetch_kline_data(code, start, end):
    # 1. 优先从本地数据库读取
    local_data = get_local_klines(code, start, end)

    if local_data and is_data_fresh(code):
        return local_data

    # 2. 本地数据不新鲜，触发同步
    sync_result = sync_stock_data(code)

    # 3. 重新读取
    return get_local_klines(code, start, end)
```

## 4. 前端页面

### 4.1 路由

- 路径: `/data-management`
- 左侧导航: "数据管理" 菜单项

### 4.2 页面布局

```
┌─────────────────────────────────────────────────────┐
│ 数据管理                                            │
├─────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│ │ 股票数量    │ │ 数据记录    │ │ 数据库大小   │   │
│ │ 24         │ │ 48,600     │ │ 12.5 MB     │   │
│ └─────────────┘ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────────────────────┤
│ 同步控制                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│ │ 股票代码  │ │ 开始日期  │ │ 结束日期  │ │ 同步  │ │
│ └──────────┘ └──────────┘ └──────────┘ └───────┘ │
│ 同步策略: [智能同步 ▼]                             │
├─────────────────────────────────────────────────────┤
│ 缓存列表                              [删除过期]   │
│ ┌────┬────┬─────────┬─────────┬──────┬─────┐   │
│ │代码│名称│起始日期  │结束日期  │记录数│操作 │   │
│ ├────┼────┼─────────┼─────────┼──────┼─────┤   │
│ │... │... │...      │...      │...   │删除 │   │
│ └────┴────┴─────────┴─────────┴──────┴─────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.3 组件结构

```
pages/DataManagement.jsx
├── StatsCards (统计概览)
├── SyncControl (同步控制)
│   ├── StockInput
│   ├── DateRangePicker
│   └── SyncStrategySelect
├── CacheList (缓存列表)
│   └── DataTable
│       ├── Columns: code, name, date_range, record_count, actions
│       └── Actions: delete
└── BatchActions (批量操作)
```

### 4.4 API 调用

```javascript
// dataManagement.js
export const getDataStats = () => fetch('/api/data/stats');
export const getCacheList = () => fetch('/api/data/list');
export const syncStock = (data) => fetch('/api/data/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
export const deleteCache = (code) => fetch(`/api/data/delete?code=${code}`, {
  method: 'DELETE'
});
```

## 5. 文件改动清单

### 后端
- `backend/models.py` - 添加 stock_cache 表，klines 表增加 last_update
- `backend/routes/data.py` - 新增数据管理 API
- `backend/routes/stock.py` - 修改 fetch_kline_data 增加缓存逻辑

### 前端
- `frontend/src/pages/DataManagement.jsx` - 新增数据管理页面
- `frontend/src/services/api.js` - 封装数据管理 API（可选）
- `frontend/src/App.jsx` - 导航增加"数据管理"菜单

## 6. 同步策略说明

| 策略 | 条件 | 行为 |
|------|------|------|
| 智能同步 | 本地数据 >30天未更新 | 增量同步最新数据 |
| 增量同步 | 始终 | 只同步最新交易日 |
| 覆盖同步 | 始终 | 删除后重新下载全量 |

## 7. 错误处理

- 网络失败：返回友好提示，记录错误日志
- 数据源不可用：自动切换备用源（如有）
- 同步冲突：使用事务保证数据一致性
