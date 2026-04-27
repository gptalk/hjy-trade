import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import KLineBacktest from './views/KLineBacktest'
import StrategyRadar from './views/StrategyRadar'
import BacktestRecords from './views/BacktestRecords'
import DiagnosisRecords from './views/DiagnosisRecords'
import AIDiagnosis from './views/AIDiagnosis'
import StockInfo from './views/StockInfo'

function Navigation() {
  const location = useLocation()
  const [page, setPage] = useState('kline')

  const isActive = (path) => {
    if (path === '/' && page === 'kline') return 'active'
    if (path === '/radar' && page === 'radar') return 'active'
    if (path === '/records' && page === 'records') return 'active'
    if (path === '/diagnosis' && page === 'diagnosis') return 'active'
    if (path === '/data/stock-info' && page === 'data-stock') return 'active'
    return ''
  }

  return (
    <nav className="nav">
      <span className="nav-brand">小宇量化</span>
      <Link to="/" className={page === 'kline' ? 'active' : ''} onClick={() => setPage('kline')}>K线回测</Link>
      <Link to="/radar" className={page === 'radar' ? 'active' : ''} onClick={() => setPage('radar')}>策略雷达</Link>
      <Link to="/records" className={page === 'records' ? 'active' : ''} onClick={() => setPage('records')}>回测记录</Link>
      <Link to="/diagnosis" className={page === 'diagnosis' ? 'active' : ''} onClick={() => setPage('diagnosis')}>AI问诊</Link>
      <Link to="/data/stock-info" className={page === 'data-stock' ? 'active' : ''} onClick={() => setPage('data-stock')}>数据管理</Link>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <div className="container">
        <Routes>
          <Route path="/" element={<KLineBacktest />} />
          <Route path="/radar" element={<StrategyRadar />} />
          <Route path="/records" element={<BacktestRecords />} />
          <Route path="/diagnosis" element={<AIDiagnosis />} />
          <Route path="/data/stock-info" element={<StockInfo />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App