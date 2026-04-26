import React from 'react';

const INDICATORS = [
  { key: 'MA', label: 'MA' },
  { key: 'EXPMA', label: 'EXPMA' },
  { key: 'MACD', label: 'MACD' },
  { key: 'KDJ', label: 'KDJ' },
  { key: 'RSI', label: 'RSI' },
  { key: 'BOLL', label: 'BOLL' }
];

const IndicatorPanel = ({ selected = [], onChange }) => {
  const toggleIndicator = (key) => {
    if (selected.includes(key)) {
      onChange(selected.filter(i => i !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {INDICATORS.map(ind => (
        <button
          key={ind.key}
          onClick={() => toggleIndicator(ind.key)}
          className={`px-3 py-1 rounded text-xs font-medium ${
            selected.includes(ind.key)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {ind.label}
        </button>
      ))}
    </div>
  );
};

export default IndicatorPanel;
