import os
import io
import uuid
from flask import (
    Blueprint, render_template, request,
    send_file, redirect, url_for, flash, current_app
)
from werkzeug.utils import secure_filename

try:
    from app.pdf_processor import add_folios
    PDF_PROCESSOR_AVAILABLE = True
except ImportError as e:
    print(f"[ERROR] Could not import pdf_processor: {e}")
    PDF_PROCESSOR_AVAILABLE = False

try:
    from pdf2image import convert_from_bytes
    PDF_PREVIEW_AVAILABLE = True
except ImportError:
    print("[WARNING] pdf2image not available. Preview disabled.")
    PDF_PREVIEW_AVAILABLE = False


main = Blueprint("main", __name__)


def get_temp_folder():
    return current_app.config["TEMP_FOLDER"]


def parse_form_params(form, suffix=""):
    def field(name):
        return form.get(f"{name}{suffix}")

    start_number = int(field("start_number") or 1)
    start_page   = int(field("start_page") or 1)
    font_size    = int(field("font_size") or 14)
    offset_cm    = float(field("offset") or 1.0)
    corner       = field("corner") or "bottom-right"
    orientation  = field("orientation") or "horizontal"

    end_page_raw = field("end_page")
    end_page = int(end_page_raw) if end_page_raw and end_page_raw.isdigit() else None

    return {
        "start_number": start_number,
        "start_page":   start_page,
        "end_page":     end_page,
        "font_size":    font_size,
        "offset_cm":    offset_cm,
        "corner":       corner,
        "orientation":  orientation,
    }


@main.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        file = request.files.get("pdf_file")

        if not file or file.filename == "":
            flash("No se seleccionó ningún archivo.", "error")
            return redirect(url_for("main.index"))

        if not file.filename.lower().endswith(".pdf"):
            flash("El archivo debe ser un PDF.", "error")
            return redirect(url_for("main.index"))
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size == 0:
            flash("El archivo está vacío.", "error")
            return redirect(url_for("main.index"))

        try:
            file_id   = str(uuid.uuid4())
            safe_name = secure_filename(file.filename)
            temp_in   = os.path.join(get_temp_folder(), f"{file_id}_in.pdf")
            temp_out  = os.path.join(get_temp_folder(), f"{file_id}_out.pdf")

            with open(temp_in, "wb") as f:
                while chunk := file.read(8192):
                    f.write(chunk)

            params = parse_form_params(request.form)

            success = add_folios(
                input_path=temp_in,
                output_path=temp_out,
                preview_mode=False,
                log_folder=current_app.config["LOGS_FOLDER"],
                filename=safe_name,
                **params,
            )

            if success and os.path.exists(temp_out):
                return send_file(
                    temp_out,
                    mimetype="application/pdf",
                    as_attachment=True,
                    download_name=f"Foliado_{safe_name}",
                )

            flash("Error processing the document.", "error")

        except Exception as e:
            flash(f"Unexpected error: {str(e)}", "error")

        return redirect(url_for("main.index"))

    return render_template(
        "index.html",
        pdf_processor_available=PDF_PROCESSOR_AVAILABLE,
        pdf_preview_available=PDF_PREVIEW_AVAILABLE,
    )


@main.route("/preview", methods=["POST"])
def preview():
    if not PDF_PREVIEW_AVAILABLE:
        return "Preview unavailable.", 501

    file = request.files.get("pdf_file")
    if not file:
        return "No file received.", 400

    file.seek(0, os.SEEK_END)
    size_mb = file.tell() / (1024 * 1024)
    file.seek(0)
    if size_mb > 30:
        return "File too large for preview.", 413

    try:
        file_id  = str(uuid.uuid4())
        temp_in  = os.path.join(get_temp_folder(), f"prev_in_{file_id}.pdf")
        temp_out = os.path.join(get_temp_folder(), f"prev_out_{file_id}.pdf")

        file.save(temp_in)
        params = parse_form_params(request.form, suffix="_prev")
        params["end_page"] = params["start_page"]

        add_folios(
            input_path=temp_in,
            output_path=temp_out,
            preview_mode=True,
            log_folder=current_app.config["LOGS_FOLDER"],
            **params,
        )

        with open(temp_out, "rb") as f:
            images = convert_from_bytes(
                f.read(), first_page=1, last_page=1, fmt="png", dpi=72
            )

        img_io = io.BytesIO()
        images[0].save(img_io, format="PNG")
        img_io.seek(0)

        return send_file(img_io, mimetype="image/png")

    except Exception as e:
        return f"Preview error: {str(e)}", 500


@main.route("/instructions")
def instructions():
    return render_template("instructions.html")

@main.route("/history")
def history():
    log_path = os.path.join(current_app.config["LOGS_FOLDER"], "folios.txt")
    entries = []

    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        for line in reversed(lines):
            line = line.strip()
            if line:
                parts = line.split(" | ")
                if len(parts) >= 4:
                    entries.append({
                        "date":     parts[0],
                        "status":   parts[1],
                        "folios":   parts[2],
                        "pages":    parts[3],
                        "filename": parts[5].replace("File: ", "") if len(parts) >= 6 else "—",
                    })

    return render_template("history.html", entries=entries)


# Error 
@main.app_errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@main.app_errorhandler(500)
def internal_server_error(e):
    return render_template("500.html"), 500