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


def add_indicators_to_kline(kline, row):
    """将技术指标添加到kline字典"""
    indicator_cols = ['MA5', 'MA10', 'MA20', 'MA30', 'EMA12', 'EMA26',
                      'MACD', 'MACD_signal', 'RSI6', 'RSI12',
                      'BOLL_mid', 'BOLL_upper', 'BOLL_lower']
    for col in indicator_cols:
        if col in row and row[col] is not None:
            kline[col] = float(row[col]) if pd.notna(row[col]) else None
    return kline

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

                    # Data from cache - calculate indicators on the fly
                    df_cache = pd.DataFrame(klines)
                    df_cache = calculate_indicators(df_cache)

                    # Update klines with indicators
                    for i, row in df_cache.iterrows():
                        klines[i] = add_indicators_to_kline(klines[i], row)

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
            kline = add_indicators_to_kline(kline, row)

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

# ============== 市场管理 API ==============

@bp.route('/markets', methods=['GET'])
def get_markets():
    """获取市场列表"""
    conn = get_db_connection()
    cursor = conn.cursor()

    markets = cursor.execute('SELECT * FROM markets ORDER BY code').fetchall()
    conn.close()

    if not markets:
        # 返回默认A股市场
        return jsonify([{'code': 'A', 'name': 'A股', 'market_type': 'A股', 'description': '上海和深圳证券交易所'}])
    return jsonify([dict(m) for m in markets])

@bp.route('/markets', methods=['POST'])
def add_market():
    """添加市场"""
    data = request.json
    code = data.get('code')
    name = data.get('name')
    market_type = data.get('market_type', 'A股')
    description = data.get('description', '')

    if not code or not name:
        return jsonify({'error': '市场代码和名称不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO markets (code, name, market_type, description) VALUES (?, ?, ?, ?)',
            (code, name, market_type, description)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stocks', methods=['GET'])
def get_stocks():
    """获取股票列表"""
    market = request.args.get('market', 'A股')

    conn = get_db_connection()
    cursor = conn.cursor()

    # 优先从 stock_info 表获取
    stocks = cursor.execute(
        'SELECT * FROM stock_info WHERE market = ? ORDER BY code',
        (market,)
    ).fetchall()

    # 如果 stock_info 为空，使用预置列表
    if not stocks:
        stocks = [s for s in A_STOCK_LIST if market == 'A股']
        return jsonify(stocks)

    conn.close()
    return jsonify([dict(s) for s in stocks])

@bp.route('/stocks/<code>', methods=['GET'])
def get_stock_info(code):
    """获取股票详细信息"""
    conn = get_db_connection()
    cursor = conn.cursor()

    stock = cursor.execute('SELECT * FROM stock_info WHERE code = ?', (code,)).fetchone()

    if not stock:
        # 尝试从预置列表获取
        for s in A_STOCK_LIST:
            if s['code'] == code:
                conn.close()
                return jsonify({'code': s['code'], 'name': s['name'], 'market': 'A股'})
        conn.close()
        return jsonify({'error': '股票不存在'}), 404

    conn.close()
    return jsonify(dict(stock))

@bp.route('/stocks', methods=['POST'])
def add_stock():
    """添加/更新股票信息"""
    data = request.json
    code = data.get('code')
    name = data.get('name')
    market = data.get('market', 'A股')
    industry = data.get('industry')
    listing_date = data.get('listing_date')
    total_shares = data.get('total_shares')
    float_shares = data.get('float_shares')
    mainBusiness = data.get('mainBusiness')

    if not code or not name:
        return jsonify({'error': '股票代码和名称不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO stock_info
            (code, name, market, industry, listing_date, total_shares, float_shares, mainBusiness)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (code, name, market, industry, listing_date, total_shares, float_shares, mainBusiness))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stocks/<code>', methods=['DELETE'])
def delete_stock(code):
    """删除股票"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM stock_info WHERE code = ?', (code,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/stocks/batch', methods=['POST'])
def batch_add_stocks():
    """批量添加股票"""
    data = request.json
    stocks = data.get('stocks', [])

    if not stocks:
        return jsonify({'error': '股票列表不能为空'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        for stock in stocks:
            cursor.execute('''
                INSERT OR REPLACE INTO stock_info
                (code, name, market, industry, listing_date, total_shares, float_shares, mainBusiness)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                stock.get('code'),
                stock.get('name'),
                stock.get('market', 'A股'),
                stock.get('industry'),
                stock.get('listing_date'),
                stock.get('total_shares'),
                stock.get('float_shares'),
                stock.get('mainBusiness')
            ))

        conn.commit()
        conn.close()
        return jsonify({'success': True, 'count': len(stocks)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500