import React, { useState, useEffect } from 'react';

const INDICATOR_DOCS = {
  'MA5/MA10/MA20/MA30': '简单移动平均线',
  'EMA12/EMA26': '指数移动平均线',
  'MACD/MACD_signal': 'MACD主线/信号线',
  'RSI6/RSI12': '相对强弱指标',
  'BOLL_upper/BOLL_lower/BOLL_mid': '布林带上轨/下轨/中轨',
  'close': '收盘价',
  'open/high/low': '开盘价/最高价/最低价',
};

const OPERATORS = ['>', '<', '>=', '<=', '==', '&&', '||'];

const StrategyEditor = ({ strategy, onSave, onTest }) => {
  const [name, setName] = useState(strategy?.name || '均线交叉策略');
  const [description, setDescription] = useState(strategy?.description || '经典双均线策略');
  const [conditions, setConditions] = useState(strategy?.conditions || { buy: 'MA5 > MA20', sell: 'MA5 < MA20' });
  const [strategies, setStrategies] = useState([]);
  const [showList, setShowList] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
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

  // 生成策略代码
  const generateStrategyCode = () => {
    const indent = '  ';
    return `// 策略名称: ${name}
// 描述: ${description || '无'}

// 策略条件
const strategy = {
  name: "${name}",
  buy: {
    condition: "${conditions.buy}",
    // 示例: MA5 > MA20
  },
  sell: {
    condition: "${conditions.sell}",
    // 示例: MA5 < MA20
  }
};

// 可用指标
const indicators = {
  // 移动平均线
  MA5: close的5日均线,
  MA10: close的10日均线,
  MA20: close的20日均线,
  MA30: close的30日均线,

  // 指数移动平均线
  EMA12: close的12日指数均线,
  EMA26: close的26日指数均线,

  // MACD
  MACD: EMA12 - EMA26,
  MACD_signal: MACD的9日均线,

  // RSI
  RSI6: 6日相对强弱指标,
  RSI12: 12日相对强弱指标,

  // 布林带
  BOLL_upper: 中轨 + 2倍标准差,
  BOLL_mid: 20日均线,
  BOLL_lower: 中轨 - 2倍标准差,

  // 价格
  close: 收盘价,
  open: 开盘价,
  high: 最高价,
  low: 最低价,
};

// 支持的运算符
// > < >= <= == &&(且) ||(或)

// 买入条件: ${conditions.buy}
// 卖出条件: ${conditions.sell}
`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">策略编辑</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            {showDocs ? '收起' : '代码/文档'}
          </button>
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

      {/* 策略代码预览 */}
      {showDocs && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">策略代码</label>
            <button
              onClick={() => navigator.clipboard.writeText(generateStrategyCode())}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
            >
              复制代码
            </button>
          </div>
          <pre className="bg-gray-900 rounded p-3 text-sm text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
            {generateStrategyCode()}
          </pre>

          {/* 指标文档 */}
          <div className="mt-4">
            <label className="text-sm text-gray-400 mb-2 block">可用指标</label>
            <div className="bg-gray-900 rounded p-3 text-sm">
              <table className="w-full text-gray-300">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">指标</th>
                    <th className="pb-2">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(INDICATOR_DOCS).map(([indicator, desc]) => (
                    <tr key={indicator} className="border-t border-gray-800">
                      <td className="py-2 text-green-400 font-mono">{indicator}</td>
                      <td className="py-2 text-gray-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-gray-500 mb-1">运算符</div>
                <div className="flex gap-2 flex-wrap">
                  {OPERATORS.map(op => (
                    <span key={op} className="px-2 py-0.5 bg-gray-800 rounded text-yellow-400 font-mono text-xs">
                      {op}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-gray-500 mb-1">示例条件</div>
                <div className="text-gray-400 text-xs space-y-1">
                  <div><span className="text-green-400">MA金叉:</span> MA5 {'>'} MA20</div>
                  <div><span className="text-green-400">MACD金叉:</span> MACD {'>'} MACD_signal</div>
                  <div><span className="text-green-400">RSI超卖:</span> RSI6 {'<'} 30</div>
                  <div><span className="text-green-400">布林下轨:</span> close {'<'} BOLL_lower</div>
                  <div><span className="text-green-400">组合条件:</span> MA5 {'>'} MA20 {'&&'} RSI6 {'<'} 30</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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