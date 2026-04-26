from flask import Blueprint, jsonify, request
import json
import sys
sys.path.append('..')
from models import get_db_connection
from routes.stock import A_STOCK_LIST, fetch_kline_data
from routes.backtest import execute_backtest

bp = Blueprint('radar', __name__, url_prefix='/api/radar')

@bp.route('/strategies', methods=['GET'])
def get_radar_strategies():
    """获取用于雷达的策略列表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    strategies = cursor.execute('SELECT id, name, conditions FROM strategies').fetchall()
    conn.close()
    return jsonify([{'id': s['id'], 'name': s['name'], 'conditions': json.loads(s['conditions'])} for s in strategies])

@bp.route('/scan', methods=['POST'])
def scan_stocks():
    """扫描所有A股寻找符合策略的股票"""
    data = request.json
    strategy_id = data.get('strategy_id')
    start_date = data.get('start_date', '2024-01-01')
    end_date = data.get('end_date', '2024-12-31')

    if not strategy_id:
        return jsonify({'error': '请选择策略'}), 400

    # 获取策略
    conn = get_db_connection()
    cursor = conn.cursor()
    strategy = cursor.execute('SELECT * FROM strategies WHERE id = ?', (strategy_id,)).fetchone()
    conn.close()

    if not strategy:
        return jsonify({'error': '策略不存在'}), 404

    conditions = json.loads(strategy['conditions'])
    results = []

    # 扫描所有预置股票
    for stock in A_STOCK_LIST[:20]:  # 限制扫描数量避免超时
        code = stock['code']
        name = stock['name']

        try:
            klines = fetch_kline_data(code, start_date, end_date)
            if len(klines) < 30:
                continue

            # 过滤日期范围
            klines = [k for k in klines if start_date <= k['date'] <= end_date]

            if len(klines) < 20:
                continue

            # 执行简单回测
            result = execute_backtest(klines, conditions, 10000)
            result['code'] = code
            result['name'] = name

            # 只返回有交易的股票
            if result['trade_count'] > 0:
                results.append(result)
        except Exception as e:
            continue

    # 按收益率排序
    results.sort(key=lambda x: x['return_rate'], reverse=True)

    return jsonify(results[:50])  # 最多返回50个结果