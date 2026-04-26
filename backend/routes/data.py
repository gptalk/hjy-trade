from flask import Blueprint, jsonify, request
import os
import sqlite3
from datetime import datetime, timedelta
import sys
sys.path.append('..')
from models import get_db_connection
from routes.stock import fetch_kline_data as fetch_from_akshare

bp = Blueprint('data', __name__, url_prefix='/api/data')

@bp.route('/stats', methods=['GET'])
def get_stats():
    """获取数据库统计信息"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        stock_count = cursor.execute('SELECT COUNT(*) FROM stock_cache').fetchone()[0]
        record_count = cursor.execute('SELECT COUNT(*) FROM klines').fetchone()[0]
        last_update = cursor.execute('SELECT MAX(last_update) FROM stock_cache').fetchone()[0] or 'N/A'

        db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'stock_data.db')
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path) / (1024 * 1024)
        else:
            db_size = 0

        return jsonify({
            'stock_count': stock_count,
            'record_count': record_count,
            'db_size': round(db_size, 2),
            'last_update': last_update
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/list', methods=['GET'])
def get_cache_list():
    """获取已缓存股票列表"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        stocks = cursor.execute('SELECT * FROM stock_cache ORDER BY last_update DESC').fetchall()
        return jsonify([dict(s) for s in stocks])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/sync', methods=['POST'])
def sync_stock():
    """同步股票数据"""
    data = request.json
    code = data.get('code')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    strategy = data.get('strategy', 'smart')

    if not code:
        return jsonify({'error': '股票代码不能为空'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        existing = cursor.execute('SELECT * FROM stock_cache WHERE code = ?', (code,)).fetchone()

        if strategy == 'smart' and existing:
            last_update = existing['last_update']
            if last_update:
                days_since = (datetime.now() - datetime.fromisoformat(last_update)).days
                if days_since <= 30:
                    return jsonify({
                        'status': 'skipped',
                        'reason': 'data_fresh',
                        'message': f'数据最新（{days_since}天前更新）'
                    })

        if strategy in ('smart', 'incremental') and existing:
            last_date = existing['end_date']
            if last_date:
                start = (datetime.fromisoformat(last_date) - timedelta(days=7)).strftime('%Y-%m-%d')
            else:
                start = start_date or '2020-01-01'
        else:
            start = start_date or '2020-01-01'

        end = end_date or datetime.now().strftime('%Y-%m-%d')
        name = existing['name'] if existing else code

        klines = fetch_from_akshare(code, start, end)

        if not klines:
            return jsonify({'error': '获取数据失败'}), 500

        if strategy == 'overwrite':
            cursor.execute('DELETE FROM klines WHERE code = ?', (code,))

        for kline in klines:
            cursor.execute('''
                INSERT OR REPLACE INTO klines (code, date, open, high, low, close, volume, last_update)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (code, kline['date'], kline['open'], kline['high'], kline['low'],
                  kline['close'], kline['volume'], datetime.now().isoformat()))

        dates = [k['date'] for k in klines]
        cursor.execute('''
            INSERT OR REPLACE INTO stock_cache (code, name, start_date, end_date, record_count, last_update)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (code, name, min(dates), max(dates), len(klines), datetime.now().isoformat()))

        conn.commit()

        return jsonify({
            'status': 'success',
            'records': len(klines),
            'date_range': f"{min(dates)} ~ {max(dates)}"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/delete', methods=['DELETE'])
def delete_cache():
    """删除指定股票的缓存数据"""
    code = request.args.get('code')

    if not code:
        return jsonify({'error': '股票代码不能为空'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute('DELETE FROM klines WHERE code = ?', (code,))
        cursor.execute('DELETE FROM stock_cache WHERE code = ?', (code,))

        conn.commit()

        return jsonify({'status': 'success', 'message': f'已删除 {code} 的缓存数据'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@bp.route('/batch-delete', methods=['DELETE'])
def batch_delete():
    """批量删除过期数据"""
    days = request.args.get('days', 365, type=int)

    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        old_stocks = cursor.execute(
            'SELECT code FROM stock_cache WHERE last_update < ?', (cutoff,)
        ).fetchall()

        deleted_count = 0
        try:
            for row in old_stocks:
                cursor.execute('DELETE FROM klines WHERE code = ?', (row['code'],))
                cursor.execute('DELETE FROM stock_cache WHERE code = ?', (row['code'],))
                deleted_count += 1
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e

        return jsonify({
            'status': 'success',
            'deleted_count': deleted_count,
            'cutoff_date': cutoff
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
