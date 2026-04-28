import React, { useState, useEffect } from 'react'
import { calendarAPI } from '../api'

function WeekHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
      {['周日','周一','周二','周三','周四','周五','周六'].map(d => (
        <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontWeight: 'bold', color: '#666', background: '#fafafa', borderRadius: 4 }}>{d}</div>
      ))}
    </div>
  )
}

export default function TradingCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState({ total: 0, data: [] })
  const [checkDate, setCheckDate] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState({})

  const fetchCalendar = async (y, m) => {
    setLoading(true)
    try {
      const res = await calendarAPI.getList(y, m)
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSources = async () => {
    try {
      const res = await calendarAPI.getSources()
      setSources(res.data?.akshare || {})
    } catch (e) {
      console.error(e)
    }
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

  useEffect(() => {
    fetchSources()
    fetchCalendar(year, month)
  }, [])

  useEffect(() => {
    fetchCalendar(year, month)
  }, [year, month])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const blanks = Array(firstDay).fill(null)

  const isTradeDaySet = new Set(data.data.map(d => d.date))

  const today = now.getFullYear() === year && (now.getMonth() + 1) === month
    ? now.getDate() : null

  return (
    <div style={{ padding: 24 }}>
      <h2>交易日历</h2>

      {/* 数据源状态 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <span>数据源：</span>
        <span style={{ color: sources.available ? '#52c41a' : '#ff4d4f' }}>
          ● AKShare {sources.available ? '可用' : '不可用'}
        </span>
        <span>总交易日：{data.total} 天</span>
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          {[year-2, year-1, year, year+1, year+2].map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          {Array.from({length: 12}, (_, i) => i+1).map(m => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <button onClick={() => fetchCalendar(year, month)} disabled={loading}
          style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1890ff', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '加载中...' : '查询'}
        </button>
      </div>

      {/* 单日期判断 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }} />
        <button onClick={handleCheck}
          style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1890ff', color: '#fff', cursor: 'pointer' }}>
          判断是否交易日
        </button>
        {checkResult && (
          <span style={{ lineHeight: '32px', color: checkResult.is_trading_day ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
            {checkResult.date} {checkResult.is_trading_day ? '是交易日' : '非交易日'}
          </span>
        )}
      </div>

      {/* 日历网格 */}
      <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: '1px solid #e8e8e8' }}>
        <WeekHeader />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {blanks.map((_, i) => <div key={`b${i}`} />)}
          {Array.from({length: daysInMonth}, (_, i) => i+1).map(day => {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isTradeDay = isTradeDaySet.has(dateStr)
            const isToday = today === day
            return (
              <div key={day}
                style={{
                  textAlign: 'center',
                  padding: '10px 4px',
                  borderRadius: 4,
                  background: isToday ? '#1890ff' : isTradeDay ? '#e6f7ff' : '#f5f5f5',
                  color: isToday ? '#fff' : isTradeDay ? '#1890ff' : '#ccc',
                  fontWeight: isToday ? 'bold' : 'normal',
                  fontSize: 14,
                }}>
                {day}
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
          蓝色=今日，浅蓝=交易日，灰色=非交易日（本系统仅记录交易日，不记录节假日）
        </div>
      </div>
    </div>
  )
}