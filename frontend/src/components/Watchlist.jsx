import React, { useState, useEffect } from 'react';

const Watchlist = ({ onSelectStock }) => {
  const [groups, setGroups] = useState([]);
  const [showAddStock, setShowAddStock] = useState(false);
  const [addStockGroup, setAddStockGroup] = useState('');
  const [addStockCode, setAddStockCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);

  const loadWatchlists = async () => {
    try {
      const res = await fetch('/api/watchlist/');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const addGroupAndStock = async () => {
    if (!newGroupName.trim() || !addStockCode.trim()) return;

    try {
      await fetch('/api/watchlist/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: newGroupName.trim(), stock_code: addStockCode.trim() })
      });
      setShowAddStock(false);
      setNewGroupName('');
      setAddStockCode('');
      setAddStockGroup('');
      loadWatchlists();
    } catch (err) {
      console.error('Failed to add stock:', err);
    }
  };

  const addStockToGroup = async () => {
    if (!addStockGroup || !addStockCode.trim()) return;

    try {
      await fetch('/api/watchlist/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: addStockGroup, stock_code: addStockCode.trim() })
      });
      setShowAddStock(false);
      setAddStockCode('');
      loadWatchlists();
    } catch (err) {
      console.error('Failed to add stock:', err);
    }
  };

  const removeStock = async (groupName, stockCode) => {
    try {
      await fetch(`/api/watchlist/${groupName}/${stockCode}`, { method: 'DELETE' });
      loadWatchlists();
    } catch (err) {
      console.error('Failed to remove stock:', err);
    }
  };

  const deleteGroup = async (groupName) => {
    if (!confirm(`确定删除分组 "${groupName}" 吗？`)) return;
    try {
      await fetch(`/api/watchlist/${groupName}`, { method: 'DELETE' });
      loadWatchlists();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleStockClick = (stockCode) => {
    if (onSelectStock) {
      onSelectStock(stockCode);
    }
    setSelectedStock(stockCode);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">自选股</h2>
        <button
          onClick={() => setShowAddStock(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 添加股票
        </button>
      </div>

      {/* 添加股票弹窗 */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80">
            <h3 className="text-lg font-bold text-white mb-4">添加股票</h3>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">分组</label>
              <select
                value={addStockGroup}
                onChange={e => {
                  setAddStockGroup(e.target.value);
                  if (e.target.value === '__new__') {
                    setNewGroupName('');
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="">选择分组</option>
                {groups.map(g => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
                <option value="__new__">+ 新建分组</option>
              </select>
            </div>

            {addStockGroup === '__new__' && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-1">新建分组名称</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="分组名称"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">股票代码</label>
              <input
                type="text"
                value={addStockCode}
                onChange={e => setAddStockCode(e.target.value)}
                placeholder="如: 000001"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddStock(false);
                  setNewGroupName('');
                  setAddStockCode('');
                  setAddStockGroup('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (addStockGroup === '__new__') {
                    addGroupAndStock();
                  } else {
                    addStockToGroup();
                  }
                }}
                disabled={!addStockCode.trim() || (!addStockGroup || (addStockGroup === '__new__' && !newGroupName.trim()))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-gray-500 text-center py-10">还没有自选股，点击"添加股票"创建一个分组吧</p>
      ) : (
        groups.map(group => (
          <div key={group.name} className="mb-4 p-3 border border-gray-700 rounded bg-gray-800">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg text-white">{group.name}</h3>
              <button
                onClick={() => deleteGroup(group.name)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                删除分组
              </button>
            </div>
            {group.stocks.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无股票</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.stocks.map(s => (
                  <span
                    key={s.stock_code}
                    onClick={() => handleStockClick(s.stock_code)}
                    className={`px-3 py-1 rounded cursor-pointer flex items-center gap-2 ${
                      selectedStock === s.stock_code
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {s.stock_code}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStock(group.name, s.stock_code);
                      }}
                      className="text-gray-400 hover:text-red-300 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Watchlist;