""" Inicia el servidor Waitress y abre el navegador automáticamente """

import sys
import os
import webbrowser
import threading
from waitress import serve
from app import create_app

HOST = "0.0.0.0"
PORT = 5000
URL = f"http://localhost:{PORT}"


def get_base_path():
    """ Devuelve la ruta base independientemente de que se ejecute como .exe o como script """
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def open_browser():
    webbrowser.open(URL)


if __name__ == "__main__":
    base_path = get_base_path()

    app = create_app(base_path)

    timer = threading.Timer(1.5, open_browser)
    timer.start()

    print(f"\n Foliador PDF corriendo en {URL}")
    print(f"   Comparte en red local: http://<tu-ip>:{PORT}")
    print("\n   Presiona Ctrl+C para detener.\n")

    serve(app, host=HOST, port=PORT)