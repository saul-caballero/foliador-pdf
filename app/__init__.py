"""
app/__init__.py — Flask application factory.
"""

import os
import uuid
from flask import Flask


def create_app(base_path=None):
    """ Crea y configura la aplicación Flask """
    if base_path is None:
        base_path = os.path.dirname(os.path.abspath(__file__))
        template_folder = os.path.join(base_path, "templates")
        static_folder = os.path.join(base_path, "static")
    else:
        template_folder = os.path.join(base_path, "app", "templates")
        static_folder = os.path.join(base_path, "app", "static")

    app = Flask(
        __name__,
        template_folder=template_folder,
        static_folder=static_folder,
    )

    app.secret_key = str(uuid.uuid4())
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024

    app.config["TEMP_FOLDER"] = os.path.join(base_path, "temp_files")
    app.config["LOGS_FOLDER"] = os.path.join(base_path, "logs")

    os.makedirs(app.config["TEMP_FOLDER"], exist_ok=True)
    os.makedirs(app.config["LOGS_FOLDER"], exist_ok=True)

    from app.routes import main
    app.register_blueprint(main)

    return app