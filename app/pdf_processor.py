import os
import time
from io import BytesIO
from datetime import datetime

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

try:
    import pikepdf
    PIKEPDF_AVAILABLE = True
except ImportError:
    PIKEPDF_AVAILABLE = False


def _log(folder, level, message):
    filename = "folios.txt" if level == "SUCCESS" else "errors.txt"
    path  = os.path.join(folder, filename)
    entry = f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | {level} | {message}\n"
    with open(path, "a", encoding="utf-8") as f:
        f.write(entry)


CORNER_LABELS = {
    "bottom-right": "Abajo derecha",
    "bottom-left":  "Abajo izquierda",
    "top-right":    "Arriba derecha",
    "top-left":     "Arriba izquierda",
}

def log_success(folder, start_number, pages, corner, filename="", batch=None, duration=None, client_ip=None):
    end_number   = start_number + pages - 1
    corner_label = CORNER_LABELS.get(corner, corner)
    filename_str = f" | File: {filename}"   if filename   else " | File: —"
    batch_str    = f" | Batch: {batch}"     if batch      else " | Batch: Individual"
    duration_str = f" | Duration: {duration:.1f}s" if duration is not None else " | Duration: —"
    ip_str       = f" | IP: {client_ip}"    if client_ip  else " | IP: —"
    _log(folder, "SUCCESS",
         f"Folios: {start_number:04} - {end_number:04} | Pages: {pages} | Corner: {corner_label}{filename_str}{batch_str}{duration_str}{ip_str}")


def log_error(folder, message, detail=""):
    detail_str = f" | {detail}" if detail else ""
    _log(folder, "ERROR", f"{message}{detail_str}")


def _create_folio_overlay(page_width, page_height, folio_text,
                           font, font_size, offset_cm, corner, orientation):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))
    c.setFont(font, font_size)

    margin = offset_cm * cm

    if "right" in corner:
        x    = page_width - margin
        draw = c.drawRightString
    else:
        x    = margin
        draw = c.drawString

    if "bottom" in corner:
        y = margin
    else:
        y = page_height - margin - font_size

    if orientation == "vertical":
        c.saveState()
        c.translate(x, y)
        c.rotate(90)
        c.drawString(0, 0, folio_text)
        c.restoreState()
    else:
        draw(x, y, folio_text)

    c.save()
    buffer.seek(0)
    return buffer

def sanitize_pdf(input_path, output_path):
    # Intentar reparar un PDF malformado usando pikepdf.
    if not PIKEPDF_AVAILABLE:
        return False
    try:
        with pikepdf.open(input_path, allow_overwriting_input=False) as pdf:
            pdf.save(output_path)
        return True
    except Exception as e:
        print(f"[pikepdf] No se pudo sanitizar: {e}")
        return False


def add_folios(input_path, output_path, log_folder,
               font="Courier-Bold", font_size=14, start_number=1,
               offset_cm=1.0, corner="bottom-right", orientation="horizontal",
               start_page=1, end_page=None, preview_mode=False,
               filename="", batch=None, client_ip=None):

    t_start = time.time()

    try:
        try:
            reader = PdfReader(input_path)
        except Exception:
            print("[WARNING] pypdf falló al leer, intentando sanitizar con pikepdf...")
            sanitized_path = input_path.replace(".pdf", "_sanitized.pdf")
            if sanitize_pdf(input_path, sanitized_path):
                reader = PdfReader(sanitized_path)
            else:
                log_error(log_folder, "PDF malformado, no se pudo sanitizar", input_path)
                return False

        if reader.is_encrypted:
            log_error(log_folder, "Encrypted PDF rejected", input_path)
            return False

        writer = PdfWriter()
        total  = len(reader.pages)

        start_idx = max(0, start_page - 1)
        end_idx   = min(total, end_page if end_page else total)

        pages_before   = reader.pages[0:start_idx]
        pages_to_folio = reader.pages[start_idx:end_idx]
        count = len(pages_to_folio)

        if count <= 0 and not preview_mode:
            raise ValueError(f"La página inicial ({start_page}) es mayor que el total de páginas del PDF ({total}).")

        if not preview_mode:
            for page in pages_before:
                writer.add_page(page)

        current_number = start_number
        for page in pages_to_folio:
            folio_text = f"{current_number:04}"

            page.transfer_rotation_to_content()

            width  = float(page.mediabox.width)
            height = float(page.mediabox.height)

            overlay_buffer = _create_folio_overlay(
                width, height, folio_text,
                font, font_size, offset_cm, corner, orientation
            )

            overlay_page = PdfReader(overlay_buffer).pages[0]
            page.merge_page(overlay_page)
            writer.add_page(page)
            current_number += 1

        with open(output_path, "wb") as f:
            writer.write(f)

        if not preview_mode:
            duration = time.time() - t_start
            log_success(log_folder, start_number, count, corner,
                        filename, batch, duration, client_ip)

        return True

    except Exception as e:
        try:
            log_error(log_folder, "Failed to process PDF", str(e))
        except Exception:
            pass
        print(f"[ERROR] add_folios: {e}")
        return False