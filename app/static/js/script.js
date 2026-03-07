console.log(`
%cFOLIADOR PDF WEB
%cDesarrollado por Saúl Caballero🛡️
%c© 2026 Servyre
`,
'color:#c8a020; font-size:18px; font-weight:bold;',
'color:#555; font-size:13px;',
'color:#aaa; font-size:11px;'
);

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
    const fileInfo         = document.getElementById("file-info");
    const fileList         = document.getElementById("file-list");

    const loadingModal  = document.getElementById("loading-modal");
    const progressBar   = document.getElementById("progress-bar");
    const progressText  = document.getElementById("progress-text");

    const carouselControls  = document.getElementById("carousel-controls");
    const carouselPrev      = document.getElementById("carousel-prev");
    const carouselNext      = document.getElementById("carousel-next");
    const carouselIndicator = document.getElementById("carousel-indicator");

    const sortControls = document.getElementById("sort-controls");
    const sortAZ       = document.getElementById("sort-az");
    const sortZA       = document.getElementById("sort-za");

    const addMoreInput = document.getElementById("add-more-input");

    const previewFilename = document.getElementById("preview-filename");

    let currentPreviewIndex = 0;

    const controls = form.querySelectorAll(
        "input:not([type='hidden']):not(#pdf-file-input), select"
    );

    const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
    const PREVIEW_DELAY  = 750;
    let previewTimer = null;

    // Lista de archivos cargados para modo múltiple
    let loadedFiles = [];

    // Utilities

    function updateFolioDisplay() {
        const n = parseInt(startNumberInput.value) || 1;
        folioDisplay.textContent = `#${String(n).padStart(4, "0")}`;
    }

    function updateSubmitState() {
        const valid = loadedFiles.length > 0;
        submitBtn.disabled = !valid;

        if (loadedFiles.length > 1) {
            submitBtn.textContent = `Foliar y Descargar ZIP (${loadedFiles.length} archivos)`;
        } else if (loadedFiles.length === 1) {
            submitBtn.textContent = "Foliar y Descargar PDF";
        } else {
            submitBtn.textContent = "Foliar y Descargar";
        }
    }

    function updateCarousel() {
        if (loadedFiles.length <= 1) {
            carouselControls.hidden = true;
            return;
        }

        carouselControls.hidden = false;
        carouselIndicator.textContent = `${currentPreviewIndex + 1} / ${loadedFiles.length}`;
        carouselPrev.disabled = currentPreviewIndex === 0;
        carouselNext.disabled = currentPreviewIndex === loadedFiles.length - 1;
    }

    function sortFiles(direction) {
        loadedFiles.sort((a, b) => {
            const result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
            return direction === "az" ? result : -result;
        });
        currentPreviewIndex = 0;
        renderFileList();
        updateCarousel();
        goToPreview(0);
    }

    function goToPreview(index) {
        currentPreviewIndex = index;
        previewFilename.textContent = loadedFiles[index].name;
        previewFilename.hidden = false;
        syncFileInput(loadedFiles[index]);
        updateCarousel();
        renderFileList();
        requestPreview();
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

    function getPageCount(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const arr = new Uint8Array(e.target.result);
                const text = new TextDecoder("latin1").decode(arr);
                const matches = text.match(/\/Type\s*\/Page[^s]/g);
                resolve(matches ? matches.length : "?");
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async function getStartFolioForIndex(index) {
        const startNumber = parseInt(startNumberInput.value) || 1;
        let accumulated = 0;

        for (let i = 0; i < index; i++) {
            const count = await getPageCount(loadedFiles[i]);
            accumulated += typeof count === "number" ? count : 0;
        }

        return startNumber + accumulated;
    }

    function renderFileList() {
        if (loadedFiles.length === 0) {
            fileList.hidden = true;
            fileInfo.innerHTML = "";
            sortControls.hidden = true;
            return;
        }

        sortControls.hidden = loadedFiles.length <= 1;
        fileList.hidden = false;
        fileList.innerHTML = loadedFiles.map((f, i) => `
            <div class="file-list__item ${i === currentPreviewIndex ? 'file-list__item--active' : ''}" 
                 data-index="${i}" draggable="true">
                <span class="file-list__drag">⠿</span>
                <span class="file-list__name">${f.name}</span>
                <span class="file-list__meta">${f._pages ? f._pages + " págs · " : ""}${(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                <button type="button" class="file-list__remove" data-index="${i}">✕</button>
            </div>
        `).join("");

        // Listeners para quitar archivos
        fileList.querySelectorAll(".file-list__remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index);
                loadedFiles.splice(idx, 1);
                renderFileList();
                updateSubmitState();

                if (loadedFiles.length === 0) {
                    screenUpload.hidden = false;
                    screenConfig.hidden = true;
                    carouselControls.hidden = true;
                    return;
                }

                currentPreviewIndex = Math.min(currentPreviewIndex, loadedFiles.length - 1);
                updateCarousel();
                goToPreview(currentPreviewIndex);
            });
        });

        // Drag and drop para reordenar
        let dragSrcIndex = null;

        fileList.querySelectorAll(".file-list__item").forEach(item => {
            item.addEventListener("dragstart", () => {
                dragSrcIndex = parseInt(item.dataset.index);
                item.classList.add("file-list__item--dragging");
            });

            item.addEventListener("dragend", () => {
                item.classList.remove("file-list__item--dragging");
                fileList.querySelectorAll(".file-list__item").forEach(i => {
                    i.classList.remove("file-list__item--dragover");
                });
            });

            item.addEventListener("dragover", (e) => {
                e.preventDefault();
                item.classList.add("file-list__item--dragover");
            });

            item.addEventListener("dragleave", () => {
                item.classList.remove("file-list__item--dragover");
            });

            item.addEventListener("drop", (e) => {
                e.preventDefault();
                const targetIndex = parseInt(item.dataset.index);

                if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

                // Reordenar el array
                const moved = loadedFiles.splice(dragSrcIndex, 1)[0];
                loadedFiles.splice(targetIndex, 0, moved);

                // Actualizar el índice activo
                if (currentPreviewIndex === dragSrcIndex) {
                    currentPreviewIndex = targetIndex;
                } else if (dragSrcIndex < currentPreviewIndex && targetIndex >= currentPreviewIndex) {
                    currentPreviewIndex--;
                } else if (dragSrcIndex > currentPreviewIndex && targetIndex <= currentPreviewIndex) {
                    currentPreviewIndex++;
                }

                dragSrcIndex = null;
                renderFileList();
                updateCarousel();
            });
        });

        // Info general
        const total = loadedFiles.reduce((acc, f) => acc + f.size, 0);
        fileInfo.innerHTML = `
            <span class="file-info__name">${loadedFiles.length} archivo${loadedFiles.length > 1 ? "s" : ""} cargado${loadedFiles.length > 1 ? "s" : ""}</span>
            <span class="file-info__meta">${(total / (1024 * 1024)).toFixed(2)} MB total</span>
        `;
    }

    function syncFileInput(file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
    }

    async function loadFiles(fileListInput) {
        if (!fileListInput || fileListInput.length === 0) return;

        const newFiles = Array.from(fileListInput).filter(validateFile);
        if (newFiles.length === 0) return;

        // Agregar a la lista sin duplicados por nombre
        newFiles.forEach(f => {
            if (!loadedFiles.find(existing => existing.name === f.name)) {
                loadedFiles.push(f);
                // Contar páginas en background y re-renderizar
                getPageCount(f).then(count => {
                    f._pages = count;
                    renderFileList();
                });
            }
        });

        renderFileList();
        updateSubmitState();

        // Preview siempre del primer archivo
        currentPreviewIndex = 0;
        updateCarousel();
        syncFileInput(loadedFiles[0]);

        setTimeout(() => {
            screenUpload.hidden = true;
            screenConfig.hidden = false;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            previewFilename.textContent = loadedFiles[0].name;
            previewFilename.hidden = false;
        }, 300);
    }

    // Preview

    async function requestPreview() {
        if (!fileInput.files.length) return;

        updateFolioDisplay();
        clearTimeout(previewTimer);

        previewTimer = setTimeout(async () => {
            previewMessage.textContent = "Generando vista previa…";
            previewMessage.hidden = false;
            previewImage.hidden = true;

            const formData = new FormData();
            const folioForThisFile = await getStartFolioForIndex(currentPreviewIndex);

            formData.append("pdf_file", fileInput.files[0]);
            controls.forEach(ctrl => {
                if (ctrl.name === "start_number") {
                    formData.append(`${ctrl.name}_prev`, folioForThisFile);
                } else {
                    formData.append(`${ctrl.name}_prev`, ctrl.value);
                }
            });

            // Actualizar el display del folio para este archivo
            folioDisplay.textContent = `#${String(folioForThisFile).padStart(4, "0")}`;

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

    // Upload

    function handleSubmit(event) {
        event.preventDefault();
        if (loadedFiles.length === 0) return;

        loadingModal.hidden = false;
        progressBar.style.width = "0%";
        progressText.textContent = "0%";

        const formData = new FormData(form);

        if (loadedFiles.length === 1) {
            // Modo single: ruta original
            formData.set("pdf_file", loadedFiles[0]);

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
            xhr.send(formData);

        } else {
            // Modo múltiple: ruta /foliar-multiple
            const multiFormData = new FormData();

            // Agregar parámetros del formulario
            controls.forEach(ctrl => {
                multiFormData.append(ctrl.name, ctrl.value);
            });

            // Agregar todos los archivos
            loadedFiles.forEach(f => {
                multiFormData.append("pdf_files", f);
            });

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
                    const blob = new Blob([xhr.response], { type: "application/zip" });
                    const url  = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "Foliados.zip";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    window.location.reload();
                } else {
                    alert(`Error ${xhr.status} al procesar los archivos.`);
                    window.location.reload();
                }
            };

            xhr.onerror = () => {
                loadingModal.hidden = true;
                alert("Error de red.");
                window.location.reload();
            };

            xhr.open("POST", "/foliar-multiple");
            xhr.responseType = "arraybuffer";
            xhr.send(multiFormData);
        }
    }

    // Events

    dropzone.addEventListener("dragover",  (e) => { e.preventDefault(); dropzone.classList.add("dropzone--highlight"); });
    dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); dropzone.classList.remove("dropzone--highlight"); });
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone--highlight");
        loadFiles(e.dataTransfer.files);
    });

    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop",     (e) => e.preventDefault());

    dragInput.addEventListener("change", () => loadFiles(dragInput.files));

    fileInput.addEventListener("change", () => {
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

    carouselPrev.addEventListener("click", () => {
        if (currentPreviewIndex > 0) goToPreview(currentPreviewIndex - 1);
    });

    carouselNext.addEventListener("click", () => {
        if (currentPreviewIndex < loadedFiles.length - 1) goToPreview(currentPreviewIndex + 1);
    });

    sortAZ.addEventListener("click", () => sortFiles("az"));
    sortZA.addEventListener("click", () => sortFiles("za"));

    form.addEventListener("submit", handleSubmit);

    addMoreInput.addEventListener("change", () => loadFiles(addMoreInput.files));

    updateSubmitState();
    updateFolioDisplay();
});