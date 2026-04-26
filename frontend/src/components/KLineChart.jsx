import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const KLineChart = ({ data = [], indicators = [], trades = [] }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    const dates = data.map(d => d.date);
    const klineData = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map(d => d.volume);

    // MA数据
    const ma5Data = data.map(d => d.MA5);
    const ma10Data = data.map(d => d.MA10);
    const ma20Data = data.map(d => d.MA20);

    // 构建日期到索引的映射
    const dateIndexMap = {};
    dates.forEach((d, i) => { dateIndexMap[d] = i; });

    // 买卖点数据
    const buyPoints = [];
    const sellPoints = [];

    trades.forEach(trade => {
      const buyIdx = dateIndexMap[trade.buy_date];
      const sellIdx = dateIndexMap[trade.sell_date];

      if (buyIdx !== undefined) {
        const kline = data[buyIdx];
        buyPoints.push({
          value: [buyIdx, kline.low * 0.98],
          return: trade.return,
          hold_days: trade.hold_days
        });
      }

      if (sellIdx !== undefined) {
        const kline = data[sellIdx];
        sellPoints.push({
          value: [sellIdx, kline.high * 1.02],
          return: trade.return,
          hold_days: trade.hold_days
        });
      }
    });

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: function(params) {
          const kline = params.find(p => p.seriesName === 'K线');
          if (!kline) return '';
          const d = data[kline.dataIndex];
          let html = `<strong>${d.date}</strong><br/>`;
          html += `开盘: ¥${d.open?.toFixed(2)}<br/>`;
          html += `收盘: ¥${d.close?.toFixed(2)}<br/>`;
          html += `最高: ¥${d.high?.toFixed(2)}<br/>`;
          html += `最低: ¥${d.low?.toFixed(2)}<br/>`;
          html += `成交量: ${(d.volume / 10000).toFixed(0)}万<br/>`;
          return html;
        }
      },
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20', '买入', '卖出'],
        top: 0
      },
      grid: [
        { left: '10%', right: '8%', top: 40, height: '50%' },
        { left: '10%', right: '8%', top: '65%', height: '15%' }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0, boundaryGap: false, splitLine: { show: false } },
        { type: 'category', data: dates, gridIndex: 1, splitLine: { show: false } }
      ],
      yAxis: [
        { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#444' } } },
        { scale: true, gridIndex: 1, splitLine: { lineStyle: { color: '#444' } } }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: klineData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: {
            color: '#ef5350',
            color0: '#26a69a',
            borderColor: '#ef5350',
            borderColor0: '#26a69a'
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5Data,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          lineStyle: { width: 1 },
          symbol: 'none'
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10Data,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          lineStyle: { width: 1 },
          symbol: 'none'
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20Data,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          lineStyle: { width: 1 },
          symbol: 'none'
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumes,
          xAxisIndex: 1,
          yAxisIndex: 1,
          itemStyle: {
            color: '#7fbe9e'
          }
        },
        // 买入标记
        {
          name: '买入',
          type: 'scatter',
          data: buyPoints,
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: 'triangle',
          symbolSize: 12,
          itemStyle: {
            color: '#26a69a'
          },
          tooltip: {
            formatter: function(params) {
              const p = params.data;
              return `买入<br/>收益率: ${(p.return * 100).toFixed(2)}%<br/>持仓: ${p.hold_days}天`;
            }
          }
        },
        // 卖出标记
        {
          name: '卖出',
          type: 'scatter',
          data: sellPoints,
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: 'triangle',
          symbolSize: 12,
          itemStyle: {
            color: '#ef5350'
          },
          tooltip: {
            formatter: function(params) {
              const p = params.data;
              return `卖出<br/>收益率: ${(p.return * 100).toFixed(2)}%<br/>持仓: ${p.hold_days}天`;
            }
          }
        }
      ]
    };

    chart.setOption(option, true);

    return () => {
      // 清理
    };
  }, [data, indicators, trades]);

  return <div ref={chartRef} style={{ width: '100%', height: '600px', backgroundColor: '#1a1a2e' }} />;
};

export default KLineChart;