import {
    initializeEditors,
    addEditor,
    removeEditor,
    switchEditor,
    getEditorContent,
    setEditorContent
} from "./editor.js";

import { renderAssets } from "./assets.js";

import {
    createPreviewController
} from "./preview.js";


const loadingScreen =
    document.getElementById("loadingScreen");

const loadingStatus =
    document.getElementById("loadingStatus");


function setLoadingStatus(text) {

    if (loadingStatus) {
        loadingStatus.textContent = text;
    }

}


function finishLoading() {

    if (!loadingScreen) {
        return;
    }

    loadingScreen.classList.add("hidden");

    setTimeout(() => {
        loadingScreen.remove();
    }, 400);

}


/* =========================================================
   DOM
   ========================================================= */

const preview =
    document.getElementById("preview");

const previewViewport =
    document.getElementById("previewViewport");

const previewDeviceButtons =
    document.querySelectorAll(".device-mode-btn");

const previewReloadBtn =
    document.getElementById("previewReloadBtn");

const previewOpenBtn =
    document.getElementById("previewOpenBtn");

const previewFullscreenBtn =
    document.getElementById("previewFullscreenBtn");

const status =
    document.getElementById("status");

const refreshBtn =
    document.getElementById("refreshBtn");

const resetBtn =
    document.getElementById("resetBtn");

const fileTree =
    document.getElementById("fileTree");

const newFileBtn =
    document.getElementById("newFileBtn");

const renameFileBtn =
    document.getElementById("renameFileBtn");

const deleteFileBtn =
    document.getElementById("deleteFileBtn");

const previewStatus =
    document.getElementById("previewStatus");

const docsBtn =
    document.getElementById("docsBtn");

const saveStatus =
    document.getElementById("saveStatus");

const consoleOutput =
    document.getElementById("consoleOutput");

const consoleCount =
    document.getElementById("consoleCount");

const clearConsoleBtn =
    document.getElementById("clearConsoleBtn");

const consoleFilters =
    document.querySelectorAll(".console-filter");


/* =========================================================
   MODAL DOM
   ========================================================= */

const modalOverlay =
    document.getElementById("modalOverlay");

const modal =
    document.getElementById("modal");

const modalTitle =
    document.getElementById("modalTitle");

const modalIcon =
    document.getElementById("modalIcon");

const modalMessage =
    document.getElementById("modalMessage");

const modalInput =
    document.getElementById("modalInput");

const modalCancelBtn =
    document.getElementById("modalCancelBtn");

const modalConfirmBtn =
    document.getElementById("modalConfirmBtn");

const modalCloseBtn =
    document.getElementById("modalCloseBtn");


/* =========================================================
   PROJECT STATE
   ========================================================= */

const PROJECT_STORAGE_KEY =
    "buildzen-project";

let buildzenFiles = [];

let activeFileId = null;

window.buildzenFiles =
    buildzenFiles;


/* =========================================================
   MODAL SYSTEM
   ========================================================= */

let modalResolver = null;


function closeModal(value = null) {

    modalOverlay.classList.remove("open");

    modalOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    if (modalResolver) {

        const resolve =
            modalResolver;

        modalResolver = null;

        resolve(value);

    }

}


function showModal({
    title = "Buildzen",
    message = "",
    type = "info",
    input = false,
    defaultValue = "",
    confirmText = "OK",
    cancelText = "Cancel"
} = {}) {

    return new Promise(resolve => {

        modalResolver = resolve;

        modalTitle.textContent =
            title;

        modalMessage.textContent =
            message;

        modalIcon.className =
            `modal-icon ${type}`;

        if (type === "danger") {

            modalIcon.textContent = "!";

        } else if (type === "warning") {

            modalIcon.textContent = "!";

        } else if (type === "success") {

            modalIcon.textContent = "✓";

        } else {

            modalIcon.textContent = "i";

        }

        modalInput.style.display =
            input ? "block" : "none";

        modalInput.value =
            defaultValue;

        modalConfirmBtn.textContent =
            confirmText;

        modalCancelBtn.textContent =
            cancelText;

        modalCancelBtn.style.display =
            "block";

        modalOverlay.classList.add("open");

        modalOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        if (input) {

            setTimeout(() => {

                modalInput.focus();
                modalInput.select();

            }, 0);

        } else {

            setTimeout(() => {

                modalConfirmBtn.focus();

            }, 0);

        }

    });

}


function bzAlert(
    message,
    title = "Buildzen",
    type = "info"
) {

    return showModal({
        title,
        message,
        type,
        confirmText: "OK",
        cancelText: "Close"
    }).then(() => { });

}


function bzConfirm(
    message,
    title = "Confirm",
    type = "warning"
) {

    return showModal({
        title,
        message,
        type,
        confirmText: "Confirm",
        cancelText: "Cancel"
    });

}


function bzPrompt(
    message,
    defaultValue = "",
    title = "Buildzen"
) {

    return showModal({
        title,
        message,
        type: "info",
        input: true,
        defaultValue,
        confirmText: "OK",
        cancelText: "Cancel"
    });

}


/*
 * assets.js uses these functions when
 * deleting assets.
 */

window.bzConfirm =
    bzConfirm;

window.bzAlert =
    bzAlert;

window.bzPrompt =
    bzPrompt;


modalConfirmBtn.addEventListener(
    "click",
    () => {

        if (!modalResolver) {
            return;
        }

        const inputVisible =
            modalInput.style.display !== "none";

        closeModal(
            inputVisible
                ? modalInput.value
                : true
        );

    }
);


modalCancelBtn.addEventListener(
    "click",
    () => {

        closeModal(null);

    }
);


modalCloseBtn.addEventListener(
    "click",
    () => {

        closeModal(null);

    }
);


modalOverlay.addEventListener(
    "click",
    event => {

        if (event.target === modalOverlay) {
            closeModal(null);
        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            !modalOverlay.classList.contains("open")
        ) {
            return;
        }

        if (event.key === "Escape") {

            event.preventDefault();

            closeModal(null);

        }

        if (
            event.key === "Enter" &&
            document.activeElement !== modalInput
        ) {

            event.preventDefault();

            closeModal(true);

        }

    }
);


/* =========================================================
   DEFAULT FILE CONTENT
   ========================================================= */

function getDefaultContent(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension === "html" ||
        extension === "htm"
    ) {

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buildzen Project</title>
</head>
<body>
    <h1>Hello, Buildzen!</h1>
</body>
</html>`;

    }


    if (extension === "css") {

        return `body {
    font-family: sans-serif;
}`;

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return `console.log("Hello from Buildzen!");`;

    }


    return "";

}


/* =========================================================
   DEFAULT PROJECT
   ========================================================= */

function createDefaultProject() {

    return {

        files: [

            {
                id: "index.html",

                name: "index.html",

                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buildzen Studio</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello, Buildzen!</h1>
    <script src="script.js"></script>
</body>
</html>`
            },

            {
                id: "style.css",

                name: "style.css",

                content: `body {
    font-family: Arial, sans-serif;
    padding: 40px;
}

h1 {
    color: #4f8cff;
}`
            },

            {
                id: "script.js",

                name: "script.js",

                content: `console.log("Buildzen is running!");`
            }

        ],

        activeFile: "index.html"

    };

}


/* =========================================================
   PROJECT MIGRATION
   ========================================================= */

function normalizeProject(project) {

    if (
        project &&
        Array.isArray(project.files)
    ) {

        return {

            files: project.files.map(file => ({

                id:
                    file.id ||
                    file.name,

                name:
                    file.name ||
                    file.id,

                content:
                    typeof file.content === "string"
                        ? file.content
                        : ""

            })),

            activeFile:
                project.activeFile ||
                project.files[0]?.id ||
                null

        };

    }


    /*
     * Migration from the old:
     *
     * {
     *     html: "...",
     *     css: "...",
     *     js: "..."
     * }
     */

    if (
        project &&
        (
            "html" in project ||
            "css" in project ||
            "js" in project
        )
    ) {

        return {

            files: [

                {
                    id: "index.html",

                    name: "index.html",

                    content:
                        typeof project.html === "string"
                            ? project.html
                            : getDefaultContent(
                                "index.html"
                            )
                },

                {
                    id: "style.css",

                    name: "style.css",

                    content:
                        typeof project.css === "string"
                            ? project.css
                            : getDefaultContent(
                                "style.css"
                            )
                },

                {
                    id: "script.js",

                    name: "script.js",

                    content:
                        typeof project.js === "string"
                            ? project.js
                            : getDefaultContent(
                                "script.js"
                            )
                }

            ],

            activeFile:
                "index.html"

        };

    }


    return createDefaultProject();

}


function loadProject() {

    try {

        const raw =
            localStorage.getItem(
                PROJECT_STORAGE_KEY
            );

        if (!raw) {

            return createDefaultProject();

        }

        return normalizeProject(
            JSON.parse(raw)
        );

    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );

        return createDefaultProject();

    }

}


function saveProject() {

    try {

        localStorage.setItem(
            PROJECT_STORAGE_KEY,

            JSON.stringify({

                files:
                    buildzenFiles,

                activeFile:
                    activeFileId

            })
        );

    } catch (error) {

        console.error(
            "Failed to save project:",
            error
        );

    }

}


/* =========================================================
   FILE HELPERS
   ========================================================= */

function getFile(fileId) {

    return buildzenFiles.find(
        file =>
            file.id === fileId
    );

}


function getFileByName(name) {

    return buildzenFiles.find(
        file =>
            file.name.toLowerCase() ===
            name.toLowerCase()
    );

}


function generateFileId(name) {

    let id = name;

    let counter = 2;

    while (getFile(id)) {

        const dot =
            name.lastIndexOf(".");

        if (dot === -1) {

            id =
                `${name}-${counter}`;

        } else {

            id =
                `${name.slice(0, dot)}-${counter}` +
                `${name.slice(dot)}`;

        }

        counter++;

    }

    return id;

}


function getFileIcon(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension === "html" ||
        extension === "htm"
    ) {

        return "HTML";

    }


    if (extension === "css") {

        return "CSS";

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return "JS";

    }


    if (extension === "json") {

        return "JSON";

    }


    if (
        extension === "png" ||
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "gif" ||
        extension === "svg" ||
        extension === "webp"
    ) {

        return "IMG";

    }


    return "FILE";

}


/* =========================================================
   FILE TREE
   ========================================================= */

function renderFileTree() {

    fileTree.innerHTML = "";

    for (const file of buildzenFiles) {

        const item =
            document.createElement("div");

        item.className =
            "file-item";


        if (file.id === activeFileId) {

            item.classList.add("active");

        }


        const icon =
            document.createElement("span");

        icon.className =
            "file-icon";

        icon.textContent =
            getFileIcon(file.name);


        const name =
            document.createElement("span");

        name.className =
            "file-name";

        name.textContent =
            file.name;

        name.title =
            file.name;


        item.append(
            icon,
            name
        );


        item.addEventListener(
            "click",
            () => {

                openFile(file.id);

            }
        );


        fileTree.appendChild(item);

    }

}


function openFile(fileId) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }

    activeFileId =
        fileId;

    switchEditor(fileId);

    renderFileTree();

    saveProject();

}


function updateFileContent(
    fileId,
    content
) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }

    file.content =
        content;

    updatePreview();

}


function formatDocument(name, content) {

    const extension =
        name.split(".").pop().toLowerCase();

    const source =
        typeof content === "string"
            ? content
            : "";

    if (extension === "html") {

        const lines =
            source
                .replace(/>\s*</g, ">\n<")
                .split(/\n/);

        let indentLevel = 0;
        const formatted = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                continue;
            }

            const isClosingTag =
                /^<\//.test(trimmed);

            const isSelfClosing =
                /\/>$/.test(trimmed) ||
                /<\w+[^>]*\/>$/.test(trimmed);

            if (isClosingTag) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                !isClosingTag &&
                !isSelfClosing &&
                !trimmed.startsWith("<!--") &&
                !trimmed.endsWith("/>") &&
                !trimmed.endsWith("-->")
            ) {
                const openingTags =
                    (trimmed.match(/<\w+\b/g) || []).length;
                const closingTags =
                    (trimmed.match(/<\/\w+/g) || []).length;

                if (openingTags > closingTags) {
                    indentLevel += 1;
                }
            }
        }

        return formatted.join("\n");
    }


    if (extension === "css") {

        const lines =
            source.split(/\n/);

        let indentLevel = 0;
        const formatted = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                continue;
            }

            const closing =
                trimmed.startsWith("}");

            if (closing) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                trimmed.includes("{") &&
                !trimmed.endsWith("}")
            ) {
                indentLevel += 1;
            }
        }

        return formatted.join("\n");
    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        const lines =
            source
                .split(/\n/)
                .map(line => line.trimEnd());

        let indentLevel = 0;
        const formatted = [];

        for (const rawLine of lines) {
            const trimmed = rawLine.trim();

            if (!trimmed) {
                continue;
            }

            const isClosing =
                /^(\}|\)|\])$/.test(trimmed);

            if (isClosing) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                /[\{(\[]$/.test(trimmed) &&
                !trimmed.endsWith("};") &&
                !trimmed.endsWith("})") &&
                !trimmed.endsWith("])")) {
                indentLevel += 1;
            }
        }

        return formatted.join("\n");
    }

    return source;

}


/* =========================================================
   CREATE FILE
   ========================================================= */

async function createFile() {

    const name =
        await bzPrompt(
            "Enter the new file name:",
            "",
            "New File"
        );


    if (
        name === null ||
        name === undefined ||
        typeof name !== "string"
    ) {
        return;
    }


    const trimmed =
        name.trim();


    if (!trimmed) {

        await bzAlert(
            "A file name is required.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            trimmed
        )
    ) {

        await bzAlert(
            "That file name contains invalid characters.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (getFileByName(trimmed)) {

        await bzAlert(
            "A file with that name already exists.",
            "File Exists",
            "warning"
        );

        return;

    }


    const file = {

        id:
            generateFileId(trimmed),

        name:
            trimmed,

        content:
            getDefaultContent(trimmed)

    };


    buildzenFiles.push(file);

    addEditor(file);

    saveProject();

    renderFileTree();

    openFile(file.id);

    updatePreview();

}


/* =========================================================
   RENAME FILE
   ========================================================= */

async function renameCurrentFile() {

    if (!activeFileId) {
        return;
    }


    const file =
        getFile(activeFileId);

    if (!file) {
        return;
    }


    const newName =
        await bzPrompt(
            "Enter the new file name:",
            file.name,
            "Rename File"
        );


    if (
        newName === null ||
        newName === undefined ||
        typeof newName !== "string"
    ) {
        return;
    }


    const trimmed =
        newName.trim();


    if (!trimmed) {

        await bzAlert(
            "A file name is required.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            trimmed
        )
    ) {

        await bzAlert(
            "That file name contains invalid characters.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    const existing =
        getFileByName(trimmed);


    if (
        existing &&
        existing.id !== file.id
    ) {

        await bzAlert(
            "A file with that name already exists.",
            "File Exists",
            "warning"
        );

        return;

    }


    file.name =
        trimmed;

    saveProject();

    renderFileTree();

    switchEditor(file.id);

    updatePreview();

}


/* =========================================================
   DELETE FILE
   ========================================================= */

async function deleteCurrentFile() {

    if (!activeFileId) {
        return;
    }


    const file =
        getFile(activeFileId);

    if (!file) {
        return;
    }


    const protectedFiles = [
        "index.html",
        "style.css",
        "script.js"
    ];


    if (
        protectedFiles.includes(
            file.name.toLowerCase()
        )
    ) {

        await bzAlert(
            `${file.name} is a required project file and cannot be deleted.`,
            "Cannot Delete File",
            "warning"
        );

        return;

    }


    const confirmed =
        await bzConfirm(
            `Delete "${file.name}"? This cannot be undone.`,
            "Delete File",
            "danger"
        );


    if (!confirmed) {
        return;
    }


    const index =
        buildzenFiles.findIndex(
            item =>
                item.id === file.id
        );


    if (index === -1) {
        return;
    }


    removeEditor(file.id);


    buildzenFiles.splice(
        index,
        1
    );


    const nextFile =
        buildzenFiles[index] ||
        buildzenFiles[index - 1] ||
        buildzenFiles[0];


    activeFileId =
        nextFile?.id ||
        null;


    saveProject();

    renderFileTree();


    if (activeFileId) {

        switchEditor(
            activeFileId
        );

    }


    updatePreview();

}


/* =========================================================
   PREVIEW CONTROLLER
   ========================================================= */

const previewController =
    createPreviewController({

        preview,

        status,

        previewStatus,

        getFiles:
            () => buildzenFiles

    });

let activePreviewMode = "desktop";


function setPreviewMode(mode) {

    activePreviewMode = mode;

    if (previewViewport) {
        previewViewport.dataset.mode = mode;
    }

    previewDeviceButtons.forEach((button) => {

        const isActive =
            button.dataset.device === mode;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));

    });

}


previewDeviceButtons.forEach((button) => {

    button.addEventListener("click", () => {
        setPreviewMode(button.dataset.device);
    });

});


if (previewReloadBtn) {
    previewReloadBtn.addEventListener("click", () => {
        previewController.reloadPreview();
    });
}


if (previewOpenBtn) {
    previewOpenBtn.addEventListener("click", () => {
        previewController.openPreviewWindow();
    });
}


if (previewFullscreenBtn) {
    previewFullscreenBtn.addEventListener("click", async () => {

        try {

            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }

            if (previewViewport) {
                await previewViewport.requestFullscreen();
            }

        } catch (error) {
            console.warn("Fullscreen preview is unavailable:", error);
        }

    });
}


setPreviewMode(activePreviewMode);


async function updatePreview() {

    return previewController.updatePreview();

}


/* =========================================================
   CONSOLE
   ========================================================= */

let consoleEntries = [];

let activeConsoleFilter =
    "all";

let dirtyFiles = new Set();
let autoSaveTimer = null;


function setSaveStatus(text, state = "saved") {

    if (!saveStatus) {
        return;
    }

    saveStatus.textContent = text;
    saveStatus.dataset.state = state;

}


function formatConsoleValue(value) {

    if (value === null) {
        return "null";
    }


    if (value === undefined) {
        return "undefined";
    }


    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value,
                null,
                2
            );

        } catch {

            return String(value);

        }

    }


    return String(value);

}


function addConsoleEntry(
    type,
    args,
    location = null
) {

    consoleEntries.push({

        type,

        args,

        location,

        time:
            new Date()

    });


    renderConsole();

}


function renderConsole() {

    consoleOutput.innerHTML =
        "";


    const filtered =
        activeConsoleFilter === "all"
            ? consoleEntries
            : consoleEntries.filter(
                entry =>
                    entry.type ===
                    activeConsoleFilter
            );


    for (
        const entry
        of filtered
    ) {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            `console-entry console-${entry.type}`;

        if (entry.location) {
            row.title =
                `${entry.location.file || "Unknown file"}${entry.location.line ? `:${entry.location.line}` : ""}`;
            row.style.cursor = "pointer";
            row.addEventListener("click", () => {
                if (!entry.location.file) {
                    return;
                }

                const file =
                    buildzenFiles.find(
                        candidate =>
                            candidate.name.toLowerCase() ===
                            entry.location.file.toLowerCase()
                    );

                if (!file) {
                    return;
                }

                openFile(file.id);

                const editor =
                    editors[file.id];

                if (!editor) {
                    return;
                }

                const lineNumber =
                    Math.max(1, Number(entry.location.line || 1));

                const line =
                    editor.state.doc.line(lineNumber);

                editor.dispatch({
                    selection: {
                        anchor: line.from,
                        head: line.from
                    }
                });

                editor.focus();
            });
        }


        const time =
            document.createElement(
                "span"
            );

        time.className =
            "console-time";

        time.textContent =
            entry.time.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );


        const message =
            document.createElement(
                "span"
            );

        message.className =
            "console-message";

        message.textContent =
            entry.args
                .map(
                    formatConsoleValue
                )
                .join(" ");


        row.append(
            time,
            message
        );


        consoleOutput.appendChild(
            row
        );

    }


    consoleCount.textContent =
        `(${consoleEntries.length})`;


    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;

}


function scheduleAutoSave(fileId) {

    if (fileId) {
        dirtyFiles.add(fileId);
    }

    setSaveStatus("Saving...", "saving");

    clearTimeout(autoSaveTimer);

    autoSaveTimer =
        setTimeout(() => {

            if (dirtyFiles.size === 0) {
                setSaveStatus("Saved", "saved");
                return;
            }

            dirtyFiles.forEach(id => {
                const file =
                    getFile(id);

                if (!file) {
                    return;
                }

                file.content =
                    getEditorContent(id);
            });

            dirtyFiles.clear();
            saveProject();
            setSaveStatus("Saved", "saved");

        }, 350);

}


function saveCurrentProject() {

    dirtyFiles.forEach(id => {
        const file =
            getFile(id);

        if (!file) {
            return;
        }

        file.content =
            getEditorContent(id);
    });

    dirtyFiles.clear();
    saveProject();
    setSaveStatus("Saved", "saved");

}


window.addEventListener(
    "message",
    event => {

        if (
            !event.data ||
            event.data.source !==
            "buildzen-preview"
        ) {

            return;

        }


        const location =
            event.data.location || null;

        addConsoleEntry(
            event.data.type ||
            "log",

            Array.isArray(
                event.data.args
            )
                ? event.data.args
                : [
                    event.data.args
                ],

            location
        );

    }
);


consoleFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                consoleFilters.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                activeConsoleFilter =
                    button.dataset.filter ||
                    "all";


                renderConsole();

            }
        );

    }
);


clearConsoleBtn.addEventListener(
    "click",
    () => {

        consoleEntries = [];

        renderConsole();

    }
);


/* =========================================================
   EDITOR EVENTS
   ========================================================= */

window.addEventListener(
    "buildzen-edit",
    event => {

        const {
            fileId,
            content
        } = event.detail || {};


        if (!fileId) {
            return;
        }


        updateFileContent(
            fileId,
            content
        );

        scheduleAutoSave(fileId);

    }
);


window.addEventListener(
    "buildzen-refresh",
    () => {

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-save",
    () => {

        if (!activeFileId) {
            return;
        }

        saveCurrentProject();

        console.log(
            `Saved ${activeFileId}.`
        );

    }
);

window.addEventListener(
    "beforeunload",
    event => {
        if (dirtyFiles.size > 0) {
            event.preventDefault();
            event.returnValue = "";
        }
    }
);

window.addEventListener(
    "buildzen-format-document",
    event => {
        const {
            fileId
        } = event.detail || {};

        if (!fileId) {
            return;
        }

        const file =
            getFile(fileId);

        if (!file) {
            return;
        }

        const formatted =
            formatDocument(file.name, file.content);

        if (formatted === file.content) {
            return;
        }

        setEditorContent(fileId, formatted);
        updateFileContent(fileId, formatted);
        scheduleAutoSave(fileId);
    }
);


/* =========================================================
   ASSET EVENTS
   ========================================================= */

window.addEventListener(
    "buildzen-assets-changed",
    () => {

        updatePreview();

    }
);


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

newFileBtn.addEventListener(
    "click",
    createFile
);


renameFileBtn.addEventListener(
    "click",
    renameCurrentFile
);


deleteFileBtn.addEventListener(
    "click",
    deleteCurrentFile
);


refreshBtn.addEventListener(
    "click",
    () => {

        updatePreview();

    }
);


if (docsBtn) {
    docsBtn.addEventListener(
        "click",
        () => {

            window.open(
                "./docs.html",
                "_blank",
                "noopener,noreferrer"
            );

        }
    );
}


/* =========================================================
   RESET
   ========================================================= */

resetBtn.addEventListener(
    "click",
    async () => {

        const confirmed =
            await bzConfirm(
                "Reset the project to the default files? Your current project will be replaced.",
                "Reset Project",
                "danger"
            );


        if (!confirmed) {
            return;
        }


        const project =
            createDefaultProject();


        buildzenFiles =
            project.files;


        window.buildzenFiles =
            buildzenFiles;


        activeFileId =
            project.activeFile;


        saveProject();


        initializeEditors(
            buildzenFiles
        );


        renderFileTree();


        switchEditor(
            activeFileId
        );


        consoleEntries = [];

        renderConsole();


        await updatePreview();


        console.log(
            "Project reset."
        );

    }
);


/* =========================================================
   STARTUP
   ========================================================= */

async function initializeApp() {

    setLoadingStatus(
        "HANDSHAKING..."
    );


    /*
     * Load the saved project.
     */

    const project =
        loadProject();


    setLoadingStatus(
        "TRANSFERRING DATA..."
    );


    buildzenFiles =
        project.files;


    window.buildzenFiles =
        buildzenFiles;


    activeFileId =
        project.activeFile ||
        buildzenFiles[0]?.id ||
        null;


    /*
     * Initialize CodeMirror.
     */

    setLoadingStatus(
        "INITIALIZING EDITOR..."
    );


    initializeEditors(
        buildzenFiles
    );


    renderFileTree();


    if (activeFileId) {

        switchEditor(
            activeFileId
        );

    }


    /*
     * Load IndexedDB assets.
     */

    setLoadingStatus(
        "LOADING ASSETS..."
    );


    try {

        await renderAssets();

    } catch (error) {

        console.error(
            "Failed to load assets:",
            error
        );

    }


    /*
     * Build the initial preview.
     */

    setLoadingStatus(
        "BUILDING PREVIEW..."
    );


    await updatePreview();


    /*
     * Everything is ready.
     */

    setLoadingStatus(
        "READY"
    );


    setTimeout(() => {

        finishLoading();

    }, 250);

}


initializeApp().catch(
    error => {

        console.error(
            "Failed to initialize Buildzen:",
            error
        );


        setLoadingStatus(
            "INITIALIZATION FAILED"
        );

    }
);