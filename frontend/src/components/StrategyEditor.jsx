import React, { useState } from 'react';

const StrategyEditor = ({ strategy, onSave, onTest }) => {
  const [name, setName] = useState(strategy?.name || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [conditions, setConditions] = useState(strategy?.conditions || { buy: 'MA5 > MA20', sell: 'MA5 < MA20' });

  const handleSave = () => {
    onSave({ name, description, conditions });
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-bold mb-4">策略编辑</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">策略名称</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例如: 均线交叉策略"
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">描述</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="策略描述..."
          className="w-full p-2 border rounded"
          rows={2}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">买入条件</label>
        <input
          value={conditions.buy}
          onChange={e => setConditions({...conditions, buy: e.target.value})}
          placeholder="例如: MA5 > MA20"
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">卖出条件</label>
        <input
          value={conditions.sell}
          onChange={e => setConditions({...conditions, sell: e.target.value})}
          placeholder="例如: MA5 < MA20"
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存策略
        </button>
        {onTest && (
          <button
            onClick={onTest}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            回测
          </button>
        )}
      </div>
    </div>
  );
};

export default StrategyEditor;