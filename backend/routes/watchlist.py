from flask import Blueprint, jsonify, request
import sys
sys.path.append('..')
from models import get_db_connection

bp = Blueprint('watchlist', __name__, url_prefix='/api/watchlist')

@bp.route('/', methods=['GET'])
def get_watchlists():
    """获取所有自选股分组"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取所有分组
    groups = cursor.execute('SELECT DISTINCT group_name FROM watchlists').fetchall()

    result = []
    for g in groups:
        group_name = g['group_name']
        stocks = cursor.execute(
            'SELECT * FROM watchlists WHERE group_name = ? ORDER BY added_at DESC',
            (group_name,)
        ).fetchall()
        result.append({
            'name': group_name,
            'stocks': [dict(s) for s in stocks]
        })

    conn.close()
    return jsonify(result)

@bp.route('/', methods=['POST'])
def add_to_watchlist():
    """添加股票到自选股"""
    data = request.json
    group_name = data.get('group_name', '默认')
    stock_code = data.get('stock_code')

    if not stock_code:
        return jsonify({'error': '股票代码不能为空'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # 检查是否已存在
    existing = cursor.execute(
        'SELECT * FROM watchlists WHERE group_name = ? AND stock_code = ?',
        (group_name, stock_code)
    ).fetchone()

    if existing:
        conn.close()
        return jsonify({'error': '股票已在自选股中'}), 400

    cursor.execute(
        'INSERT INTO watchlists (group_name, stock_code) VALUES (?, ?)',
        (group_name, stock_code)
    )
    conn.commit()
    conn.close()

    return jsonify({'success': True})

@bp.route('/<group_name>/<stock_code>', methods=['DELETE'])
def remove_from_watchlist(group_name, stock_code):
    """从自选股移除"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'DELETE FROM watchlists WHERE group_name = ? AND stock_code = ?',
        (group_name, stock_code)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@bp.route('/<group_name>', methods=['DELETE'])
def delete_group(group_name):
    """删除整个分组"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM watchlists WHERE group_name = ?', (group_name,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})