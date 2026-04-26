import React from 'react';

const BacktestResult = ({ result }) => {
  if (!result) return null;

  const getVal = (val, decimals = 2, suffix = '') => {
    if (val === undefined || val === null || isNaN(val)) return '-';
    if (typeof val === 'number') {
      const formatted = val.toFixed(decimals);
      return suffix === '%' ? `${val >= 0 ? '+' : ''}${formatted}%` : formatted;
    }
    return val;
  };

  const getStr = (val) => val ?? '-';

  const stats = [
    { label: '初始资金', value: `¥${getVal(result.initial_capital, 0)}`, color: '' },
    { label: '最终资金', value: `¥${getVal(result.final_capital, 2)}`, color: '' },
    { label: '收益率', value: getVal(result.return_rate, 2, '%'), color: result.return_rate >= 0 ? 'text-green-500' : 'text-red-500' },
    { label: '买入持有', value: getVal(result.benchmark_return, 2, '%'), color: '' },
    { label: 'Alpha', value: getVal(result.alpha, 2, '%'), color: result.alpha >= 0 ? 'text-green-500' : 'text-red-500' },
    { label: '夏普比', value: getVal(result.sharpe_ratio, 2), color: '' },
    { label: '交易次数', value: result.trade_count ?? 0, color: '' },
    { label: '胜率', value: getVal(result.win_rate, 1, '%'), color: '' },
    { label: '最大回撤', value: getVal(result.max_drawdown, 2, '%'), color: 'text-red-500' },
    { label: '最深浮亏', value: getVal(result.max_float_loss, 2, '%'), color: 'text-red-500' },
    { label: '持有回撤', value: getVal(result.hold_drawdown, 2, '%'), color: 'text-red-500' },
    { label: '平均持仓', value: `${getVal(result.avg_hold_days, 1)}天`, color: '' },
    { label: '最长持仓', value: `${result.max_hold_days ?? 0}天`, color: '' },
  ];

  const trades = result.trades || [];

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">回测结果</h3>
        <div className="text-sm text-gray-400">
          {getStr(result.stock_code)} | {getStr(result.start_date)} ~ {getStr(result.end_date)}
          {result.strategy_name && <span className="ml-2 text-blue-400">| {getStr(result.strategy_name)}</span>}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
            <div className={`text-base font-bold ${stat.color || 'text-white'}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* 交易列表 */}
      {trades.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">交易明细</h4>
          <div className="bg-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-300">序号</th>
                  <th className="px-3 py-2 text-left text-gray-300">买入日期</th>
                  <th className="px-3 py-2 text-right text-gray-300">买入价</th>
                  <th className="px-3 py-2 text-left text-gray-300">卖出日期</th>
                  <th className="px-3 py-2 text-right text-gray-300">卖出价</th>
                  <th className="px-3 py-2 text-right text-gray-300">持仓天数</th>
                  <th className="px-3 py-2 text-right text-gray-300">收益率</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, idx) => (
                  <tr key={idx} className="border-t border-gray-600">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 text-white">{getStr(trade.buy_date)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">¥{getVal(trade.buy_price, 2)}</td>
                    <td className="px-3 py-2 text-white">{getStr(trade.sell_date)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">¥{getVal(trade.sell_price, 2)}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{trade.hold_days ?? '-'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${(trade.return ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {getVal(trade.return * 100, 2, '%')}
                    </td>
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

export default BacktestResult;