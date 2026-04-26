import React, { useState, useEffect } from 'react';
import KLineChart from '../components/KLineChart';
import IndicatorPanel from '../components/IndicatorPanel';
import StockSelector from '../components/StockSelector';
import StrategyEditor from '../components/StrategyEditor';
import BacktestResult from '../components/BacktestResult';

const HomePage = () => {
  const [stock, setStock] = useState({ code: '000001', name: '平安银行' });
  const [klineData, setKlineData] = useState([]);
  const [indicators, setIndicators] = useState(['MA']);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState({ name: '均线交叉策略', description: '经典双均线策略', conditions: { buy: 'MA5 > MA20', sell: 'MA5 < MA20' } });
  const [backtestResult, setBacktestResult] = useState(null);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);

  const loadKlineData = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock/kline/${code}?start=2024-01-01&end=2024-12-31`);
      const data = await res.json();
      setKlineData(data);
    } catch (err) {
      console.error('Failed to load kline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKlineData(stock.code);
  }, [stock.code]);

  const handleStockSelect = (s) => {
    if (s) {
      setStock(s);
    }
  };

  const handleBacktest = async () => {
    try {
      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: stock.code, strategy }),
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

      <div className="mb-4 flex gap-4 items-center">
        <StockSelector onSelect={handleStockSelect} />
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