# Foliador PDF

Sistema de numeración automatizada de documentos PDF para uso corporativo.
Desarrollado con Flask y distribuido como aplicación de escritorio para Windows.

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

### Opcion A — Ejecutable (recomendado para usuarios finales)

Doble clic en FoliadorPDF.exe

No requiere Python instalado. Solo Poppler.

### Opcion B — Desde codigo fuente (para desarrolladores)

    python run.py

### Opcion C — Lanzador rapido (para desarrolladores)

Doble clic en iniciar.bat

Verifica dependencias e inicia el servidor automaticamente.


## Acceso en red local

Con el servidor corriendo, cualquier equipo en la misma red puede acceder:

    http://192.168.1.X:5000

Para conocer la IP del servidor ejecutar en terminal:

    ipconfig

Buscar la linea "Direccion IPv4".

---

## Flujo de uso

1. Abrir la aplicacion
2. Arrastrar el archivo PDF a la zona de carga
3. Configurar numero de folio inicial y rango de paginas
4. Ajustar esquina, tamano de fuente y margen
5. Verificar posicion en la vista previa
6. Hacer clic en "Foliar y Descargar PDF"

---

## Estructura del proyecto

    foliador-pdf/
    app/
        __init__.py          Configuracion y factory de Flask
        routes.py            Rutas HTTP (/ y /preview)
        pdf_processor.py     Logica central de foliado
        static/
            css/style.css    Estilos
            js/script.js     Interactividad del frontend
        templates/
            base.html        Plantilla base Jinja2
            index.html       Interfaz principal
    logs/                    Historial de operaciones generado automaticamente
    temp_files/              Archivos temporales generados automaticamente
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

Cada operacion exitosa se registra en logs/folios.txt con el formato:

    2026-01-28 10:05:35 | SUCCESS | Folios: 0001 to 0456 | Pages: 456 | Corner: bottom-right

Los errores se registran en logs/errors.txt

---

## Mejoras pendientes

- Detectar si el servidor ya esta corriendo al abrir el ejecutable dos veces
- Limpiar archivos temporales automaticamente al cerrar el servidor
- Paginas de error personalizadas en lugar de las de Flask por defecto
- Mostrar la IP local automaticamente en la consola al arrancar

---

## Notas tecnicas

- Waitress maneja multiples usuarios simultaneamente.
- Los archivos temporales viven en temp_files/ y no se suben al repositorio.
- La vista previa tiene un limite de 30 MB para proteger la RAM del servidor.
- El limite de tamano de archivo para foliado es de 2 GB.