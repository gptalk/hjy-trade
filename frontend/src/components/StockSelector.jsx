import React, { useState } from 'react';

const StockSelector = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  const search = async () => {
    if (!query) return;
    try {
      const res = await fetch(`/api/stock/search?q=${query}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelect = (e) => {
    const code = e.target.value;
    if (code) {
      const stock = results.find(s => s.code === code);
      setSelectedStock(stock);
      onSelect(stock);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="输入股票代码或名称"
        className="px-3 py-2 border rounded"
        onKeyDown={e => e.key === 'Enter' && search()}
      />
      <button
        onClick={search}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        搜索
      </button>
      <select onChange={handleSelect} className="px-3 py-2 border rounded">
        <option value="">选择股票</option>
        {results.map(s => (
          <option key={s.code} value={s.code}>
            {s.code} - {s.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StockSelector;