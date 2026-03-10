# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

---

## [1.4.0] - 2026-03-10

### Nuevo
- Vista previa de última página con botones Primera/Última en el panel de vista previa
- Versión centralizada en `__init__.py` via context processor — un solo lugar para actualizar
- Validación de magic bytes - rechaza archivos que no son PDF reales aunque tengan extensión .pdf
- Título de pestaña dinámico - muestra Procesando... y Listo según el estado
- Validación de página inicial en tiempo real con aviso si supera el total de páginas del archivo
- Contador de archivos en modal durante procesamiento ZIP
- Archivos con error se listan en ERRORES.txt dentro del ZIP

## [1.3.1] - 2026-03-09

### Corregido
- PDFs comprimidos o generados por herramientas externas (iLovePDF, PDF Tools) ahora se sanitizan automáticamente con pikepdf antes de foliar
- Vista previa y conteo de páginas con fallback pikepdf para PDFs malformados
- Archivos en ZIP ahora mantienen el orden definido por el usuario con prefijo numérico
- File lock en borrado de historial para evitar desalineación con uso concurrente
- Tiempo de limpieza de archivos temporales aumentado de 30 min a 2 horas
- Nombres de archivo con caracteres especiales o muy largos ya no rompen el procesamiento
- Mensaje de error específico cuando el rango de páginas es inválido
- Mensajes de error traducidos al español


## [1.3.0] - 2026-03-09

### Agregado
- Soporte para foliar varios archivos PDF a la vez con descarga en ZIP
- Folios consecutivos automáticos entre archivos del mismo lote
- Modal de confirmación con resumen antes de procesar (archivos, páginas, rango de folios)
- Carousel con flechas y teclado para navegar la vista previa entre archivos
- Icono de esquina en tiempo real en la lista de archivos
- Botones de ordenamiento A-Z y Z-A en la lista de archivos
- Tooltips informativos en cada campo del formulario
- Modal de bienvenida con lista de tips al primer uso
- Historial de operaciones en /history con tabla completa
- Filtros en historial por estado, nombre de archivo y rango de fechas
- Exportación del historial a CSV y Excel (respetando filtros activos)
- Paginación en historial (50 registros por página)
- Eliminación de registros individuales y borrado total del historial
- Columnas ordenables en la tabla del historial
- Registro de duración de cada operación en el log
- Registro de IP del cliente en el log
- Registro de lote (batch) en el log
- Modo claro/oscuro con persistencia entre sesiones y páginas
- Toggle de tema en todas las páginas (index, historial, instrucciones)
- Página de instrucciones actualizada con 8 pasos y notas completas
- Limpieza automática de archivos temporales cada 30 minutos

### Cambiado
- Formato del log: separador de folios cambiado de "to" a guión (0001 - 0456)
- Esquina en el log ahora se guarda en español (ej. "Abajo derecha")
- Validación de folio mínimo: fuerza a 1 si se ingresa un valor menor
- Vista previa limitada a 30 MB para proteger la RAM del servidor

### Corregido
- El modal de onboarding ahora muestra todos los tips en lugar de uno aleatorio
- Persistencia del tema al navegar entre páginas
- Error 500 en /instructions por bloque scripts anidado dentro de content
- Botones de paginación con ancho correcto en el historial

---

## [1.2.0]

### Agregado
- Soporte para rango de páginas (página inicial y página final)
- Campo de margen lateral configurable en centímetros
- Selección de orientación del folio (horizontal / vertical)

### Cambiado
- Interfaz rediseñada con panel de configuración y vista previa en paralelo

---

## [1.1.0]

### Agregado
- Vista previa de la primera página foliada antes de procesar
- Selección de esquina de posición del folio
- Selección de tamaño de fuente

---

## [1.0.0] 

### Agregado
- Foliado básico de archivos PDF con número inicial configurable
- Formato de 4 dígitos con padding de ceros
- Descarga automática del PDF foliado
- Log de operaciones exitosas