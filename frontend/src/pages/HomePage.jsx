import React, { useState, useEffect } from 'react';
import KLineChart from '../components/KLineChart';
import IndicatorPanel from '../components/IndicatorPanel';
import StockSelector from '../components/StockSelector';

const HomePage = () => {
  const [stock, setStock] = useState({ code: '000001', name: '平安银行' });
  const [klineData, setKlineData] = useState([]);
  const [indicators, setIndicators] = useState(['MA']);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">K线回测</h1>
        <div className="text-gray-600">
          当前: {stock.code} {stock.name}
        </div>
      </div>

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