""" Inicia el servidor Waitress y abre el navegador automáticamente """
import sys
import os
import socket
import webbrowser
import threading
from waitress import serve
from app import create_app

HOST = "0.0.0.0"
PORT = 5000
URL  = f"http://localhost:{PORT}"


def get_base_path():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def get_local_ip():
    """ Devuelve la ruta base independientemente de que se ejecute como .exe o como script """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "IP no disponible"


def is_port_in_use(port):
    """ Comprobar si un puerto ya está en uso """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def open_browser():
    webbrowser.open(URL)


if __name__ == "__main__":

    # Si el servidor ya está ejecutándose, solo abre el navegador
    if is_port_in_use(PORT):
        print(f"\n El servidor ya esta corriendo en {URL}")
        print(" Abriendo el navegador...\n")
        open_browser()
        sys.exit(0)

    base_path = get_base_path()
    app = create_app(base_path)

    local_ip = get_local_ip()

    timer = threading.Timer(1.5, open_browser)
    timer.start()

    print(f"\n Foliador PDF corriendo en {URL}")
    print(f"   Comparte en red local: http://{local_ip}:{PORT}")
    print("\n   Presiona Ctrl+C para detener.\n")

    serve(app, host=HOST, port=PORT)