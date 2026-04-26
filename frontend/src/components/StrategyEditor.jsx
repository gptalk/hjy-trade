import React, { useState, useEffect } from 'react';

const StrategyEditor = ({ strategy, onSave, onTest }) => {
  const [name, setName] = useState(strategy?.name || '均线交叉策略');
  const [description, setDescription] = useState(strategy?.description || '经典双均线策略');
  const [conditions, setConditions] = useState(strategy?.conditions || { buy: 'MA5 > MA20', sell: 'MA5 < MA20' });
  const [strategies, setStrategies] = useState([]);
  const [showList, setShowList] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    if (strategy) {
      setName(strategy.name || '');
      setDescription(strategy.description || '');
      setConditions(strategy.conditions || { buy: 'MA5 > MA20', sell: 'MA5 < MA20' });
      setEditingId(strategy.id || null);
    }
  }, [strategy]);

  const loadStrategies = async () => {
    try {
      const res = await fetch('/api/strategy/');
      const data = await res.json();
      setStrategies(data);
    } catch (err) {
      console.error('Failed to load strategies:', err);
    }
  };

  const handleSave = async () => {
    const strategyData = { name, description, conditions };
    try {
      if (editingId) {
        await fetch(`/api/strategy/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(strategyData),
        });
      } else {
        await fetch('/api/strategy/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(strategyData),
        });
      }
      onSave(strategyData);
      loadStrategies();
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save strategy:', err);
    }
  };

  const handleLoad = (s) => {
    setName(s.name);
    setDescription(s.description || '');
    setConditions(JSON.parse(s.conditions || '{}'));
    setEditingId(s.id);
    setShowList(false);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/strategy/${id}`, { method: 'DELETE' });
      loadStrategies();
      if (editingId === id) {
        setEditingId(null);
        setName('均线交叉策略');
        setDescription('经典双均线策略');
        setConditions({ buy: 'MA5 > MA20', sell: 'MA5 < MA20' });
      }
    } catch (err) {
      console.error('Failed to delete strategy:', err);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setName('均线交叉策略');
    setDescription('经典双均线策略');
    setConditions({ buy: 'MA5 > MA20', sell: 'MA5 < MA20' });
  };

  const updateCondition = (key, value) => {
    setConditions({ ...conditions, [key]: value });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">策略编辑</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowList(!showList)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            {showList ? '收起' : '策略列表'}
          </button>
          <button
            onClick={handleNew}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            新建
          </button>
        </div>
      </div>

      {/* 策略列表 */}
      {showList && (
        <div className="mb-4 bg-gray-700 rounded p-2 max-h-48 overflow-y-auto">
          {strategies.map(s => (
            <div
              key={s.id}
              className="flex justify-between items-center px-3 py-2 hover:bg-gray-600 rounded cursor-pointer"
              onClick={() => handleLoad(s)}
            >
              <div>
                <div className="text-white text-sm">{s.name}</div>
                <div className="text-gray-400 text-xs">{s.description}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                className="text-red-400 hover:text-red-300 text-sm ml-2"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">策略名称</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例如: 均线交叉策略"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">策略描述</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="策略描述..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">买入条件</label>
          <input
            value={conditions.buy}
            onChange={e => updateCondition('buy', e.target.value)}
            placeholder="例如: MA5 > MA20"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
          <div className="text-xs text-gray-500 mt-1">支持: MA5, MA10, MA20, MA30, EMA12, EMA26, MACD, RSI6</div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">卖出条件</label>
          <input
            value={conditions.sell}
            onChange={e => updateCondition('sell', e.target.value)}
            placeholder="例如: MA5 < MA20"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>
      </div>

      {/* 预设条件快捷选择 */}
      <div className="mt-4">
        <label className="block text-sm text-gray-400 mb-2">快捷条件</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { updateCondition('buy', 'MA5 > MA20'); updateCondition('sell', 'MA5 < MA20'); }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
          >
            MA金叉/死叉
          </button>
          <button
            onClick={() => { updateCondition('buy', 'MACD > MACD_signal'); updateCondition('sell', 'MACD < MACD_signal'); }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
          >
            MACD金叉/死叉
          </button>
          <button
            onClick={() => { updateCondition('buy', 'RSI6 < 30'); updateCondition('sell', 'RSI6 > 70'); }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
          >
            RSI超卖/超买
          </button>
          <button
            onClick={() => { updateCondition('buy', 'close < BOLL_lower'); updateCondition('sell', 'close > BOLL_upper'); }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
          >
            BOLL突破
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          保存策略
        </button>
        {onTest && (
          <button
            onClick={onTest}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
          >
            回测
          </button>
        )}
      </div>
    </div>
  );
};

export default StrategyEditor;