import os
import sys
import uuid
from flask import Flask

APP_VERSION = "1.4.0"

def create_app(base_path=None, exe_path=None):
    exe_path = os.environ.get("EXE_PATH")
    data_path = exe_path if exe_path else base_path

    if base_path is None:
        base_path = os.path.dirname(os.path.abspath(__file__))
        template_folder = os.path.join(base_path, "templates")
        static_folder = os.path.join(base_path, "static")
    else:
        template_folder = os.path.join(base_path, "app", "templates")
        static_folder = os.path.join(base_path, "app", "static")

    data_path = exe_path if exe_path else base_path

    app = Flask(
        __name__,
        template_folder=template_folder,
        static_folder=static_folder,
    )

    app.secret_key = str(uuid.uuid4())
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024

    app.config["TEMP_FOLDER"] = os.path.join(base_path, "temp_files")
    app.config["LOGS_FOLDER"] = os.path.join(data_path, "foliador-logs")

    os.makedirs(app.config["TEMP_FOLDER"], exist_ok=True)
    os.makedirs(app.config["LOGS_FOLDER"], exist_ok=True)

    from app.routes import main
    app.register_blueprint(main)

    @app.context_processor
    def inject_version():
        return {"app_version": APP_VERSION}

    return app