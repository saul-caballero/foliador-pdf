# Foliador PDF

Sistema de numeracion automatizada de documentos PDF para uso corporativo.
Desarrollado con Flask y distribuido como aplicacion de escritorio para Windows.

---

## Requisitos

- Python 3.10 o superior
- Poppler para Windows

## Instalacion de Poppler

Descargar desde:
https://github.com/oschwartz10612/poppler-windows/releases

Extraer en C:\poppler y agregar al PATH del sistema:

    C:\poppler\Library\bin

Verificar instalacion en terminal:

    pdftoppm -v

---

## Instalacion del proyecto

    git clone https://github.com/tu-usuario/foliador-pdf.git
    cd foliador-pdf
    pip install -r requirements.txt

---

## Uso

### Opcion A - Ejecutable (recomendado para usuarios finales)

Doble clic en FoliadorPDF.exe

No requiere Python instalado. Solo Poppler.
Los logs se guardan en una carpeta llamada foliador-logs junto al ejecutable.

### Opcion B - Desde codigo fuente (para desarrolladores)

    python run.py

### Opcion C - Lanzador rapido (para desarrolladores)

Doble clic en iniciar.bat

Verifica dependencias e inicia el servidor automaticamente.

---

## Acceso en red local

Con el servidor corriendo, cualquier equipo en la misma red puede acceder:

    http://192.168.1.X:5000

La IP del servidor se muestra automaticamente en la consola al arrancar.
Para consultarla manualmente ejecutar en terminal:

    ipconfig

Buscar la linea "Direccion IPv4".

---

## Flujo de uso

1. Abrir la aplicacion
2. Arrastrar el archivo PDF a la zona de carga
3. Verificar el nombre del archivo y numero de paginas detectados
4. Configurar numero de folio inicial y rango de paginas
5. Ajustar esquina, tamano de fuente y margen
6. Verificar posicion en la vista previa
7. Hacer clic en "Foliar y Descargar PDF"

---

## Paginas disponibles

| Ruta          | Descripcion                              |
|---------------|------------------------------------------|
| /             | Interfaz principal de foliado            |
| /instructions | Guia de uso para usuarios nuevos         |
| /history      | Historial de operaciones realizadas      |

---

## Estructura del proyecto

    foliador-pdf/
    app/
        __init__.py          Configuracion y factory de Flask
        routes.py            Rutas HTTP
        pdf_processor.py     Logica central de foliado
        static/
            css/style.css    Estilos
            js/script.js     Interactividad del frontend
            img/             Iconos e imagenes
        templates/
            base.html        Plantilla base Jinja2
            index.html       Interfaz principal
            instructions.html Pagina de instrucciones
            history.html     Pagina de historial
            404.html         Pagina de error 404
            500.html         Pagina de error 500
    iniciar.bat              Lanzador para Windows
    foliador.spec            Configuracion de PyInstaller
    run.py                   Punto de entrada del servidor
    requirements.txt         Dependencias de Python

---

## Generar ejecutable

    pyinstaller foliador.spec

El ejecutable se genera en:

    dist/FoliadorPDF.exe

Distribuir por USB o carpeta compartida de red.
Cada actualizacion del codigo requiere regenerar el ejecutable.

---

## Dependencias

| Libreria    | Uso                                        |
|-------------|--------------------------------------------|
| Flask       | Servidor web                               |
| pypdf       | Lectura y escritura de archivos PDF        |
| reportlab   | Generacion de capas de texto sobre PDF     |
| pdf2image   | Conversion de pagina PDF a imagen preview  |
| Pillow      | Procesamiento de imagenes                  |
| Waitress    | Servidor de produccion para Windows        |
| Poppler     | Motor externo de renderizado PDF           |

---

## Logs

Cada operacion exitosa se registra con el formato:

    2026-01-28 10:05:35 | SUCCESS | Folios: 0001 to 0456 | Pages: 456 | Corner: bottom-right | File: documento.pdf

Al ejecutar desde codigo fuente los logs se guardan en:

    logs/folios.txt

Al ejecutar desde el ejecutable los logs se guardan en:

    foliador-logs/folios.txt  (junto al .exe)

Los errores se registran en errors.txt dentro de la misma carpeta.

---

## Notas tecnicas

- Waitress maneja multiples usuarios simultaneamente.
- Si el ejecutable se abre dos veces, el segundo solo abre el navegador sin iniciar un servidor nuevo.
- Los archivos temporales se eliminan automaticamente al cerrar el servidor.
- La vista previa tiene un limite de 30 MB para proteger la RAM del servidor.
- El limite de tamano de archivo para foliado es de 2 GB.
- Los PDFs con contrasena son rechazados automaticamente.