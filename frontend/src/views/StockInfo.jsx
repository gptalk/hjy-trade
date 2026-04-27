import React, { useState, useEffect } from 'react'
import { stockInfoAPI } from '../api'

const SOURCE_LABELS = {
  baostock: { text: 'baostock', color: '#1890ff' },
  akshare: { text: 'AKShare', color: '#52c41a' },
  tushare: { text: 'Tushare', color: '#fa8c16' },
}

function SourceBadge({ source }) {
  const label = SOURCE_LABELS[source] || { text: source, color: '#999' }
  return (
    <span style={{
      background: label.color, color: '#fff', padding: '2px 8px',
      borderRadius: 4, fontSize: 12
    }}>
      {label.text}
    </span>
  )
}

export default function StockInfo() {
  const [data, setData] = useState({ total: 0, data: [] })
  const [sources, setSources] = useState({ baostock: {}, akshare: {}, tushare: {} })
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [market, setMarket] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [selectedStock, setSelectedStock] = useState(null)

  const fetchSources = async () => {
    try {
      const res = await stockInfoAPI.getSources()
      setSources(res.data)
    } catch (e) {
      console.error('获取数据源状态失败', e)
    }
  }

  const fetchList = async (pg = page, mkt = market, kw = search) => {
    setLoading(true)
    try {
      const res = await stockInfoAPI.getList({ page: pg, page_size: pageSize, market: mkt, search: kw })
      setData(res.data)
    } catch (e) {
      console.error('获取列表失败', e)
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
    fetchList(1, market, search)
  }

  const handleMarketChange = (mkt) => {
    setMarket(mkt)
    setPage(1)
    fetchList(1, mkt, search)
  }

  const handlePageChange = (pg) => {
    setPage(pg)
    fetchList(pg, market, search)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await stockInfoAPI.refresh()
      setTimeout(async () => {
        await fetchSources()
        await fetchList()
      }, 5000)
    } catch (e) {
      console.error('刷新失败', e)
    } finally {
      setRefreshing(false)
    }
  }

  const totalPages = Math.ceil(data.total / pageSize)

  return (
    <div style={{ padding: 24 }}>
      <h2>个股信息</h2>

      {/* 数据源状态栏 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
        <span>数据源状态：</span>
        <span style={{ color: sources.baostock?.available ? '#52c41a' : '#ff4d4f' }}>
          ● baostock {sources.baostock?.available ? '可用' : '不可用'}
        </span>
        <span style={{ color: sources.akshare?.available ? '#52c41a' : '#ff4d4f' }}>
          ● AKShare {sources.akshare?.available ? '可用' : '不可用'}
        </span>
        <span style={{ color: sources.tushare?.available ? '#52c41a' : '#ff4d4f' }}>
          ● Tushare {sources.tushare?.available ? '可用' : '不可用'}
        </span>
        <span>股票数量：{sources.stock_count || 0}</span>
        <span>最后刷新：{sources.last_full_refresh || '从未全量刷新'}</span>
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="搜索代码或名称"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{ padding: '6px 12px', width: 200, borderRadius: 4, border: '1px solid #d9d9d9' }}
        />
        <select value={market} onChange={e => handleMarketChange(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
          <option value="all">全部市场</option>
          <option value="sh">上证</option>
          <option value="sz">深证</option>
        </select>
        <button onClick={handleSearch} style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#1890ff', color: '#fff', cursor: 'pointer' }}>查询</button>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ padding: '6px 16px', borderRadius: 4, border: '1px solid #d9d9d9', background: refreshing ? '#f5f5f5' : '#fff', cursor: refreshing ? 'not-allowed' : 'pointer' }}>
          {refreshing ? '刷新中...' : '全量刷新'}
        </button>
      </div>

      {/* 表格 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>代码</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>简称</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>市场</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>总股本(万股)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>流通股(万股)</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>上市日期</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>数据源</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}>加载中...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}>暂无数据</td></tr>
            ) : data.data.map(stock => (
              <tr key={stock.code} onClick={() => setSelectedStock(selectedStock?.code === stock.code ? null : stock)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px' }}>{stock.code}</td>
                <td style={{ padding: '8px 12px' }}>{stock.name}</td>
                <td style={{ padding: '8px 12px' }}>{stock.market === 'sh' ? '上证' : stock.market === 'sz' ? '深证' : stock.market}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stock.total_share != null ? stock.total_share.toLocaleString() : '-'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{stock.float_share != null ? stock.float_share.toLocaleString() : '-'}</td>
                <td style={{ padding: '8px 12px' }}>{stock.list_date || '-'}</td>
                <td style={{ padding: '8px 12px' }}><SourceBadge source={stock.source} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <span>共 {data.total} 条，第 {page}/{totalPages || 1} 页</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>上一页</button>
          <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #d9d9d9', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>下一页</button>
        </div>
      </div>

      {/* 详情展开 */}
      {selectedStock && (
        <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8' }}>
          <h3 style={{ marginBottom: 12 }}>{selectedStock.name}（{selectedStock.code}）详细信息</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>股票代码：{selectedStock.code}</div>
            <div>股票简称：{selectedStock.name}</div>
            <div>市场：{selectedStock.market === 'sh' ? '上证' : selectedStock.market === 'sz' ? '深证' : selectedStock.market}</div>
            <div>股票类型：{selectedStock.stock_type || '-'}</div>
            <div>上市状态：{selectedStock.status === '1' ? '上市' : selectedStock.status}</div>
            <div>上市日期：{selectedStock.list_date || '-'}</div>
            <div>总股本（万股）：{selectedStock.total_share != null ? selectedStock.total_share.toLocaleString() : '-'}</div>
            <div>流通股（万股）：{selectedStock.float_share != null ? selectedStock.float_share.toLocaleString() : '-'}</div>
            <div>数据来源：<SourceBadge source={selectedStock.source} /></div>
            <div>更新时间：{selectedStock.updated_at || '-'}</div>
          </div>
        </div>
      )}
    </div>
  )
}