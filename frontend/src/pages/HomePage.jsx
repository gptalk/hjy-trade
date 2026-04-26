import React, { useState, useEffect } from 'react';
import KLineChart from '../components/KLineChart';
import IndicatorPanel from '../components/IndicatorPanel';
import StockSelector from '../components/StockSelector';
import StockListModal from '../components/StockListModal';
import StrategyEditor from '../components/StrategyEditor';
import BacktestResult from '../components/BacktestResult';

const PERIODS = [
  { value: 'D', label: '日K' },
  { value: 'W', label: '周K' },
  { value: 'M', label: '月K' },
  { value: '5', label: '5分钟' },
  { value: '15', label: '15分钟' },
  { value: '30', label: '30分钟' },
  { value: '60', label: '60分钟' },
];

const getDefaultEndDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getDefaultStartDate = () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return oneYearAgo.toISOString().split('T')[0];
};

const HomePage = () => {
  const [selectedStocks, setSelectedStocks] = useState([{ code: '000001', name: '平安银行', market: 'A股' }]);
  const [activeStock, setActiveStock] = useState('000001');
  const [klineData, setKlineData] = useState([]);
  const [indicators, setIndicators] = useState(['MA']);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState({ name: '均线交叉策略', description: '经典双均线策略', conditions: { buy: 'MA5 > MA20', sell: 'MA5 < MA20' } });
  const [backtestResult, setBacktestResult] = useState(null);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // 查询条件状态
  const [period, setPeriod] = useState('D');
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  const loadKlineData = async (code, start, end) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/kline/${code}?start=${start}&end=${end}`);
      const data = await res.json();
      setKlineData(data);
    } catch (err) {
      console.error('Failed to load kline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeStock) {
      loadKlineData(activeStock, startDate, endDate);
    }
  }, [activeStock, startDate, endDate]);

  const handleAddStock = (stock) => {
    if (stock && !selectedStocks.find(s => s.code === stock.code)) {
      const newStocks = [...selectedStocks, stock];
      setSelectedStocks(newStocks);
      setActiveStock(stock.code);
    }
  };

  const handleRemoveStock = (code) => {
    const newStocks = selectedStocks.filter(s => s.code !== code);
    setSelectedStocks(newStocks);
    if (activeStock === code && newStocks.length > 0) {
      setActiveStock(newStocks[0].code);
    }
  };

  const handleStockClick = (code) => {
    setActiveStock(code);
  };

  const handleQuery = () => {
    loadKlineData(activeStock, startDate, endDate);
  };

  const handleBacktest = async () => {
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeStock,
          strategy,
          start_date: startDate,
          end_date: endDate
        }),
      });
      const result = await res.json();
      setBacktestResult(result);
    } catch (err) {
      console.error('Backtest failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 顶部导航 */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">K线回测</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStrategyEditor(!showStrategyEditor)}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              {showStrategyEditor ? '收起策略' : '编辑策略'}
            </button>
            <button
              onClick={handleBacktest}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white"
            >
              策略回测
            </button>
          </div>
        </div>
      </div>

      {/* 已选股票标签栏 */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          {selectedStocks.map((s) => (
            <span
              key={s.code}
              onClick={() => handleStockClick(s.code)}
              className={`px-3 py-1 rounded cursor-pointer flex items-center gap-1 text-sm ${
                activeStock === s.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s.code} {s.market}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveStock(s.code);
                }}
                className="ml-1 text-gray-400 hover:text-white font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 策略编辑 */}
      {showStrategyEditor && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <StrategyEditor
            strategy={strategy}
            onSave={(s) => setStrategy(s)}
            onTest={handleBacktest}
          />
        </div>
      )}

      {/* 回测结果 */}
      {backtestResult && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <BacktestResult result={backtestResult} />
        </div>
      )}

      {/* 查询条件区域 */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">股票</label>
            <StockSelector onSelect={handleAddStock} />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">市场</label>
            <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
              <option value="A股">A股</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">周期</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>

          <button
            onClick={handleQuery}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium"
          >
            查询
          </button>

          <button
            onClick={() => setShowStockModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm font-medium"
          >
            查看A股列表
          </button>
        </div>
      </div>

      {/* 技术指标栏 */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex gap-2">
          <IndicatorPanel selected={indicators} onChange={setIndicators} />
        </div>
      </div>

      {/* 股票列表弹窗 */}
      {showStockModal && (
        <StockListModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSelect={handleAddStock}
        />
      )}

      {/* K线图区域 */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
          <KLineChart data={klineData} indicators={indicators} trades={backtestResult?.trades || []} />
        )}
      </div>

      {/* 底部版权 */}
      <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-800">
        免责声明：本平台仅供技术研究与策略回测参考，不构成任何投资建议
      </div>
    </div>
  );
};

export default HomePage;
