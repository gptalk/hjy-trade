import React, { useState, useEffect } from 'react';

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
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadCacheList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/list');
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCacheList(data);
    } catch (err) {
      console.error('Failed to load cache list:', err);
    } finally {
      setLoading(false);
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
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
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
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
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
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
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
            <div className="text-2xl font-bold">{stats.record_count?.toLocaleString() ?? 0}</div>
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
                    <tr key={stock.code} className="border-t border-gray-700 hover:bg-gray-700">
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
