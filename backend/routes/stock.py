from flask import Blueprint, jsonify, request
import akshare as ak
import pandas as pd
import sys
import os
sys.path.append('..')
from models import get_db_connection

# 清除代理设置
for k in list(os.environ.keys()):
    if 'proxy' in k.lower():
        del os.environ[k]

bp = Blueprint('stock', __name__, url_prefix='/api/stock')

# 预置的A股股票列表(常用)
A_STOCK_LIST = [
    {'code': '000001', 'name': '平安银行'},
    {'code': '000002', 'name': '万科A'},
    {'code': '000004', 'name': '国华网安'},
    {'code': '000005', 'name': 'ST星源'},
    {'code': '000006', 'name': '深振业A'},
    {'code': '000007', 'name': '全新好'},
    {'code': '000008', 'name': '神州高铁'},
    {'code': '000009', 'name': '中国宝安'},
    {'code': '000010', 'name': '美丽生态'},
    {'code': '600000', 'name': '浦发银行'},
    {'code': '600001', 'name': '邯郸钢铁'},
    {'code': '600004', 'name': '白云机场'},
    {'code': '600006', 'name': '东风汽车'},
    {'code': '600007', 'name': '中国国贸'},
    {'code': '600008', 'name': '首创股份'},
    {'code': '600009', 'name': '上海机场'},
    {'code': '600010', 'name': '包钢股份'},
    {'code': '600011', 'name': '华能国际'},
    {'code': '600012', 'name': '皖通高速'},
    {'code': '600015', 'name': '华夏银行'},
    {'code': '600016', 'name': '民生银行'},
    {'code': '600018', 'name': '上港集团'},
    {'code': '600019', 'name': '宝钢股份'},
    {'code': '600020', 'name': '中原高速'},
]

@bp.route('/list')
def get_stock_list():
    """获取A股股票列表"""
    return jsonify(A_STOCK_LIST)

@bp.route('/search')
def search_stocks():
    """搜索A股股票"""
    query = request.args.get('q', '').upper()
    if query:
        stocks = [s for s in A_STOCK_LIST if query in s['code'] or query in s['name'].upper()]
    else:
        stocks = A_STOCK_LIST[:20]
    return jsonify(stocks[:20])

def get_ticker_prefix(code):
    """根据股票代码返回akshare需要的前缀"""
    if code.startswith('6'):
        return f'sh{code}'
    else:
        return f'sz{code}'

def fetch_kline_data(code, start='2020-01-01', end='2024-12-31'):
    """获取K线数据（本地缓存优先）"""

    # 1. 尝试从本地数据库读取
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        rows = cursor.execute('''
            SELECT code, date, open, high, low, close, volume
            FROM klines
            WHERE code = ? AND date >= ? AND date <= ?
            ORDER BY date ASC
        ''', (code, start, end)).fetchall()

        conn.close()

        if rows and len(rows) > 0:
            # 检查数据是否足够新（30天内）
            last_date = rows[-1]['date'] if rows else None
            if last_date:
                from datetime import datetime as dt
                days_since = (dt.now() - dt.fromisoformat(last_date)).days
                if days_since <= 30:
                    # 数据足够新，直接返回
                    klines = []
                    for row in rows:
                        klines.append({
                            'date': row['date'],
                            'open': float(row['open']),
                            'high': float(row['high']),
                            'low': float(row['low']),
                            'close': float(row['close']),
                            'volume': int(row['volume']) if row['volume'] else 0,
                        })
                    return klines

    except Exception as e:
        pass  # 继续尝试从网络获取

    # 2. 从网络获取数据
    try:
        ticker = get_ticker_prefix(code)
        df = ak.stock_zh_a_daily(symbol=ticker, adjust='qfq')

        if df.empty:
            return []

        # 过滤日期范围
        df['date'] = pd.to_datetime(df['date'])
        start_dt = pd.to_datetime(start)
        end_dt = pd.to_datetime(end)
        df = df[(df['date'] >= start_dt) & (df['date'] <= end_dt)]

        if df.empty:
            return []

        # 计算技术指标
        df = calculate_indicators(df)

        klines = []
        for idx, row in df.iterrows():
            kline = {
                'date': row['date'].strftime('%Y-%m-%d'),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': int(row['volume']) if pd.notna(row['volume']) else 0,
            }

            # 添加指标
            for col in ['MA5', 'MA10', 'MA20', 'MA30', 'EMA12', 'EMA26', 'MACD', 'MACD_signal', 'RSI6', 'RSI12', 'BOLL_mid', 'BOLL_upper', 'BOLL_lower']:
                if col in df.columns:
                    val = row.get(col)
                    kline[col] = float(val) if pd.notna(val) else None

            klines.append(kline)

        return klines
    except Exception as e:
        raise e

def calculate_indicators(df):
    """计算技术指标"""
    close = df['close'].astype(float)

    # MA
    df['MA5'] = close.rolling(window=5).mean()
    df['MA10'] = close.rolling(window=10).mean()
    df['MA20'] = close.rolling(window=20).mean()
    df['MA30'] = close.rolling(window=30).mean()

    # EMA
    df['EMA12'] = close.ewm(span=12, adjust=False).mean()
    df['EMA26'] = close.ewm(span=26, adjust=False).mean()

    # MACD
    df['MACD'] = df['EMA12'] - df['EMA26']
    df['MACD_signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_hist'] = df['MACD'] - df['MACD_signal']

    # RSI
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=6).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=6).mean()
    rs = gain / loss
    df['RSI6'] = 100 - (100 / (1 + rs))

    # RSI12
    gain12 = (delta.where(delta > 0, 0)).rolling(window=12).mean()
    loss12 = (-delta.where(delta < 0, 0)).rolling(window=12).mean()
    rs12 = gain12 / loss12
    df['RSI12'] = 100 - (100 / (1 + rs12))

    # BOLL
    df['BOLL_mid'] = close.rolling(window=20).mean()
    df['BOLL_std'] = close.rolling(window=20).std()
    df['BOLL_upper'] = df['BOLL_mid'] + 2 * df['BOLL_std']
    df['BOLL_lower'] = df['BOLL_mid'] - 2 * df['BOLL_std']

    return df

@bp.route('/kline/<code>')
def get_kline(code):
    """获取K线数据"""
    start = request.args.get('start', '2020-01-01')
    end = request.args.get('end', '2024-12-31')

    try:
        klines = fetch_kline_data(code, start, end)
        return jsonify(klines)
    except Exception as e:
        return jsonify({'error': str(e)}), 500