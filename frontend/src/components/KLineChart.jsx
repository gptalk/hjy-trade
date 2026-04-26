import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const KLineChart = ({ data = [], indicators = [] }) => {
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

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['K线', 'MA5', 'MA10', 'MA20'],
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
        }
      ]
    };

    chart.setOption(option);

    return () => {
      // 清理
    };
  }, [data, indicators]);

  return <div ref={chartRef} style={{ width: '100%', height: '600px', backgroundColor: '#1a1a2e' }} />;
};

export default KLineChart;