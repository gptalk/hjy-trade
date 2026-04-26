from flask import Blueprint, jsonify, request
import json
import sys
sys.path.append('..')
from models import get_db_connection

bp = Blueprint('backtest', __name__, url_prefix='/api/backtest')

@bp.route('/records', methods=['GET'])
def get_backtest_records():
    """获取回测记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    records = cursor.execute('''
        SELECT br.*, s.name as strategy_name
        FROM backtest_records br
        LEFT JOIN strategies s ON br.strategy_id = s.id
        ORDER BY br.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in records])

@bp.route('/run', methods=['POST'])
def run_backtest():
    """运行回测"""
    data = request.json
    strategy_id = data.get('strategy_id')
    stock_code = data.get('stock_code')
    start_date = data.get('start_date', '2024-01-01')
    end_date = data.get('end_date', '2024-12-31')
    initial_capital = data.get('initial_capital', 10000)

    # 获取K线数据
    from routes.stock import fetch_kline_data
    klines = fetch_kline_data(stock_code, start_date, end_date)

    if not klines:
        return jsonify({'error': '无K线数据'}), 400

    # 过滤日期范围
    klines = [k for k in klines if start_date <= k['date'] <= end_date]

    # 获取策略
    conn = get_db_connection()
    cursor = conn.cursor()
    strategy = cursor.execute('SELECT * FROM strategies WHERE id = ?', (strategy_id,)).fetchone()
    conn.close()

    if not strategy:
        return jsonify({'error': '策略不存在'}), 404

    conditions = json.loads(strategy['conditions'])

    # 执行回测
    result = execute_backtest(klines, conditions, initial_capital)
    result['strategy_id'] = strategy_id
    result['stock_code'] = stock_code
    result['start_date'] = start_date
    result['end_date'] = end_date
    result['initial_capital'] = initial_capital

    # 保存回测记录
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO backtest_records
        (strategy_id, stock_code, start_date, end_date, initial_capital, final_capital, return_rate, win_rate, max_drawdown, sharpe_ratio, trade_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        strategy_id, stock_code, start_date, end_date, initial_capital,
        result['final_capital'], result['return_rate'], result['win_rate'],
        result['max_drawdown'], result['sharpe_ratio'], result['trade_count']
    ))
    conn.commit()
    conn.close()

    return jsonify(result)

def execute_backtest(klines, conditions, initial_capital=10000):
    """简单的回测引擎"""
    capital = initial_capital
    position = None
    trades = []
    max_capital = initial_capital
    max_drawdown = 0

    buy_condition = conditions.get('buy', 'MA5 > MA20')
    sell_condition = conditions.get('sell', 'MA5 < MA20')

    for i, kline in enumerate(klines):
        if i < 20:
            continue  # 需要足够的历史数据计算MA

        # 计算MA
        ma5 = sum([k['close'] for k in klines[i-4:i+1]]) / 5
        ma20 = sum([k['close'] for k in klines[i-19:i+1]]) / 20

        # 检查买入信号
        if not position and ma5 > ma20:
            # 金叉买入
            shares = int(capital / kline['close'] / 100) * 100
            if shares > 0:
                position = {
                    'price': kline['close'],
                    'shares': shares,
                    'date': kline['date']
                }
                capital -= shares * kline['close']

        # 检查卖出信号
        elif position and ma5 < ma20:
            # 死叉卖出
            trade_return = (kline['close'] - position['price']) / position['price']
            trades.append({
                'buy_date': position['date'],
                'buy_price': position['price'],
                'sell_date': kline['date'],
                'sell_price': kline['close'],
                'return': trade_return
            })
            capital += position['shares'] * kline['close']
            position = None

        # 更新最大回撤
        current_capital = capital + (position['shares'] * kline['close'] if position else 0)
        max_capital = max(max_capital, current_capital)
        drawdown = (max_capital - current_capital) / max_capital
        max_drawdown = max(max_drawdown, drawdown)

    # 平仓
    if position:
        final_price = klines[-1]['close']
        trades.append({
            'buy_date': position['date'],
            'buy_price': position['price'],
            'sell_date': klines[-1]['date'],
            'sell_price': final_price,
            'return': (final_price - position['price']) / position['price']
        })
        capital += position['shares'] * final_price

    # 计算统计
    if trades:
        returns = [t['return'] for t in trades]
        wins = sum(1 for r in returns if r > 0)
        win_rate = wins / len(returns) * 100 if returns else 0
        avg_return = sum(returns) / len(returns) if returns else 0
        std_return = (sum((r - avg_return) ** 2 for r in returns) / len(returns)) ** 0.5 if len(returns) > 1 else 0
        sharpe_ratio = (avg_return / std_return * 16.03) if std_return > 0 else 0  # 年化
    else:
        win_rate = 0
        sharpe_ratio = 0

    return {
        'final_capital': round(capital, 2),
        'return_rate': round((capital - initial_capital) / initial_capital * 100, 2),
        'win_rate': round(win_rate, 2),
        'max_drawdown': round(max_drawdown * 100, 2),
        'sharpe_ratio': round(sharpe_ratio, 2),
        'trade_count': len(trades)
    }