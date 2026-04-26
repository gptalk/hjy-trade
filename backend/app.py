from flask import Flask
from flask_cors import CORS
import models
from routes.stock import bp as stock_bp
from routes.strategy import bp as strategy_bp
from routes.backtest import bp as backtest_bp
from routes.watchlist import bp as watchlist_bp
from routes.diagnosis import bp as diagnosis_bp
from routes.radar import bp as radar_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(stock_bp)
    app.register_blueprint(strategy_bp)
    app.register_blueprint(backtest_bp)
    app.register_blueprint(watchlist_bp)
    app.register_blueprint(diagnosis_bp)
    app.register_blueprint(radar_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
