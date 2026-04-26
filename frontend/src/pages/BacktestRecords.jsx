import React, { useState, useEffect } from 'react';

const BacktestRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const deleteRecord = async (id) => {
    if (!confirm('确定删除这条回测记录吗？')) return;

    // 注意: 需要添加DELETE端点到backtest.py
    // 如果后端没有这个端点，先跳过删除功能
    alert('删除功能需要后端支持');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr.split('T')[0];
  };

  if (loading) {
    return <div className="p-4 text-center">加载中...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">回测记录</h2>

      {records.length === 0 ? (
        <p className="text-gray-500 text-center py-10">暂无回测记录</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border">策略</th>
                <th className="p-3 border">股票</th>
                <th className="p-3 border">周期</th>
                <th className="p-3 border">回测区间</th>
                <th className="p-3 border">初始资金</th>
                <th className="p-3 border">最终资金</th>
                <th className="p-3 border">收益率</th>
                <th className="p-3 border">胜率</th>
                <th className="p-3 border">交易次数</th>
                <th className="p-3 border">最大回撤</th>
                <th className="p-3 border">夏普比</th>
                <th className="p-3 border">时间</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 border">{r.strategy_name || '-'}</td>
                  <td className="p-3 border">{r.stock_code}</td>
                  <td className="p-3 border">{r.period || '日K'}</td>
                  <td className="p-3 border">
                    {r.start_date} ~ {r.end_date}
                  </td>
                  <td className="p-3 border">${r.initial_capital?.toLocaleString()}</td>
                  <td className="p-3 border">${r.final_capital?.toLocaleString()}</td>
                  <td className={`p-3 border font-semibold ${r.return_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.return_rate?.toFixed(2)}%
                  </td>
                  <td className="p-3 border">{r.win_rate?.toFixed(1)}%</td>
                  <td className="p-3 border">{r.trade_count}</td>
                  <td className="p-3 border text-red-600">{r.max_drawdown?.toFixed(2)}%</td>
                  <td className="p-3 border">{r.sharpe_ratio?.toFixed(2)}</td>
                  <td className="p-3 border text-sm text-gray-500">
                    {formatDate(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BacktestRecords;
