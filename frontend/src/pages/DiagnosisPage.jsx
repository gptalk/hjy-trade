import React, { useState } from 'react';

const DiagnosisPage = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    if (!code.trim()) {
      setError('请输入股票代码');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/diagnosis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '分析失败');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">AI 股票问诊</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="输入股票代码 (如: 000001)"
          className="px-4 py-2 border rounded flex-1"
          onKeyDown={e => e.key === 'Enter' && analyze()}
        />
        <button
          onClick={analyze}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '分析中...' : '分析'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* 股票基本信息 */}
          <div className="p-4 bg-white border rounded shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-2xl font-bold">{result.code}</span>
              <span className="text-xl">{result.name}</span>
              <span className={`text-lg font-semibold ${result.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {result.change >= 0 ? '+' : ''}{result.change}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">当前价</div>
                <div className="text-lg font-bold">${result.price}</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">趋势</div>
                <div className={`text-lg font-bold ${result.trend === '上涨' ? 'text-red-600' : result.trend === '下跌' ? 'text-green-600' : 'text-gray-600'}`}>
                  {result.trend}
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">信号</div>
                <div className="text-lg font-bold text-blue-600">{result.signal}</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm text-gray-500">RSI</div>
                <div className="text-lg font-bold">{result.rsi}</div>
              </div>
            </div>
          </div>

          {/* 均线和成交量 */}
          <div className="p-4 bg-white border rounded shadow-sm">
            <h3 className="font-semibold mb-3">均线与成交量</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-500">MA5:</span>
                <span className="ml-2 font-semibold">{result.ma5}</span>
              </div>
              <div>
                <span className="text-gray-500">MA10:</span>
                <span className="ml-2 font-semibold">{result.ma10}</span>
              </div>
              <div>
                <span className="text-gray-500">MA20:</span>
                <span className="ml-2 font-semibold">{result.ma20}</span>
              </div>
              <div>
                <span className="text-gray-500">量比:</span>
                <span className="ml-2 font-semibold">{result.volume_ratio}</span>
                <span className="text-gray-500 text-sm ml-1">({result.volume_signal})</span>
              </div>
            </div>
          </div>

          {/* 支撑阻力位 */}
          <div className="p-4 bg-white border rounded shadow-sm">
            <h3 className="font-semibold mb-3">支撑与阻力</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-sm text-green-600">支撑位</div>
                <div className="text-2xl font-bold text-green-700">${result.support}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-sm text-red-600">阻力位</div>
                <div className="text-2xl font-bold text-red-700">${result.resistance}</div>
              </div>
            </div>
          </div>

          {/* 分析结论 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold mb-2 text-blue-800">分析结论</h3>
            <p className="text-blue-900">{result.analysis}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisPage;