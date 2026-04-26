import React, { useState } from 'react';

const StockSelector = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const search = async () => {
    if (!query) return;
    try {
      const res = await fetch(`/api/stock/search?q=${query}`);
      const data = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelect = (stock) => {
    setQuery('');
    setShowDropdown(false);
    onSelect({ ...stock, market: 'A股' });
  };

  return (
    <div className="relative flex gap-2">
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          if (e.target.value.length >= 2) {
            search();
          }
        }}
        placeholder="输入代码"
        className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        onKeyDown={e => e.key === 'Enter' && search()}
      />
      <button
        onClick={search}
        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
      >
        +
      </button>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map(s => (
            <div
              key={s.code}
              onClick={() => handleSelect(s)}
              className="px-3 py-2 hover:bg-gray-600 cursor-pointer text-sm text-white"
            >
              {s.code} {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockSelector;
