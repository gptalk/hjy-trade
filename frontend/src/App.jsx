import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import WatchlistPage from './pages/WatchlistPage';

function App() {
  const [page, setPage] = useState('home');

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-800 text-white p-4">
        <div className="flex gap-6">
          <button
            onClick={() => setPage('home')}
            className={page === 'home' ? 'font-bold' : ''}
          >
            K线回测
          </button>
          <button
            onClick={() => setPage('radar')}
            className={page === 'radar' ? 'font-bold' : ''}
          >
            策略雷达
          </button>
          <button
            onClick={() => setPage('watchlist')}
            className={page === 'watchlist' ? 'font-bold' : ''}
          >
            自选股
          </button>
          <button
            onClick={() => setPage('records')}
            className={page === 'records' ? 'font-bold' : ''}
          >
            回测记录
          </button>
          <button
            onClick={() => setPage('diagnosis')}
            className={page === 'diagnosis' ? 'font-bold' : ''}
          >
            AI问诊
          </button>
        </div>
      </nav>
      <main>
        {page === 'home' && <HomePage />}
        {page === 'watchlist' && <WatchlistPage />}
      </main>
    </div>
  );
}

export default App;