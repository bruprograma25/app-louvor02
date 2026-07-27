from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = "louvor_app_2027"

    CORS(app)

    @app.route("/")
    def home():
        return {
            "status": "online",
            "mensagem": "API Louvor App funcionando!"
        }

    return app