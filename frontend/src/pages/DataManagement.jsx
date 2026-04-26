import React, { useState, useEffect } from 'react';

const SYNC_STRATEGIES = [
  { value: 'smart', label: '智能同步（数据>30天则更新）' },
  { value: 'incremental', label: '增量同步（始终获取最新）' },
  { value: 'overwrite', label: '覆盖同步（重新下载全部）' },
];

const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('sync');
  const [stats, setStats] = useState({ stock_count: 0, record_count: 0, db_size: 0, last_update: 'N/A' });
  const [cacheList, setCacheList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 市场管理状态
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState('A股');
  const [stockList, setStockList] = useState([]);
  const [stockInfo, setStockInfo] = useState(null);
  const [showAddStock, setShowAddStock] = useState(false);

  // 同步表单
  const [syncCode, setSyncCode] = useState('');
  const [syncStart, setSyncStart] = useState('2020-01-01');
  const [syncEnd, setSyncEnd] = useState(new Date().toISOString().split('T')[0]);
  const [syncStrategy, setSyncStrategy] = useState('smart');

  // 新增股票表单
  const [newStock, setNewStock] = useState({
    code: '', name: '', market: 'A股', industry: '', listing_date: '', total_shares: '', float_shares: '', mainBusiness: ''
  });

  useEffect(() => {
    loadStats();
    loadCacheList();
    loadMarkets();
  }, []);

  useEffect(() => {
    if (activeTab === 'market') {
      loadStockList();
    }
  }, [activeTab, selectedMarket]);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/data/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCacheList(data);
    } catch (err) {
      console.error('Failed to load cache list:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkets = async () => {
    try {
      const res = await fetch('/api/stock/markets');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets:', err);
    }
  };

  const loadStockList = async () => {
    try {
      const res = await fetch(`/api/stock/stocks?market=${selectedMarket}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStockList(data);
    } catch (err) {
      console.error('Failed to load stock list:', err);
    }
  };

  const loadStockInfo = async (code) => {
    try {
      const res = await fetch(`/api/stock/stocks/${code}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStockInfo(data);
    } catch (err) {
      console.error('Failed to load stock info:', err);
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

  const handleAddStock = async () => {
    if (!newStock.code || !newStock.name) {
      alert('股票代码和名称不能为空');
      return;
    }

    try {
      const res = await fetch('/api/stock/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStock),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert('添加成功');
        setShowAddStock(false);
        setNewStock({ code: '', name: '', market: 'A股', industry: '', listing_date: '', total_shares: '', float_shares: '', mainBusiness: '' });
        loadStockList();
      }
    } catch (err) {
      console.error('Add stock failed:', err);
      alert('添加失败');
    }
  };

  const handleDeleteStock = async (code) => {
    if (!confirm(`确定删除 ${code}？`)) return;

    try {
      const res = await fetch(`/api/stock/stocks/${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        loadStockList();
        if (stockInfo?.code === code) setStockInfo(null);
      }
    } catch (err) {
      console.error('Delete stock failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">数据管理</h1>

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-t text-sm font-medium ${
              activeTab === 'sync'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            数据同步
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 rounded-t text-sm font-medium ${
              activeTab === 'market'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            市场管理
          </button>
        </div>

        {/* 数据同步标签页 */}
        {activeTab === 'sync' && (
          <>
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
              <h2 className="text-lg font-bold text-white mb-4">同步控制</h2>
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
                <h2 className="text-lg font-bold text-white">缓存列表</h2>
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
          </>
        )}

        {/* 市场管理标签页 */}
        {activeTab === 'market' && (
          <div className="grid grid-cols-3 gap-6">
            {/* 市场列表 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-white mb-4">市场列表</h2>
              <div className="space-y-2">
                {markets.map(m => (
                  <div
                    key={m.code}
                    onClick={() => setSelectedMarket(m.market_type || m.name)}
                    className={`p-3 rounded cursor-pointer ${
                      selectedMarket === (m.market_type || m.name)
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-400">{m.market_type || m.description || 'A股'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 股票清单 */}
            <div className="col-span-2 bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">股票清单 - {selectedMarket}</h2>
                <button
                  onClick={() => setShowAddStock(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                >
                  添加股票
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-300">代码</th>
                      <th className="px-3 py-2 text-left text-gray-300">名称</th>
                      <th className="px-3 py-2 text-left text-gray-300">行业</th>
                      <th className="px-3 py-2 text-left text-gray-300">上市日期</th>
                      <th className="px-3 py-2 text-center text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockList.map(stock => (
                      <tr
                        key={stock.code}
                        className="border-t border-gray-700 hover:bg-gray-700 cursor-pointer"
                        onClick={() => loadStockInfo(stock.code)}
                      >
                        <td className="px-3 py-2 text-white">{stock.code}</td>
                        <td className="px-3 py-2 text-gray-300">{stock.name}</td>
                        <td className="px-3 py-2 text-gray-400">{stock.industry || '-'}</td>
                        <td className="px-3 py-2 text-gray-400">{stock.listing_date || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.code); }}
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

              {/* 股票基本信息 */}
              {stockInfo && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <h3 className="font-bold text-white mb-3">股票信息 - {stockInfo.code}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-400">名称:</span> {stockInfo.name}</div>
                    <div><span className="text-gray-400">市场:</span> {stockInfo.market || 'A股'}</div>
                    <div><span className="text-gray-400">行业:</span> {stockInfo.industry || '-'}</div>
                    <div><span className="text-gray-400">上市日期:</span> {stockInfo.listing_date || '-'}</div>
                    <div><span className="text-gray-400">总股本:</span> {stockInfo.total_shares || '-'}</div>
                    <div><span className="text-gray-400">流通股本:</span> {stockInfo.float_shares || '-'}</div>
                    <div className="col-span-2"><span className="text-gray-400">主营业务:</span> {stockInfo.mainBusiness || '-'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 添加股票弹窗 */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">添加股票</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">股票代码 *</label>
                  <input
                    type="text"
                    value={newStock.code}
                    onChange={e => setNewStock({...newStock, code: e.target.value})}
                    placeholder="如: 000001"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">股票名称 *</label>
                  <input
                    type="text"
                    value={newStock.name}
                    onChange={e => setNewStock({...newStock, name: e.target.value})}
                    placeholder="如: 平安银行"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">市场</label>
                <select
                  value={newStock.market}
                  onChange={e => setNewStock({...newStock, market: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                >
                  <option value="A股">A股</option>
                  <option value="港股">港股</option>
                  <option value="美股">美股</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">行业</label>
                <input
                  type="text"
                  value={newStock.industry}
                  onChange={e => setNewStock({...newStock, industry: e.target.value})}
                  placeholder="如: 银行"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">上市日期</label>
                <input
                  type="date"
                  value={newStock.listing_date}
                  onChange={e => setNewStock({...newStock, listing_date: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">总股本</label>
                  <input
                    type="text"
                    value={newStock.total_shares}
                    onChange={e => setNewStock({...newStock, total_shares: e.target.value})}
                    placeholder="如: 19405600653"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">流通股本</label>
                  <input
                    type="text"
                    value={newStock.float_shares}
                    onChange={e => setNewStock({...newStock, float_shares: e.target.value})}
                    placeholder="如: 19405600653"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">主营业务</label>
                <textarea
                  value={newStock.mainBusiness}
                  onChange={e => setNewStock({...newStock, mainBusiness: e.target.value})}
                  placeholder="主营业务描述..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddStock(false);
                  setNewStock({ code: '', name: '', market: 'A股', industry: '', listing_date: '', total_shares: '', float_shares: '', mainBusiness: '' });
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                取消
              </button>
              <button
                onClick={handleAddStock}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;