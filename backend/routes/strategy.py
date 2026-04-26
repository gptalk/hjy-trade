from flask import Blueprint, jsonify, request
import json
import sys
sys.path.append('..')
from models import get_db_connection

bp = Blueprint('strategy', __name__, url_prefix='/api/strategy')

@bp.route('/', methods=['GET'])
def get_strategies():
    """获取所有策略"""
    conn = get_db_connection()
    cursor = conn.cursor()
    strategies = cursor.execute('SELECT * FROM strategies ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(s) for s in strategies])

@bp.route('/', methods=['POST'])
def create_strategy():
    """创建策略"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO strategies (name, description, conditions) VALUES (?, ?, ?)',
            (data['name'], data.get('description', ''), json.dumps(data.get('conditions', {})))
        )
        conn.commit()
        strategy_id = cursor.lastrowid
        conn.close()
        return jsonify({'success': True, 'id': strategy_id})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:id>', methods=['PUT'])
def update_strategy(id):
    """更新策略"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE strategies SET name = ?, description = ?, conditions = ? WHERE id = ?',
        (data['name'], data.get('description', ''), json.dumps(data.get('conditions', {})), id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@bp.route('/<int:id>', methods=['DELETE'])
def delete_strategy(id):
    """删除策略"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM strategies WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})