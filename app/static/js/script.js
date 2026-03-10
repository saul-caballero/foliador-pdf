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
    const cornerSelect     = document.getElementById("corner");

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

    const addMoreInput    = document.getElementById("add-more-input");
    const previewFilename = document.getElementById("preview-filename");
    const clearAllBtn     = document.getElementById("clear-all-btn");

    const confirmModal   = document.getElementById("confirm-modal");
    const confirmSummary = document.getElementById("confirm-summary");
    const confirmCancel  = document.getElementById("confirm-cancel");
    const confirmOk      = document.getElementById("confirm-ok");

    const toast        = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");

    const folioRangeDisplay = document.getElementById("folio-range-display");
    const folioRangeText    = document.getElementById("folio-range-text");

    const themeToggle = document.getElementById("theme-toggle");

    let currentPreviewIndex = 0;
    let loadedFiles = [];
    let toastCountdownInterval = null;

    const controls = form.querySelectorAll(
        "input:not([type='hidden']):not(#pdf-file-input), select"
    );

    const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
    const PREVIEW_DELAY  = 750;
    let previewTimer = null;

    // Mapa de esquinas a iconos de flecha
    const CORNER_ICONS = {
        "bottom-right": "↘",
        "bottom-left":  "↙",
        "top-right":    "↗",
        "top-left":     "↖",
    };

    function getCornerIcon() {
        const val = cornerSelect ? cornerSelect.value : "bottom-right";
        return CORNER_ICONS[val] || "↘";
    }


    // UTILIDADES

    function updateFolioDisplay() {
        let n = parseInt(startNumberInput.value) || 1;
        if (n < 1) {
            n = 1;
            startNumberInput.value = 1;
        }
        folioDisplay.textContent = `#${String(n).padStart(4, "0")}`;
    }

    async function updateFolioRange() {
        if (loadedFiles.length === 0) {
            folioRangeDisplay.hidden = true;
            return;
        }

        const startNumber = parseInt(startNumberInput.value) || 1;
        let totalPages = 0;

        for (const f of loadedFiles) {
            const count = await getPageCount(f);
            totalPages += typeof count === "number" ? count : 0;
        }

        const endFolio = startNumber + totalPages - 1;
        folioRangeText.textContent = `${String(startNumber).padStart(4, "0")} — ${String(endFolio).padStart(4, "0")} | TOTAL: ${totalPages} páginas.`;
        folioRangeDisplay.hidden = false;
    }

    function saveConfig() {
        const config = {};
        controls.forEach(ctrl => { config[ctrl.name] = ctrl.value; });
        localStorage.setItem("folio-config", JSON.stringify(config));
    }

    function loadConfig() {
        const saved = localStorage.getItem("folio-config");
        if (!saved) return;
        try {
            const config = JSON.parse(saved);
            controls.forEach(ctrl => {
                if (config[ctrl.name] !== undefined) ctrl.value = config[ctrl.name];
            });
        } catch (e) { /* config corrupta, ignorar */ }
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

    function clearAll() {
        loadedFiles = [];
        currentPreviewIndex = 0;
        renderFileList();
        updateSubmitState();
        updateCarousel();
        previewImage.hidden = true;
        previewMessage.textContent = "Sube un PDF para ver la vista previa de la primera página.";
        previewMessage.hidden = false;
        previewFilename.hidden = true;
        screenUpload.hidden = false;
        screenConfig.hidden = true;
        clearAllBtn.hidden = true;
    }

    // Toast con contador regresivo y botón "Foliar de nuevo"
    function showToast(message, seconds = 5) {
        if (toastCountdownInterval) {
            clearInterval(toastCountdownInterval);
            toastCountdownInterval = null;
        }

        let remaining = seconds;

        function renderToast() {
            toastMessage.innerHTML = `
                ${message} · cerrando en ${remaining}s
                <button id="toast-retry-btn" style="
                    margin-left:16px;
                    background:transparent;
                    border:1px solid currentColor;
                    border-radius:4px;
                    color:inherit;
                    font-family:inherit;
                    font-size:0.82rem;
                    font-weight:600;
                    padding:4px 10px;
                    cursor:pointer;
                ">Foliar de nuevo</button>
            `;

            const retryBtn = document.getElementById("toast-retry-btn");
            if (retryBtn) {
                retryBtn.addEventListener("click", () => {
                    clearInterval(toastCountdownInterval);
                    toastCountdownInterval = null;
                    hideToast();
                    window.location.reload();
                });
            }
        }

        function hideToast() {
            toast.classList.remove("toast--visible");
            toast.setAttribute("hidden", "");
            toastMessage.innerHTML = "";
        }

        setTimeout(() => {
            toast.removeAttribute("hidden");
            toast.classList.add("toast--visible");
            renderToast();

            toastCountdownInterval = setInterval(() => {
                remaining--;
                if (remaining <= 0) {
                    clearInterval(toastCountdownInterval);
                    toastCountdownInterval = null;
                    hideToast();
                    window.location.reload();
                } else {
                    renderToast();
                }
            }, 1000);
        }, 1200);
    }

    async function showConfirmModal() {
        const startNumber = parseInt(startNumberInput.value) || 1;

        let totalPages = 0;
        for (const f of loadedFiles) {
            const count = await getPageCount(f);
            totalPages += typeof count === "number" ? count : 0;
        }

        const endFolio = startNumber + totalPages - 1;
        const corruptos = loadedFiles.filter(f => f._corrupt);

        const corruptWarning = corruptos.length > 0 ? `
            <div class="confirm-summary__row confirm-summary__warning">
                <span>⚠ Archivos con problemas</span>
                <span class="confirm-summary__value">${corruptos.length}</span>
            </div>
            ${corruptos.map(f => `
                <div class="confirm-summary__row">
                    <span class="confirm-summary__corrupt-name">— ${f.name}</span>
                </div>
            `).join("")}
        ` : "";

        confirmSummary.innerHTML = `
            <div class="confirm-summary__row">
                <span>Archivos</span>
                <span class="confirm-summary__value">${loadedFiles.length}</span>
            </div>
            <div class="confirm-summary__row">
                <span>Páginas totales</span>
                <span class="confirm-summary__value">${totalPages}</span>
            </div>
            <div class="confirm-summary__row">
                <span>Rango de folios</span>
                <span class="confirm-summary__value">${String(startNumber).padStart(4, "0")} — ${String(endFolio).padStart(4, "0")}</span>
            </div>
            ${corruptWarning}
        `;

        confirmModal.hidden = false;
        confirmOk.focus();
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
        if (file._pages && file._pages !== "?") return Promise.resolve(file._pages);
        
        const formData = new FormData();
        formData.append("pdf_file", file);
        
        return fetch("/page-count", { method: "POST", body: formData })
            .then(r => r.json())
            .then(data => {
                const count = data.count ?? "?";
                file._pages = count;
                file._corrupt = count === null || count === "?";
                return count;
            })
            .catch(() => {
                file._pages = "?";
                file._corrupt = true;
                return "?";
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


    // RENDER FILE LIST

    function renderFileList() {
        if (loadedFiles.length === 0) {
            fileList.hidden = true;
            fileInfo.innerHTML = "";
            sortControls.hidden = true;
            clearAllBtn.hidden = true;
            return;
        }

        sortControls.hidden = loadedFiles.length <= 1;
        clearAllBtn.hidden = false;
        fileList.hidden = false;

        const cornerIcon = getCornerIcon();

        fileList.innerHTML = loadedFiles.map((f, i) => `
            <div class="file-list__item ${i === currentPreviewIndex ? "file-list__item--active" : ""}"
                 data-index="${i}" draggable="true">
                <span class="file-list__drag">⠿</span>
                <span class="file-list__icon">📄</span>
                <span class="file-list__name ${f._corrupt ? "file-list__name--corrupt" : ""}">${f.name}${f._corrupt ? " ⚠" : ""}</span>
                <span class="file-list__meta">${f._pages ? f._pages + " págs · " : ""}${(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span class="file-list__corner" title="Esquina del folio">${cornerIcon}</span>
                <button type="button" class="file-list__remove" data-index="${i}">✕</button>
            </div>
        `).join("");

        fileList.querySelectorAll(".file-list__remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.dataset.index);
                loadedFiles.splice(idx, 1);
                renderFileList();
                updateSubmitState();
                updateFolioRange();

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

                const moved = loadedFiles.splice(dragSrcIndex, 1)[0];
                loadedFiles.splice(targetIndex, 0, moved);

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

        const total   = loadedFiles.reduce((acc, f) => acc + f.size, 0);
        const totalMB = total / (1024 * 1024);
        const warningMsg = loadedFiles.length > 20 || totalMB > 500
            ? `⚠ ${loadedFiles.length} archivos · ${totalMB.toFixed(0)} MB — El procesamiento puede tardar varios minutos.`
            : "";

        fileInfo.innerHTML = `
            <span class="file-info__name">${loadedFiles.length} archivo${loadedFiles.length > 1 ? "s" : ""} cargado${loadedFiles.length > 1 ? "s" : ""}</span>
            <span class="file-info__meta">${totalMB.toFixed(2)} MB total</span>
            ${warningMsg ? `<span class="file-info__warning">${warningMsg}</span>` : ""}
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

        newFiles.forEach(f => {
            if (!loadedFiles.find(existing => existing.name === f.name)) {
                loadedFiles.push(f);
                getPageCount(f).then(count => {
                    f._pages = count;
                    if (count === "?") f._corrupt = true;
                    renderFileList();
                });
            }
        });

        renderFileList();
        updateSubmitState();

        currentPreviewIndex = 0;
        updateCarousel();
        syncFileInput(loadedFiles[0]);

        setTimeout(() => {
            screenUpload.hidden = true;
            screenConfig.hidden = false;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            previewFilename.textContent = loadedFiles[0].name;
            previewFilename.hidden = false;
            updateFolioRange();
        }, 300);
    }


    // PREVIEW

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


    // UPLOAD

    function handleSubmit(event) {
        event.preventDefault();
        if (loadedFiles.length === 0) return;
        showConfirmModal();
    }

    function processUpload() {
        confirmModal.hidden = true;
        loadingModal.hidden = false;
        progressBar.style.width = "0%";
        progressText.textContent = "0%";

        const formData = new FormData(form);

        if (loadedFiles.length === 1) {
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
                    showToast("✓ PDF listo");
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
            const multiFormData = new FormData();

            controls.forEach(ctrl => { multiFormData.append(ctrl.name, ctrl.value); });
            loadedFiles.forEach(f  => { multiFormData.append("pdf_files", f); });

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
                    showToast(`✓ ZIP listo (${loadedFiles.length} archivos)`);
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

    // EVENTOS

    dropzone.addEventListener("dragover",  (e) => { e.preventDefault(); dropzone.classList.add("dropzone--highlight"); });
    dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); dropzone.classList.remove("dropzone--highlight"); });
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone--highlight");
        loadFiles(e.dataTransfer.files);
    });

    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop",     (e) => e.preventDefault());

    dragInput.addEventListener("change",   () => loadFiles(dragInput.files));
    addMoreInput.addEventListener("change", () => loadFiles(addMoreInput.files));
    clearAllBtn.addEventListener("click",   clearAll);

    fileInput.addEventListener("change", () => requestPreview());

    controls.forEach(ctrl => {
        ctrl.addEventListener("change", requestPreview);
        ctrl.addEventListener("change", updateFolioDisplay);
        ctrl.addEventListener("change", saveConfig);
        // Actualizar iconito de esquina en tiempo real al cambiar el select
        if (ctrl.name === "corner") {
            ctrl.addEventListener("change", renderFileList);
        }
        if (ctrl.type === "number" || ctrl.type === "text") {
            ctrl.addEventListener("input", requestPreview);
            ctrl.addEventListener("input", updateFolioDisplay);
            ctrl.addEventListener("input", saveConfig);
            ctrl.addEventListener("input", updateFolioRange);
        }
    });

    carouselPrev.addEventListener("click", () => {
        if (currentPreviewIndex > 0) goToPreview(currentPreviewIndex - 1);
    });
    carouselNext.addEventListener("click", () => {
        if (currentPreviewIndex < loadedFiles.length - 1) goToPreview(currentPreviewIndex + 1);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !confirmModal.hidden) {
            confirmModal.hidden = true;
            return;
        }
        if (e.key === "Enter" && !confirmModal.hidden) {
            e.preventDefault();
            processUpload();
            return;
        }
        if (e.key === "ArrowLeft" && screenConfig && !screenConfig.hidden) {
            if (currentPreviewIndex > 0) goToPreview(currentPreviewIndex - 1);
            return;
        }
        if (e.key === "ArrowRight" && screenConfig && !screenConfig.hidden) {
            if (currentPreviewIndex < loadedFiles.length - 1) goToPreview(currentPreviewIndex + 1);
            return;
        }
    });

    sortAZ.addEventListener("click", () => sortFiles("az"));
    sortZA.addEventListener("click", () => sortFiles("za"));

    form.addEventListener("submit", handleSubmit);

    confirmCancel.addEventListener("click", () => { confirmModal.hidden = true; });
    confirmOk.addEventListener("click", processUpload);

    themeToggle.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("theme--light");
        themeToggle.textContent = isLight ? "🌙 Oscuro" : "☀️ Claro";
        localStorage.setItem("theme", isLight ? "light" : "dark");
    });

    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("theme--light");
        themeToggle.textContent = "🌙 Oscuro";
    }

    const FIELD_TOOLTIPS = {
        start_number: "El folio se imprime con 4 dígitos. Ej: si pones 500, sería 0500, 0501, 0502…",
        start_page:   "Útil si tu documento tiene portada o índice que no quieres foliar.",
        end_page:     "Si tu expediente tiene anexos al final que no deben llevar folio.",
        font_size:    "14pt es el valor por defecto. Reduce si el folio tapa contenido por márgenes pequeños.",
        offset:       "1.0cm es suficiente para la mayoría de documentos. Aumenta si el folio queda muy pegado al borde.",
        corner:       "Posición donde se estampará el folio. Algunas licitaciones especifican la esquina exacta en la convocatoria.",
        orientation:  "Usa Vertical solo si el expediente se encuaderna por el lado izquierdo y el folio debe leerse girando el documento.",
    };

    let activePopover = null;

    document.querySelectorAll(".field__info").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            // Si ya hay uno abierto del mismo botón, cerrarlo
            if (activePopover && activePopover._source === btn) {
                activePopover.remove();
                activePopover = null;
                return;
            }

            // Cerrar cualquier popover abierto
            if (activePopover) {
                activePopover.remove();
                activePopover = null;
            }

            const key  = btn.dataset.hint;
            const text = FIELD_TOOLTIPS[key];
            if (!text) return;

            const popover = document.createElement("div");
            popover.className = "field__popover";
            popover.textContent = text;
            popover._source = btn;

            btn.closest(".field").appendChild(popover);
            activePopover = popover;
        });
    });

    document.addEventListener("click", () => {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
        }
    });

    // ONBOARDING
    const ONBOARDING_TIPS = [
        "Arrastra varios PDFs a la vez y reordénalos antes de foliar.",
        "La vista previa muestra la posición exacta del folio antes de procesar.",
        "El historial registra cada operación con fecha, duración e IP.",
        "Exporta el historial a Excel o CSV con los filtros aplicados.",
        "Puedes foliar hasta 2 GB por archivo en red local.",
        "Usa folios consecutivos para expedientes divididos en varios PDFs.",
        "El folio se imprime con 4 dígitos: ej. 1 es 0001.",
        "Cambia la esquina según lo indique la convocatoria.",
        "Modo oscuro/claro disponible en el encabezado.",
    ];

    const onboardingModal  = document.getElementById("onboarding-modal");
    const onboardingTip    = document.getElementById("onboarding-tip");
    const onboardingSkip   = document.getElementById("onboarding-skip");
    const onboardingOk     = document.getElementById("onboarding-ok");

    if (!localStorage.getItem("onboarding-seen")) {
        onboardingTip.innerHTML = ONBOARDING_TIPS.map(tip => `<li>${tip}</li>`).join("");
        onboardingModal.hidden = false;
    }

    onboardingOk.addEventListener("click", () => {
        onboardingModal.hidden = true;
    });

    onboardingSkip.addEventListener("click", () => {
        localStorage.setItem("onboarding-seen", "1");
        onboardingModal.hidden = true;
    });

    updateSubmitState();
    updateFolioDisplay();
    loadConfig();
});