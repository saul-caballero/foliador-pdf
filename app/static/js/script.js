document.addEventListener("DOMContentLoaded", () => {

    const screenUpload  = document.getElementById("screen-upload");
    const screenConfig  = document.getElementById("screen-config");

    const dropzone      = document.getElementById("dropzone");
    const dragInput     = document.getElementById("pdf-drag-input");
    const fileInput     = document.getElementById("pdf-file-input");

    const form          = document.getElementById("folio-form");
    const submitBtn     = document.getElementById("submit-btn");

    const folioDisplay     = document.getElementById("folio-display");
    const startNumberInput = document.getElementById("start_number");

    const previewMessage   = document.getElementById("preview-message");
    const previewImage     = document.getElementById("preview-image");

    const loadingModal  = document.getElementById("loading-modal");
    const progressBar   = document.getElementById("progress-bar");
    const progressText  = document.getElementById("progress-text");

    const controls = form.querySelectorAll(
        "input:not([type='hidden']):not(#pdf-file-input), select"
    );

    const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
    const PREVIEW_DELAY  = 750;
    let previewTimer = null;

    // ── Utilities ──

    function updateFolioDisplay() {
        const n = parseInt(startNumberInput.value) || 1;
        folioDisplay.textContent = `#${String(n).padStart(4, "0")}`;
    }

    function updateSubmitState() {
        const valid = fileInput.files.length > 0
                   && fileInput.files[0].size <= MAX_FILE_BYTES;
        submitBtn.disabled = !valid;
    }

    function validateFile(file) {
        if (!file) return false;
        if (file.size > MAX_FILE_BYTES) {
            alert(`El archivo excede el límite de 2 GB.\nTamaño: ${(file.size / 1e9).toFixed(2)} GB`);
            return false;
        }
        if (file.type !== "application/pdf") {
            alert("Solo se aceptan archivos PDF.");
            return false;
        }
        return true;
    }

    function loadFile(fileList) {
        if (!fileList || fileList.length === 0) return;
        const file = fileList[0];
        if (!validateFile(file)) return;

        dropzone.classList.add("dropzone--loaded");
        dropzone.querySelector(".dropzone__text").textContent = "Cargando archivo...";

        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        updateSubmitState();

        setTimeout(() => {
            screenUpload.hidden = true;
            screenConfig.hidden = false;
            dropzone.classList.remove("dropzone--loaded");
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        }, 500);
    }

    // ── Preview ──

    function requestPreview() {
        if (!fileInput.files.length) return;

        updateFolioDisplay();
        clearTimeout(previewTimer);

        previewTimer = setTimeout(async () => {
            previewMessage.textContent = "Generando vista previa…";
            previewMessage.hidden = false;
            previewImage.hidden = true;

            const formData = new FormData();
            formData.append("pdf_file", fileInput.files[0]);
            controls.forEach(ctrl => {
                formData.append(`${ctrl.name}_prev`, ctrl.value);
            });

            try {
                const response = await fetch("/preview", { method: "POST", body: formData });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || `HTTP ${response.status}`);
                }
                const blob = await response.blob();
                previewImage.src = URL.createObjectURL(blob);
                previewImage.hidden = false;
                previewMessage.textContent = "Vista previa de la primera página foliada:";
            } catch (err) {
                previewMessage.innerHTML = `<span style="color:#c8401a">Error: ${err.message}</span>`;
                previewImage.hidden = true;
            }

        }, PREVIEW_DELAY);
    }

    // ── Upload ──

    function handleSubmit(event) {
        event.preventDefault();
        if (!validateFile(fileInput.files[0])) return;

        loadingModal.hidden = false;
        progressBar.style.width = "0%";
        progressText.textContent = "0%";

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${pct}%`;
                progressText.textContent = `${pct}%`;
            }
        };

        xhr.onload = () => {
            loadingModal.hidden = true;
            if (xhr.status === 200) {
                const disposition = xhr.getResponseHeader("Content-Disposition") || "";
                const match = disposition.match(/filename="?([^";]+)"?/);
                const filename = match ? match[1].replace(/['"]/g, "") : "foliado.pdf";

                const blob = new Blob([xhr.response], { type: "application/pdf" });
                const url  = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                window.location.reload();
            } else {
                alert(`Error ${xhr.status} al procesar el archivo.`);
                window.location.reload();
            }
        };

        xhr.onerror = () => {
            loadingModal.hidden = true;
            alert("Error de red.");
            window.location.reload();
        };

        xhr.open("POST", form.action);
        xhr.responseType = "arraybuffer";
        xhr.send(new FormData(form));
    }

    // ── Events ──

    dropzone.addEventListener("dragover",  (e) => { e.preventDefault(); dropzone.classList.add("dropzone--highlight"); });
    dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); dropzone.classList.remove("dropzone--highlight"); });
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone--highlight");
        loadFile(e.dataTransfer.files);
    });

    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop",     (e) => e.preventDefault());

    dragInput.addEventListener("change", () => loadFile(dragInput.files));

    fileInput.addEventListener("change", () => {
        updateSubmitState();
        requestPreview();
    });

    controls.forEach(ctrl => {
        ctrl.addEventListener("change", requestPreview);
        ctrl.addEventListener("change", updateFolioDisplay);
        if (ctrl.type === "number" || ctrl.type === "text") {
            ctrl.addEventListener("input", requestPreview);
            ctrl.addEventListener("input", updateFolioDisplay);
        }
    });

    form.addEventListener("submit", handleSubmit);

    updateSubmitState();
    updateFolioDisplay();
});