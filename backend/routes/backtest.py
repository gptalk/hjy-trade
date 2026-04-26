from flask import Blueprint, jsonify, request
import json
import sys
import re
import pandas as pd
from datetime import datetime
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
    stock_code = data.get('code')
    strategy = data.get('strategy')
    start_date = data.get('start_date', '2024-01-01')
    end_date = data.get('end_date', '2024-12-31')
    initial_capital = float(data.get('initial_capital', 10000))

    if not stock_code or not strategy:
        return jsonify({'error': '缺少必要参数'}), 400

    # 获取K线数据
    from routes.stock import fetch_kline_data
    try:
        klines = fetch_kline_data(stock_code, start_date, end_date)
    except Exception as e:
        return jsonify({'error': f'获取K线数据失败: {str(e)}'}), 500

    if not klines or len(klines) < 20:
        return jsonify({'error': 'K线数据不足，无法进行回测'}), 400

    conditions = strategy.get('conditions', {'buy': 'MA5 > MA20', 'sell': 'MA5 < MA20'})

    # 执行回测
    result = execute_backtest(klines, conditions, initial_capital)

    # 确保所有字段都有默认值
    result.setdefault('final_capital', initial_capital)
    result.setdefault('return_rate', 0.0)
    result.setdefault('win_rate', 0.0)
    result.setdefault('max_drawdown', 0.0)
    result.setdefault('sharpe_ratio', 0.0)
    result.setdefault('trade_count', 0)
    result.setdefault('trades', [])
    result.setdefault('max_float_loss', 0.0)
    result.setdefault('hold_drawdown', 0.0)
    result.setdefault('avg_hold_days', 0.0)
    result.setdefault('max_hold_days', 0)

    result['strategy_name'] = strategy.get('name', '自定义策略')
    result['stock_code'] = stock_code
    result['start_date'] = start_date
    result['end_date'] = end_date
    result['initial_capital'] = initial_capital

    # 计算买入持有收益和Alpha
    df = pd.DataFrame(klines)
    if len(df) > 1:
        first_price = df.iloc[0]['close']
        last_price = df.iloc[-1]['close']
        if first_price > 0:
            benchmark_return = (last_price - first_price) / first_price * 100
            result['benchmark_return'] = round(benchmark_return, 2)
            result['alpha'] = round(result['return_rate'] - benchmark_return, 2)
        else:
            result['benchmark_return'] = 0.0
            result['alpha'] = 0.0
    else:
        result['benchmark_return'] = 0.0
        result['alpha'] = 0.0

    # 保存回测记录
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取或创建策略
    strategy_row = cursor.execute('SELECT id FROM strategies WHERE name = ?', (strategy.get('name', '自定义策略'),)).fetchone()
    if strategy_row:
        strategy_id = strategy_row['id']
    else:
        cursor.execute(
            'INSERT INTO strategies (name, description, conditions) VALUES (?, ?, ?)',
            (strategy.get('name', '自定义策略'), strategy.get('description', ''), json.dumps(conditions))
        )
        strategy_id = cursor.lastrowid

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
    """回测引擎"""
    if len(klines) < 20:
        return {
            'final_capital': initial_capital,
            'return_rate': 0,
            'win_rate': 0,
            'max_drawdown': 0,
            'sharpe_ratio': 0,
            'trade_count': 0,
            'trades': [],
            'benchmark_return': 0,
            'alpha': 0,
            'hold_drawdown': 0,
            'max_float_loss': 0,
            'avg_hold_days': 0,
            'max_hold_days': 0,
        }

    df = pd.DataFrame(klines)

    # 计算指标
    df['MA5'] = df['close'].rolling(window=5).mean()
    df['MA10'] = df['close'].rolling(window=10).mean()
    df['MA20'] = df['close'].rolling(window=20).mean()
    df['MA30'] = df['close'].rolling(window=30).mean()
    df['EMA12'] = df['close'].ewm(span=12, adjust=False).mean()
    df['EMA26'] = df['close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = df['EMA12'] - df['EMA26']
    df['MACD_signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
    df['MACD_hist'] = df['MACD'] - df['MACD_signal']

    # RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=6).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=6).mean()
    rs = gain / loss
    df['RSI6'] = 100 - (100 / (1 + rs))
    df['RSI12'] = 100 - (100 / (1 + (delta.where(delta > 0, 0)).rolling(window=12).mean() / (-delta.where(delta < 0, 0)).rolling(window=12).mean()))

    # BOLL
    df['BOLL_mid'] = df['close'].rolling(window=20).mean()
    df['BOLL_std'] = df['close'].rolling(window=20).std()
    df['BOLL_upper'] = df['BOLL_mid'] + 2 * df['BOLL_std']
    df['BOLL_lower'] = df['BOLL_mid'] - 2 * df['BOLL_std']

    # 持仓天数索引
    df['date_idx'] = range(len(df))

    capital = initial_capital
    position = None
    trades = []
    max_capital = initial_capital
    max_drawdown = 0.0
    max_float_loss = 0.0

    buy_condition = conditions.get('buy', 'MA5 > MA20')
    sell_condition = conditions.get('sell', 'MA5 < MA20')

    def evaluate_condition(condition_str, row_dict):
        """动态解析并执行条件"""
        if not condition_str:
            return False
        try:
            expr = condition_str
            # 替换指标名称为实际值
            for indicator in ['MA5', 'MA10', 'MA20', 'MA30', 'EMA12', 'EMA26', 'MACD', 'MACD_signal', 'RSI6', 'RSI12']:
                if indicator in expr:
                    val = row_dict.get(indicator, 0)
                    if pd.isna(val):
                        val = 0
                    expr = expr.replace(indicator, str(val))
            # BOLL特殊处理
            if 'BOLL_upper' in expr:
                expr = expr.replace('BOLL_upper', str(row_dict.get('BOLL_upper', 0)))
            if 'BOLL_lower' in expr:
                expr = expr.replace('BOLL_lower', str(row_dict.get('BOLL_lower', 0)))
            if 'BOLL' in expr and 'BOLL_upper' not in expr and 'BOLL_lower' not in expr:
                expr = expr.replace('BOLL', str(row_dict.get('BOLL_mid', 0)))
            # 安全评估表达式
            if re.match(r'^[\d\s\.\+\-\*\/\<\>\=\&\|]+$', expr.strip()):
                return eval(expr.strip())
            return False
        except Exception:
            return False

    peak_price = None

    for i, row in df.iterrows():
        if i < 20:
            continue

        row_dict = row.to_dict()

        # 持仓期间的浮亏计算
        if position:
            current_price = row['close']
            if peak_price is not None:
                peak_price = max(peak_price, current_price)
                if peak_price > 0:
                    float_loss = (peak_price - current_price) / peak_price * 100
                    max_float_loss = max(max_float_loss, float_loss)

        # 买入信号
        if not position and evaluate_condition(buy_condition, row_dict):
            shares = int(capital / row['close'] / 100) * 100
            if shares > 0:
                position = {
                    'price': row['close'],
                    'shares': shares,
                    'date': row['date'],
                    'buy_idx': row['date_idx']
                }
                capital -= shares * row['close']
                peak_price = row['close']

        # 卖出信号
        elif position and evaluate_condition(sell_condition, row_dict):
            trade_return = (row['close'] - position['price']) / position['price']
            hold_days = int(row['date_idx'] - position['buy_idx'])
            trades.append({
                'buy_date': position['date'],
                'buy_price': float(position['price']),
                'sell_date': row['date'],
                'sell_price': float(row['close']),
                'return': float(trade_return),
                'hold_days': hold_days
            })
            capital += position['shares'] * row['close']
            position = None
            peak_price = None

        # 更新最大回撤
        if position:
            current_capital = capital + position['shares'] * row['close']
        else:
            current_capital = capital
        max_capital = max(max_capital, current_capital)
        if max_capital > 0:
            drawdown = (max_capital - current_capital) / max_capital
            max_drawdown = max(max_drawdown, drawdown)

    # 平仓
    if position:
        final_idx = df.iloc[-1]['date_idx']
        hold_days = int(final_idx - position['buy_idx'])
        trades.append({
            'buy_date': position['date'],
            'buy_price': float(position['price']),
            'sell_date': df.iloc[-1]['date'],
            'sell_price': float(df.iloc[-1]['close']),
            'return': float((df.iloc[-1]['close'] - position['price']) / position['price']),
            'hold_days': hold_days
        })
        capital += position['shares'] * df.iloc[-1]['close']

    # 计算统计
    if trades:
        returns = [t['return'] for t in trades]
        wins = sum(1 for r in returns if r > 0)
        win_rate = wins / len(returns) * 100 if returns else 0
        avg_return = sum(returns) / len(returns) if returns else 0
        std_return = (sum((r - avg_return) ** 2 for r in returns) / len(returns)) ** 0.5 if len(returns) > 1 else 0
        sharpe_ratio = (avg_return / std_return * 16.03) if std_return > 0 else 0

        hold_days_list = [t['hold_days'] for t in trades]
        avg_hold_days = sum(hold_days_list) / len(hold_days_list) if hold_days_list else 0
        max_hold_days = max(hold_days_list) if hold_days_list else 0
    else:
        win_rate = 0.0
        sharpe_ratio = 0.0
        avg_hold_days = 0.0
        max_hold_days = 0

    # 买入持有最大回撤
    df['buy_hold_value'] = initial_capital * (df['close'] / df.iloc[0]['close'])
    df['buy_hold_peak'] = df['buy_hold_value'].cummax()
    df['buy_hold_drawdown'] = (df['buy_hold_peak'] - df['buy_hold_value']) / df['buy_hold_peak'] * 100
    hold_drawdown = float(df['buy_hold_drawdown'].max()) if len(df) > 0 else 0.0

    return {
        'final_capital': round(float(capital), 2),
        'return_rate': round((capital - initial_capital) / initial_capital * 100, 2),
        'win_rate': round(win_rate, 2),
        'max_drawdown': round(max_drawdown * 100, 2),
        'sharpe_ratio': round(sharpe_ratio, 2),
        'trade_count': len(trades),
        'trades': trades,
        'max_float_loss': round(max_float_loss, 2),
        'hold_drawdown': round(hold_drawdown, 2),
        'avg_hold_days': round(float(avg_hold_days), 1),
        'max_hold_days': int(max_hold_days),
        'benchmark_return': 0.0,
        'alpha': 0.0,
    }