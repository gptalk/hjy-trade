from flask import Flask
from flask_cors import CORS
import models
from routes.stock import bp as stock_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(stock_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
