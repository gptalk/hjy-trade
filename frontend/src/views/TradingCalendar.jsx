import React, { useState, useEffect } from 'react'
import { calendarAPI } from '../api'

export default function TradingCalendar() {
  const [data, setData] = useState({ total: 0, data: [] })
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState({})
  const [page, setPage] = useState(1)
  const [pageSize] = useState(100)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [isTradingFilter, setIsTradingFilter] = useState('')
  const [checkDate, setCheckDate] = useState('')
  const [checkResult, setCheckResult] = useState(null)

  const fetchSources = async () => {
    try {
      const res = await calendarAPI.getSources()
      setSources(res.data || {})
    } catch (e) {
      console.error(e)
    }
  }

  const fetchList = async (pg = page, y = year, m = month, it = isTradingFilter) => {
    setLoading(true)
    try {
      const params = { page: pg, page_size: pageSize, year: y, month: m }
      if (it !== '') params.is_trading = it
      const res = await calendarAPI.getList(params)
      setData(res.data || { total: 0, data: [] })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSources()
    fetchList()
  }, [])

  const handleSearch = () => {
    setPage(1)
    fetchList(1, year, month, isTradingFilter)
  }

  const handlePageChange = (pg) => {
    setPage(pg)
    fetchList(pg, year, month, isTradingFilter)
  }

  const handleCheck = async () => {
    if (!checkDate) return
    try {
      const res = await calendarAPI.isTradingDay(checkDate)
      setCheckResult(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const totalPages = Math.ceil(data.total / pageSize) || 1

  return (
    <div style={{ padding: 24 }}>
      <h2>交易日历</h2>

      {/* 数据源状态栏 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <span>数据源状态：</span>
        <span style={{ color: sources.akshare?.available ? '#52c41a' : '#ff4d4f' }}>
          ● AKShare {sources.akshare?.available ? '可用' : '不可用'}
        </span>
        <span>总日历天数：{sources.total_days || 0}</span>
        <span>最后交易日：{sources.latest_trade_date || '-'}</span>
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          {[year - 2, year - 1, year, year + 1, year + 2].map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <select value={isTradingFilter} onChange={e => setIsTradingFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          <option value="">全部</option>
          <option value="1">仅交易日</option>
          <option value="0">仅非交易日</option>
        </select>
        <button onClick={handleSearch} disabled={loading}
          style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1890ff', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '加载中...' : '查询'}
        </button>
      </div>

      {/* 日期判断工具 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }} />
        <button onClick={handleCheck}
          style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1890ff', color: '#fff', cursor: 'pointer' }}>
          判断是否交易日
        </button>
        {checkResult && (
          <span style={{ lineHeight: '32px', fontWeight: 'bold', color: checkResult.is_trading ? '#52c41a' : '#ff4d4f' }}>
            {checkResult.date} → {checkResult.is_trading ? '交易' : '休市'}
          </span>
        )}
      </div>

      {/* 列表 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>序号</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>交易所</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>日期</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>时区</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>是否交易</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>上一交易日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}>加载中...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}>暂无数据</td></tr>
            ) : data.data.map((row, idx) => (
              <tr key={row.trade_date} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#999' }}>{(page - 1) * pageSize + idx + 1}</td>
                <td style={{ padding: '8px 12px' }}>{row.exchange || '上交所'}</td>
                <td style={{ padding: '8px 12px' }}>{row.trade_date}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.timezone || 'Asia/Shanghai'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <span style={{
                    background: row.is_trading ? '#52c41a' : '#ff4d4f',
                    color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12
                  }}>
                    {row.is_trading ? '1交易' : '0休市'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', color: '#666' }}>{row.previous_trading_day || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <span>共 {data.total} 条，第 {page}/{totalPages} 页</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>上一页</button>
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>下一页</button>
        </div>
      </div>
    </div>
  )
}
