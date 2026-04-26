from flask import Blueprint, jsonify, request
import yfinance as yf
import pandas as pd
import sys
sys.path.append('..')
from services.indicator import calculate_indicators

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

def fetch_kline_data(code, start='2020-01-01', end='2024-12-31'):
    """获取K线数据（不含Flask上下文）"""
    try:
        # A股: 上交所用.SS, 深交所用.SZ
        if code.startswith('6'):
            ticker = yf.Ticker(f"{code}.SS")
        else:
            ticker = yf.Ticker(f"{code}.SZ")

        df = ticker.history(start=start, end=end)

        if df.empty:
            return []

        # 计算技术指标
        df = calculate_indicators(df)

        klines = []
        for idx, row in df.iterrows():
            klines.append({
                'date': idx.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume']),
                'MA5': float(row['MA5']) if pd.notna(row['MA5']) else None,
                'MA10': float(row['MA10']) if pd.notna(row['MA10']) else None,
                'MA20': float(row['MA20']) if pd.notna(row['MA20']) else None,
                'MACD': float(row['MACD']) if pd.notna(row['MACD']) else None,
                'MACD_signal': float(row['MACD_signal']) if pd.notna(row['MACD_signal']) else None,
                'MACD_hist': float(row['MACD_hist']) if pd.notna(row['MACD_hist']) else None,
                'KDJ_K': float(row['KDJ_K']) if pd.notna(row['KDJ_K']) else None,
                'KDJ_D': float(row['KDJ_D']) if pd.notna(row['KDJ_D']) else None,
                'KDJ_J': float(row['KDJ_J']) if pd.notna(row['KDJ_J']) else None,
                'RSI6': float(row['RSI6']) if pd.notna(row['RSI6']) else None,
                'RSI12': float(row['RSI12']) if pd.notna(row['RSI12']) else None,
                'BB_upper': float(row['BB_upper']) if pd.notna(row['BB_upper']) else None,
                'BB_middle': float(row['BB_middle']) if pd.notna(row['BB_middle']) else None,
                'BB_lower': float(row['BB_lower']) if pd.notna(row['BB_lower']) else None,
            })
        return klines
    except Exception as e:
        raise e

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
