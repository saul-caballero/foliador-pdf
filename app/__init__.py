import os
import uuid
from flask import Flask


def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)
    app.secret_key = str(uuid.uuid4())
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024  # 2GB limit

    # Folder paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    app.config["TEMP_FOLDER"] = os.path.join(base_dir, "..", "temp_files")
    app.config["LOGS_FOLDER"] = os.path.join(base_dir, "..", "logs")

    os.makedirs(app.config["TEMP_FOLDER"], exist_ok=True)
    os.makedirs(app.config["LOGS_FOLDER"], exist_ok=True)

    # Register routes
    from app.routes import main
    app.register_blueprint(main)

    return app