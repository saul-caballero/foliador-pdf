""" Inicia el servidor Waitress y abre el navegador automáticamente """
import sys
import os
import socket
import atexit
import webbrowser
import threading
from waitress import serve
from app import create_app

HOST = "0.0.0.0"
PORT = 5000
URL  = f"http://localhost:{PORT}"


def get_base_path():
    # Devolver la ruta a los activos agrupados (templates, static)
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def get_exe_path():
    # Devolver la carpeta donde se encuentra el .exe
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))
    

def get_local_ip():
    # Devolver la IP de la red local de la PC.
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "IP no disponible"


def is_port_in_use(port):
    # Comprobar si un puerto ya está en uso 
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


def cleanup_temp_files(temp_folder):
    # Eliminar todos los archivos PDF temporales al apagar el servidor
    try:
        if os.path.exists(temp_folder):
            for filename in os.listdir(temp_folder):
                if filename.endswith(".pdf"):
                    file_path = os.path.join(temp_folder, filename)
                    os.remove(file_path)
            print("\n Archivos temporales eliminados.")
    except Exception as e:
        print(f"\n No se pudieron eliminar archivos temporales: {e}")


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
    exe_path  = get_exe_path()
    # Pasar exe_path via variable de entorno
    os.environ["EXE_PATH"] = exe_path
    
    app = create_app(base_path)

    local_ip = get_local_ip()
    # Limpiar el registro al salir
    temp_folder = os.path.join(base_path, "temp_files")
    atexit.register(cleanup_temp_files, temp_folder)

    timer = threading.Timer(1.5, open_browser)
    timer.start()

    print(f"\n Foliador PDF corriendo en {URL}")
    print(f"   Comparte en red local: http://{local_ip}:{PORT}")
    print("\n   Presiona Ctrl+C para detener.\n")

    serve(app, host=HOST, port=PORT)