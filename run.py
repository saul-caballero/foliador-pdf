""" Inicia el servidor Waitress y abre el navegador automáticamente. """
import webbrowser
import threading
from waitress import serve
from app import create_app

HOST = "0.0.0.0"
PORT = 5000
URL = f"http://localhost:{PORT}"


def open_browser():
    """Abre el navegador después de un breve retraso para permitir que el servidor se inicie."""
    webbrowser.open(URL)


if __name__ == "__main__":
    app = create_app()

    timer = threading.Timer(1.5, open_browser)
    timer.start()

    print(f"\nFoliador PDF corriendo en {URL}")
    print(f" Comparte esta dirección en tu red local:")
    print(f" http://<tu-ip>:{PORT}")
    print("\n Presiona Ctrl+C para detener el servidor.\n")

# Desarrollo Local (test)
# app.run(host="localhost", port=PORT, debug=True)

# Producción
serve(app, host=HOST, port=PORT)