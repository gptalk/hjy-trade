import React, { useState, useEffect } from 'react';

const Watchlist = ({ onSelectStock }) => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
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

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    // 创建分组只需添加一个股票即可创建
    setShowAddGroup(false);
    setNewGroupName('');
  };

  const addStockToGroup = async (groupName) => {
    const code = prompt(`添加股票到 "${groupName}" 分组:\n请输入股票代码`);
    if (!code) return;

    try {
      await fetch('/api/watchlist/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupName, stock_code: code })
      });
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
          onClick={() => setShowAddGroup(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 新增分组
        </button>
      </div>

      {showAddGroup && (
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="分组名称"
            className="px-3 py-2 border rounded mr-2"
          />
          <button
            onClick={addGroup}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            创建
          </button>
          <button
            onClick={() => setShowAddGroup(false)}
            className="px-4 py-2 ml-2 text-gray-600"
          >
            取消
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-gray-500 text-center py-10">还没有自选股，先创建一个分组吧</p>
      ) : (
        groups.map(group => (
          <div key={group.name} className="mb-4 p-3 border rounded">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">{group.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addStockToGroup(group.name)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  + 添加
                </button>
                <button
                  onClick={() => deleteGroup(group.name)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  删除分组
                </button>
              </div>
            </div>
            {group.stocks.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无股票</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.stocks.map(s => (
                  <span
                    key={s.stock_code}
                    onClick={() => handleStockClick(s.stock_code)}
                    className={`px-3 py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 flex items-center gap-2 ${
                      selectedStock === s.stock_code ? 'bg-blue-100 border border-blue-300' : ''
                    }`}
                  >
                    {s.stock_code}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStock(group.name, s.stock_code);
                      }}
                      className="text-red-500 hover:text-red-700 font-bold"
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