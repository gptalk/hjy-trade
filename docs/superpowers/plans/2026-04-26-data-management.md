# 本地数据库 + 数据管理页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立本地SQLite数据库缓存A股K线数据，提供数据管理页面实现同步/查看/删除功能

**Architecture:** 本地缓存优先 + 智能同步策略。后端优先从本地数据库读取K线数据，数据过期时自动触发增量同步。前端提供独立数据管理页面。

**Tech Stack:** React + Flask + SQLite + akshare + TailwindCSS

---

## 任务清单

### Task 1: 数据库模型更新

**Files:**
- Modify: `backend/models.py:53-80` (init_db函数)

**Steps:**

- [ ] **Step 1: 修改 init_db 添加 stock_cache 表和索引**

在 `backend/models.py` 的 `init_db()` 函数中，`klines` 表创建之后添加：

```python
    # stock_cache 表：跟踪已缓存股票信息
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_cache (
            code TEXT PRIMARY KEY,
            name TEXT,
            start_date TEXT,
            end_date TEXT,
            record_count INTEGER DEFAULT 0,
            last_update TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 为 klines 表添加 last_update 字段（如果不存在）
    try:
        cursor.execute('ALTER TABLE klines ADD COLUMN last_update TEXT DEFAULT CURRENT_TIMESTAMP')
    except:
        pass  # 列已存在

    # 创建索引加速查询
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_klines_code_date ON klines(code, date)')
```

- [ ] **Step 2: 运行验证**

```bash
cd /home/yellow/kaggle/trade/hjy-trade/backend && python -c "from models import init_db; init_db(); print('DB OK')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/models.py && git commit -m "feat: add stock_cache table and klines index"
```

---

### Task 2: 数据管理 API

**Files:**
- Create: `backend/routes/data.py`

**Steps:**

- [ ] **Step 1: 创建 backend/routes/data.py**

```python
from flask import Blueprint, jsonify, request
import os
import sqlite3
from datetime import datetime, timedelta
import pandas as pd
import sys
sys.path.append('..')
from models import get_db_connection
from routes.stock import fetch_kline_data as fetch_from_akshare

bp = Blueprint('data', __name__, url_prefix='/api/data')

@bp.route('/stats', methods=['GET'])
def get_stats():
    """获取数据库统计信息"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 股票数量
        stock_count = cursor.execute('SELECT COUNT(*) FROM stock_cache').fetchone()[0]

        # 数据记录数
        record_count = cursor.execute('SELECT COUNT(*) FROM klines').fetchone()[0]

        # 最后更新时间
        last_update = cursor.execute('SELECT MAX(last_update) FROM stock_cache').fetchone()[0] or 'N/A'

        conn.close()

        # 数据库大小
        db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'stock_data.db')
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path) / (1024 * 1024)  # MB
        else:
            db_size = 0

        return jsonify({
            'stock_count': stock_count,
            'record_count': record_count,
            'db_size': round(db_size, 2),
            'last_update': last_update
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/list', methods=['GET'])
def get_cache_list():
    """获取已缓存股票列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        stocks = cursor.execute('SELECT * FROM stock_cache ORDER BY last_update DESC').fetchall()
        conn.close()
        return jsonify([dict(s) for s in stocks])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/sync', methods=['POST'])
def sync_stock():
    """同步股票数据"""
    data = request.json
    code = data.get('code')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    strategy = data.get('strategy', 'smart')  # smart, incremental, overwrite

    if not code:
        return jsonify({'error': '股票代码不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查本地数据
        existing = cursor.execute('SELECT * FROM stock_cache WHERE code = ?', (code,)).fetchone()

        if strategy == 'smart' and existing:
            last_update = existing['last_update']
            if last_update:
                days_since = (datetime.now() - datetime.fromisoformat(last_update)).days
                if days_since <= 30:
                    conn.close()
                    return jsonify({
                        'status': 'skipped',
                        'reason': 'data_fresh',
                        'message': f'数据最新（{days_since}天前更新）'
                    })

        # 增量同步
        if strategy in ('smart', 'incremental') and existing:
            last_date = existing['end_date']
            if last_date:
                from datetime import datetime as dt
                start = (dt.fromisoformat(last_date) - timedelta(days=7)).strftime('%Y-%m-%d')
            else:
                start = start_date or '2020-01-01'
        else:
            start = start_date or '2020-01-01'

        end = end_date or datetime.now().strftime('%Y-%m-%d')

        # 获取股票名称
        name = existing['name'] if existing else code

        # 获取数据
        klines = fetch_from_akshare(code, start, end)

        if not klines:
            conn.close()
            return jsonify({'error': '获取数据失败'}), 500

        # 插入数据
        for kline in klines:
            cursor.execute('''
                INSERT OR REPLACE INTO klines (code, date, open, high, low, close, volume, last_update)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (code, kline['date'], kline['open'], kline['high'], kline['low'],
                  kline['close'], kline['volume'], datetime.now().isoformat()))

        # 更新 stock_cache
        dates = [k['date'] for k in klines]
        cursor.execute('''
            INSERT OR REPLACE INTO stock_cache (code, name, start_date, end_date, record_count, last_update)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (code, name, min(dates), max(dates), len(klines), datetime.now().isoformat()))

        conn.commit()
        conn.close()

        return jsonify({
            'status': 'success',
            'records': len(klines),
            'date_range': f"{min(dates)} ~ {max(dates)}"
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/delete', methods=['DELETE'])
def delete_cache():
    """删除指定股票的缓存数据"""
    code = request.args.get('code')

    if not code:
        return jsonify({'error': '股票代码不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 删除 klines
        cursor.execute('DELETE FROM klines WHERE code = ?', (code,))

        # 删除 stock_cache
        cursor.execute('DELETE FROM stock_cache WHERE code = ?', (code,))

        conn.commit()
        conn.close()

        return jsonify({'status': 'success', 'message': f'已删除 {code} 的缓存数据'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/batch-delete', methods=['DELETE'])
def batch_delete():
    """批量删除过期数据"""
    days = request.args.get('days', 365, type=int)

    try:
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()

        # 获取过期的股票代码
        old_stocks = cursor.execute(
            'SELECT code FROM stock_cache WHERE last_update < ?', (cutoff,)
        ).fetchall()

        deleted_count = 0
        for row in old_stocks:
            cursor.execute('DELETE FROM klines WHERE code = ?', (row['code'],))
            cursor.execute('DELETE FROM stock_cache WHERE code = ?', (row['code'],))
            deleted_count += 1

        conn.commit()
        conn.close()

        return jsonify({
            'status': 'success',
            'deleted_count': deleted_count,
            'cutoff_date': cutoff
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

- [ ] **Step 2: 在 app.py 注册蓝图**

在 `backend/app.py` 中添加：

```python
from routes.data import bp as data_bp
app.register_blueprint(data_bp)
```

- [ ] **Step 3: 测试 API**

```bash
curl -s http://localhost:5000/api/data/stats
curl -s http://localhost:5000/api/data/list
```

- [ ] **Step 4: 提交**

```bash
git add backend/routes/data.py backend/app.py && git commit -m "feat: add data management API endpoints"
```

---

### Task 3: 修改 stock.py 优先读取本地缓存

**Files:**
- Modify: `backend/routes/stock.py` (fetch_kline_data 函数)

**Steps:**

- [ ] **Step 1: 修改 fetch_kline_data 函数**

在 `fetch_kline_data` 函数开头添加本地数据库读取逻辑：

```python
def fetch_kline_data(code, start='2020-01-01', end='2024-12-31'):
    """获取K线数据（本地缓存优先）"""

    # 1. 尝试从本地数据库读取
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        rows = cursor.execute('''
            SELECT code, date, open, high, low, close, volume,
                   MA5, MA10, MA20, MA30, EMA12, EMA26, MACD, MACD_signal,
                   RSI6, RSI12, BOLL_mid, BOLL_upper, BOLL_lower
            FROM klines
            WHERE code = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
        ''', (code, start, end)).fetchall()

        conn.close()

        if rows and len(rows) > 0:
            # 检查数据是否足够新（30天内）
            last_update = rows[-1]['date'] if rows else None
            if last_update:
                from datetime import datetime as dt
                days_since = (dt.now() - dt.fromisoformat(last_update)).days
                if days_since <= 30:
                    # 数据足够新，直接返回
                    klines = []
                    for row in rows:
                        k = {
                            'date': row['date'],
                            'open': float(row['open']),
                            'high': float(row['high']),
                            'low': float(row['low']),
                            'close': float(row['close']),
                            'volume': int(row['volume']) if row['volume'] else 0,
                        }
                        # 添加指标
                        for col in ['MA5', 'MA10', 'MA20', 'MA30', 'EMA12', 'EMA26',
                                   'MACD', 'MACD_signal', 'RSI6', 'RSI12',
                                   'BOLL_mid', 'BOLL_upper', 'BOLL_lower']:
                            if row[col] is not None:
                                k[col] = float(row[col])
                        klines.append(k)
                    return klines

    except Exception as e:
        pass  # 继续尝试从网络获取

    # 2. 从网络获取数据
    # ... (保留原有代码)
```

- [ ] **Step 2: 添加 get_db_connection 导入**

在文件顶部添加：
```python
from models import get_db_connection
```

- [ ] **Step 3: 测试**

```bash
curl -s "http://localhost:5000/api/stock/kline/000001?start=2025-01-01&end=2026-01-01" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Count: {len(d)}')"
```

- [ ] **Step 4: 提交**

```bash
git add backend/routes/stock.py && git commit -m "feat: add local cache lookup in fetch_kline_data"
```

---

### Task 4: 前端数据管理页面

**Files:**
- Create: `frontend/src/pages/DataManagement.jsx`

**Steps:**

- [ ] **Step 1: 创建 frontend/src/pages/DataManagement.jsx**

```jsx
import React, { useState, useEffect } from 'react';

const PERIODS = [
  { value: 'D', label: '日K' },
  { value: 'W', label: '周K' },
  { value: 'M', label: '月K' },
];

const SYNC_STRATEGIES = [
  { value: 'smart', label: '智能同步（数据>30天则更新）' },
  { value: 'incremental', label: '增量同步（始终获取最新）' },
  { value: 'overwrite', label: '覆盖同步（重新下载全部）' },
];

const DataManagement = () => {
  const [stats, setStats] = useState({ stock_count: 0, record_count: 0, db_size: 0, last_update: 'N/A' });
  const [cacheList, setCacheList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 同步表单
  const [syncCode, setSyncCode] = useState('');
  const [syncStart, setSyncStart] = useState('2020-01-01');
  const [syncEnd, setSyncEnd] = useState(new Date().toISOString().split('T')[0]);
  const [syncStrategy, setSyncStrategy] = useState('smart');

  useEffect(() => {
    loadStats();
    loadCacheList();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/data/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadCacheList = async () => {
    try {
      const res = await fetch('/api/data/list');
      const data = await res.json();
      setCacheList(data);
    } catch (err) {
      console.error('Failed to load cache list:', err);
    }
  };

  const handleSync = async () => {
    if (!syncCode) {
      alert('请输入股票代码');
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: syncCode,
          start_date: syncStart,
          end_date: syncEnd,
          strategy: syncStrategy
        }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert(`同步成功：${data.records} 条记录 (${data.date_range})`);
        loadStats();
        loadCacheList();
      }
    } catch (err) {
      console.error('Sync failed:', err);
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (code) => {
    if (!confirm(`确定删除 ${code} 的缓存数据？`)) return;

    try {
      const res = await fetch(`/api/data/delete?code=${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        loadStats();
        loadCacheList();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleBatchDelete = async () => {
    const days = prompt('删除多少天前的缓存数据？（输入天数）', '365');
    if (!days) return;

    try {
      const res = await fetch(`/api/data/batch-delete?days=${days}`, { method: 'DELETE' });
      const data = await res.json();
      alert(`已删除 ${data.deleted_count} 只股票的缓存数据`);
      loadStats();
      loadCacheList();
    } catch (err) {
      console.error('Batch delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">数据管理</h1>

        {/* 统计概览 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">股票数量</div>
            <div className="text-2xl font-bold">{stats.stock_count}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">数据记录</div>
            <div className="text-2xl font-bold">{stats.record_count?.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">数据库大小</div>
            <div className="text-2xl font-bold">{stats.db_size} MB</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">最后更新</div>
            <div className="text-lg font-bold truncate">{stats.last_update}</div>
          </div>
        </div>

        {/* 同步控制 */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold mb-4">同步控制</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">股票代码</label>
              <input
                type="text"
                value={syncCode}
                onChange={e => setSyncCode(e.target.value)}
                placeholder="如: 000001"
                className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">开始日期</label>
              <input
                type="date"
                value={syncStart}
                onChange={e => setSyncStart(e.target.value)}
                className="w-36 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">结束日期</label>
              <input
                type="date"
                value={syncEnd}
                onChange={e => setSyncEnd(e.target.value)}
                className="w-36 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">同步策略</label>
              <select
                value={syncStrategy}
                onChange={e => setSyncStrategy(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {SYNC_STRATEGIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {syncing ? '同步中...' : '同步'}
            </button>
          </div>
        </div>

        {/* 缓存列表 */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">缓存列表</h2>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm"
            >
              删除过期数据
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : cacheList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无缓存数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-300">代码</th>
                    <th className="px-4 py-2 text-left text-gray-300">名称</th>
                    <th className="px-4 py-2 text-left text-gray-300">起始日期</th>
                    <th className="px-4 py-2 text-left text-gray-300">结束日期</th>
                    <th className="px-4 py-2 text-right text-gray-300">记录数</th>
                    <th className="px-4 py-2 text-left text-gray-300">最后更新</th>
                    <th className="px-4 py-2 text-center text-gray-300">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cacheList.map(stock => (
                    <tr key={stock.code} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-white">{stock.code}</td>
                      <td className="px-4 py-2 text-gray-300">{stock.name || '-'}</td>
                      <td className="px-4 py-2 text-gray-300">{stock.start_date || '-'}</td>
                      <td className="px-4 py-2 text-gray-300">{stock.end_date || '-'}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{stock.record_count?.toLocaleString()}</td>
                      <td className="px-4 py-2 text-gray-300">{stock.last_update || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDelete(stock.code)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
```

- [ ] **Step 2: 构建验证**

```bash
cd /home/yellow/kaggle/trade/hjy-trade/frontend && npm run build 2>&1 | tail -10
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/DataManagement.jsx && git commit -m "feat: add data management page"
```

---

### Task 5: 添加导航菜单

**Files:**
- Modify: `frontend/src/App.jsx`

**Steps:**

- [ ] **Step 1: 查看当前 App.jsx 结构**

```bash
head -50 /home/yellow/kaggle/trade/hjy-trade/frontend/src/App.jsx
```

- [ ] **Step 2: 添加 DataManagement 路由和导航**

在 `App.jsx` 中：

1. 添加导入：
```jsx
import DataManagement from './pages/DataManagement';
```

2. 在路由配置中添加：
```jsx
<Route path="/data-management" element={<DataManagement />} />
```

3. 在侧边栏导航中添加菜单项：
```jsx
<Link to="/data-management" className="...">数据管理</Link>
```

- [ ] **Step 3: 构建验证**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/App.jsx && git commit -m "feat: add data management page route and nav"
```

---

## 执行顺序

1. Task 1: 数据库模型更新
2. Task 2: 数据管理 API
3. Task 3: 修改 stock.py 优先读取本地缓存
4. Task 4: 前端数据管理页面
5. Task 5: 添加导航菜单

## 验证清单

- [ ] 数据库表创建成功
- [ ] `/api/data/stats` 返回正确统计
- [ ] `/api/data/list` 返回缓存列表
- [ ] `/api/data/sync` 同步成功
- [ ] `/api/data/delete` 删除成功
- [ ] K线数据从缓存读取
- [ ] 前端数据管理页面正常显示
- [ ] 导航菜单可访问新页面
