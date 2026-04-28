import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 股票API
export const stockAPI = {
  search: (q) => api.get(`/stocks/search?q=${q}`),
  getList: () => api.get('/stocks/list'),
  getKline: (code, start, end) => api.get(`/stocks/${code}/kline?start=${start}&end=${end}`),
  getIndicators: (code) => api.get(`/stocks/${code}/indicators`),
  getKlineWithIndicators: (code, start, end) => api.get(`/stocks/${code}/kline-with-indicators?start=${start}&end=${end}`)
}

// 回测API
export const backtestAPI = {
  run: (data) => api.post('/backtest', data),
  getRecords: (limit = 50) => api.get(`/records/backtest?limit=${limit}`),
  getRecord: (id) => api.get(`/records/backtest/${id}`),
  deleteRecord: (id) => api.delete(`/records/backtest/${id}`),
  getStrategies: () => api.get('/strategies')
}

// AI问诊API
export const aiAPI = {
  diagnose: (data) => api.post('/ai/diagnosis', data),
  getRecords: (limit = 50) => api.get(`/records/diagnosis?limit=${limit}`),
  deleteRecord: (id) => api.delete(`/records/diagnosis/${id}`)
}

// 数据管理-个股信息API
export const stockInfoAPI = {
  getSources: () => api.get('/data/stock-info/sources'),
  getList: (params) => api.get('/data/stock-info/list', { params }),
  getByCode: (code) => api.get(`/data/stock-info/${code}`),
  refresh: () => api.post('/data/stock-info/refresh'),
}

// 交易日历API
export const calendarAPI = {
  getSources: () => api.get('/data/trading-calendar/sources'),
  getList: (params) => api.get('/data/trading-calendar/list', { params }),
  isTradingDay: (date) => api.get(`/data/trading-calendar/is-trading-day?date=${date}`),
  refresh: () => api.post('/data/trading-calendar/refresh'),
}

export default api