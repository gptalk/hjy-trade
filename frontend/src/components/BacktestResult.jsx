import React from 'react';

const BacktestResult = ({ result }) => {
  if (!result) return null;

  const stats = [
    { label: '最终资金', value: `$${result.final_capital?.toLocaleString()}` },
    { label: '收益率', value: `${result.return_rate?.toFixed(2)}%`, color: result.return_rate >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: '胜率', value: `${result.win_rate?.toFixed(1)}%` },
    { label: '交易次数', value: result.trade_count },
    { label: '最大回撤', value: `${result.max_drawdown?.toFixed(2)}%`, color: 'text-red-600' },
    { label: '夏普比', value: result.sharpe_ratio?.toFixed(2) },
  ];

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-semibold mb-3">回测结果</h3>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="text-center">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className={`text-xl font-bold ${stat.color || 'text-gray-800'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BacktestResult;
