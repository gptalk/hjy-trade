import React, { useState, useEffect } from 'react';

const StockListModal = ({ isOpen, onClose, onSelect }) => {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStocks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (search) {
      const filtered = stocks.filter(s =>
        s.code.includes(search) || s.name.includes(search)
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  }, [search, stocks]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock/list');
      const data = await res.json();
      setStocks(data);
      setFilteredStocks(data);
    } catch (err) {
      console.error('Failed to load stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedStock) {
      onSelect({ ...selectedStock, market: 'A股' });
      setSearch('');
      setSelectedStock(null);
      onClose();
    }
  };

  const handleRowClick = (stock) => {
    setSelectedStock(stock);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[900px] max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">选择股票</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索股票代码或名称..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          />
        </div>

        {/* 股票列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">加载中...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">代码</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">名称</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">市场</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => (
                  <tr
                    key={stock.code}
                    onClick={() => handleRowClick(stock)}
                    className={`border-b border-gray-700 cursor-pointer ${
                      selectedStock?.code === stock.code
                        ? 'bg-blue-600'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <td className="px-4 py-2 text-white">{stock.code}</td>
                    <td className="px-4 py-2 text-white">{stock.name}</td>
                    <td className="px-4 py-2 text-gray-400">A股</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStock}
            className={`px-4 py-2 rounded text-white ${
              selectedStock
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockListModal;
