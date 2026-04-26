from flask import Blueprint, jsonify, request
import sys
sys.path.append('..')
from routes.stock import fetch_kline_data

bp = Blueprint('diagnosis', __name__, url_prefix='/api/diagnosis')

@bp.route('/analyze', methods=['POST'])
def analyze_stock():
    """AI股票分析"""
    data = request.json
    code = data.get('code')

    if not code:
        return jsonify({'error': '股票代码不能为空'}), 400

    # 获取K线数据
    klines = fetch_kline_data(code, '2020-01-01', '2024-12-31')

    if not klines or len(klines) < 30:
        return jsonify({'error': '数据不足，无法分析'}), 400

    # 简单技术分析
    latest = klines[-1]
    ma5 = sum([k['close'] for k in klines[-5:]]) / 5
    ma10 = sum([k['close'] for k in klines[-10:]]) / 10
    ma20 = sum([k['close'] for k in klines[-20:]]) / 20

    # 计算成交量平均
    vol_avg20 = sum([k['volume'] for k in klines[-20:-1]]) / 20
    vol_ratio = latest['volume'] / vol_avg20 if vol_avg20 > 0 else 1

    # 计算RSI
    deltas = [klines[i]['close'] - klines[i-1]['close'] for i in range(1, len(klines))]
    gains = [d for d in deltas[-14:] if d > 0]
    losses = [-d for d in deltas[-14:] if d < 0]
    avg_gain = sum(gains) / 14 if gains else 0
    avg_loss = sum(losses) / 14 if losses else 0
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    rsi = 100 - (100 / (1 + rs))

    # 计算支撑位和阻力位
    lows = [k['low'] for k in klines[-20:]]
    highs = [k['high'] for k in klines[-20:]]
    support = min(lows)
    resistance = max(highs)

    # 判断趋势
    if ma5 > ma20:
        trend = '上涨'
        signal = '买入信号' if rsi < 70 else '持有'
    elif ma5 < ma20:
        trend = '下跌'
        signal = '观望' if rsi > 30 else '谨慎'
    else:
        trend = '震荡'
        signal = '中性'

    # 量价分析
    if vol_ratio > 1.5 and latest['close'] > klines[-2]['close']:
        volume_signal = '放量上涨'
    elif vol_ratio > 1.5 and latest['close'] < klines[-2]['close']:
        volume_signal = '放量下跌'
    elif vol_ratio < 0.7:
        volume_signal = '缩量'
    else:
        volume_signal = '正常'

    # 生成分析报告
    analysis = {
        'code': code,
        'name': get_stock_name(code),
        'price': round(latest['close'], 2),
        'change': round((latest['close'] - klines[-2]['close']) / klines[-2]['close'] * 100, 2),
        'trend': trend,
        'signal': signal,
        'rsi': round(rsi, 2),
        'ma5': round(ma5, 2),
        'ma10': round(ma10, 2),
        'ma20': round(ma20, 2),
        'volume_ratio': round(vol_ratio, 2),
        'volume_signal': volume_signal,
        'support': round(support, 2),
        'resistance': round(resistance, 2),
        'analysis': generate_analysis_text(trend, signal, rsi, vol_ratio, ma5, ma20),
    }

    return jsonify(analysis)

def get_stock_name(code):
    """获取股票名称"""
    from routes.stock import A_STOCK_LIST
    for s in A_STOCK_LIST:
        if s['code'] == code:
            return s['name']
    return code

def generate_analysis_text(trend, signal, rsi, vol_ratio, ma5, ma20):
    """生成分析文本"""
    texts = []

    if trend == '上涨':
        texts.append(f"当前处于上涨趋势，MA5({ma5:.2f})在MA20({ma20:.2f})上方。")
    elif trend == '下跌':
        texts.append(f"当前处于下跌趋势，MA5({ma5:.2f})在MA20({ma20:.2f})下方。")
    else:
        texts.append(f"当前处于震荡整理阶段。")

    if rsi > 70:
        texts.append(f"RSI为{rsi:.1f}，处于超买区域，注意风险。")
    elif rsi < 30:
        texts.append(f"RSI为{rsi:.1f}，处于超卖区域，可能有反弹机会。")
    else:
        texts.append(f"RSI为{rsi:.1f}，处于正常区间。")

    if vol_ratio > 1.5:
        texts.append("成交量明显放大，市场活跃。")
    elif vol_ratio < 0.7:
        texts.append("成交量萎缩，市场参与度低。")

    texts.append(f"综合信号: {signal}")

    return ' '.join(texts)