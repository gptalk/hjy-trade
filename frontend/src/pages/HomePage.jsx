import React, { useState, useEffect } from 'react';
import KLineChart from '../components/KLineChart';
import IndicatorPanel from '../components/IndicatorPanel';
import StockSelector from '../components/StockSelector';
import StrategyEditor from '../components/StrategyEditor';
import BacktestResult from '../components/BacktestResult';

const PERIODS = [
  { value: '1', label: '1分' },
  { value: '5', label: '5分' },
  { value: '15', label: '15分' },
  { value: '30', label: '30分' },
  { value: '60', label: '60分' },
  { value: 'D', label: '日K' },
  { value: 'W', label: '周K' },
  { value: 'M', label: '月K' },
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
  const [stock, setStock] = useState({ code: '000001', name: '平安银行' });
  const [klineData, setKlineData] = useState([]);
  const [indicators, setIndicators] = useState(['MA']);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState({ name: '均线交叉策略', description: '经典双均线策略', conditions: { buy: 'MA5 > MA20', sell: 'MA5 < MA20' } });
  const [backtestResult, setBacktestResult] = useState(null);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);

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
    loadKlineData(stock.code, startDate, endDate);
  }, [stock.code]);

  const handleStockSelect = (s) => {
    if (s) {
      setStock(s);
    }
  };

  const handleQuery = () => {
    loadKlineData(stock.code, startDate, endDate);
  };

  const handleBacktest = async () => {
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: stock.code,
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
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">K线回测</h1>
        <div className="flex gap-2 items-center">
          <span className="text-gray-600">当前: {stock.code} {stock.name}</span>
          <button
            onClick={() => setShowStrategyEditor(!showStrategyEditor)}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            {showStrategyEditor ? '收起策略' : '编辑策略'}
          </button>
          <button
            onClick={handleBacktest}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            运行回测
          </button>
        </div>
      </div>

      {showStrategyEditor && (
        <div className="mb-4">
          <StrategyEditor
            strategy={strategy}
            onSave={(s) => setStrategy(s)}
            onTest={handleBacktest}
          />
        </div>
      )}

      {backtestResult && <BacktestResult result={backtestResult} />}

      {/* 查询条件区域 */}
      <div className="mb-4 p-4 bg-gray-50 rounded flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">股票</label>
          <StockSelector onSelect={handleStockSelect} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">周期</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <button
          onClick={handleQuery}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          查询
        </button>
      </div>

      <div className="mb-4">
        <IndicatorPanel selected={indicators} onChange={setIndicators} />
      </div>

      {loading ? (
        <div className="text-center py-10">加载中...</div>
      ) : (
        <KLineChart data={klineData} indicators={indicators} />
      )}
    </div>
  );
};

export default HomePage;
