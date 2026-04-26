import React, { useState, useEffect } from 'react';

const StrategyRadar = () => {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  // 加载策略列表
  useEffect(() => {
    const loadStrategies = async () => {
      try {
        const res = await fetch('/api/radar/strategies');
        const data = await res.json();
        setStrategies(data);
        if (data.length > 0) {
          setSelectedStrategy(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load strategies:', err);
      } finally {
        setLoadingStrategies(false);
      }
    };
    loadStrategies();
  }, []);

  // 执行扫描
  const scan = async () => {
    if (!selectedStrategy) {
      alert('请先选择策略');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const res = await fetch('/api/radar/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_id: parseInt(selectedStrategy),
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
      });

      if (!res.ok) {
        throw new Error('扫描失败');
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Scan error:', err);
      alert('扫描失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">策略雷达</h2>

      <div className="flex gap-4 mb-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">选择策略</label>
          {loadingStrategies ? (
            <div className="px-4 py-2 border rounded bg-gray-100">加载中...</div>
          ) : (
            <select
              value={selectedStrategy}
              onChange={e => setSelectedStrategy(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={scan}
          disabled={loading || !selectedStrategy}
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? '扫描中...' : '开始扫描'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">正在扫描A股...</p>
        </div>
      )}

      {!loading && results.length === 0 && (
        <p className="text-gray-500 text-center py-10">
          点击"开始扫描"按钮扫描所有A股
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-gray-600">
            找到 {results.length} 只符合条件的股票
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">股票代码</th>
                  <th className="p-3 border">股票名称</th>
                  <th className="p-3 border">收益率</th>
                  <th className="p-3 border">胜率</th>
                  <th className="p-3 border">交易次数</th>
                  <th className="p-3 border">最大回撤</th>
                  <th className="p-3 border">夏普比</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 border font-mono">{r.code}</td>
                    <td className="p-3 border">{r.name}</td>
                    <td className={`p-3 border font-semibold ${r.return_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.return_rate?.toFixed(2)}%
                    </td>
                    <td className="p-3 border">{r.win_rate?.toFixed(1)}%</td>
                    <td className="p-3 border">{r.trade_count}</td>
                    <td className="p-3 border text-red-600">{r.max_drawdown?.toFixed(2)}%</td>
                    <td className="p-3 border">{r.sharpe_ratio?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyRadar;