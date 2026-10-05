import {
    initializeEditors,
    addEditor,
    removeEditor,
    switchEditor,
    getEditorContent
} from "./editor.js";


// ============================================================
// DOM REFERENCES
// ============================================================

const preview =
    document.getElementById("preview");

const status =
    document.getElementById("status");

const previewStatus =
    document.getElementById("previewStatus");

const resetBtn =
    document.getElementById("resetBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const newFileBtn =
    document.getElementById("newFileBtn");

const renameFileBtn =
    document.getElementById("renameFileBtn");

const deleteFileBtn =
    document.getElementById("deleteFileBtn");

const fileTree =
    document.getElementById("fileTree");

const consoleOutput =
    document.getElementById("consoleOutput");

const consoleCount =
    document.getElementById("consoleCount");

const clearConsoleBtn =
    document.getElementById("clearConsoleBtn");


// Assets

const assetTree =
    document.getElementById("assetTree");

const uploadAssetBtn =
    document.getElementById("uploadAssetBtn");

const assetInput =
    document.getElementById("assetInput");


// Modal

const modalOverlay =
    document.getElementById("modalOverlay");

const modal =
    document.getElementById("modal");

const modalTitle =
    document.getElementById("modalTitle");

const modalMessage =
    document.getElementById("modalMessage");

const modalIcon =
    document.getElementById("modalIcon");

const modalInput =
    document.getElementById("modalInput");

const modalCloseBtn =
    document.getElementById("modalCloseBtn");

const modalCancelBtn =
    document.getElementById("modalCancelBtn");

const modalConfirmBtn =
    document.getElementById("modalConfirmBtn");


// ============================================================
// CUSTOM MODAL SYSTEM
// ============================================================

let modalResolver = null;
let modalType = "alert";
let modalPreviousFocus = null;


function finishModal(result) {

    if (!modalResolver) {
        return;
    }

    const resolver = modalResolver;

    modalResolver = null;

    modalOverlay.classList.remove("open");
    modalOverlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    modalInput.value = "";

    if (modalPreviousFocus) {

        try {
            modalPreviousFocus.focus();
        } catch { }

    }

    modalPreviousFocus = null;

    resolver(result);
}


function closeModal() {

    if (modalType === "alert") {
        finishModal(true);
        return;
    }

    if (modalType === "confirm") {
        finishModal(false);
        return;
    }

    finishModal(null);
}


function showModal({
    type = "alert",
    title = "Buildzen",
    message = "",
    confirmText = "OK",
    cancelText = "Cancel",
    inputValue = "",
    danger = false
} = {}) {

    if (modalResolver) {
        return Promise.reject(
            new Error("A modal is already open.")
        );
    }

    modalType = type;

    modalPreviousFocus =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

    modalTitle.textContent = title;

    modalMessage.textContent = message;

    modalIcon.className =
        `modal-icon ${danger ? "danger" : "info"}`;

    if (type === "alert") {
        modalIcon.textContent = "i";
    } else if (danger) {
        modalIcon.textContent = "!";
    } else {
        modalIcon.textContent = "?";
    }

    modalConfirmBtn.textContent =
        confirmText;

    modalCancelBtn.textContent =
        cancelText;

    modalInput.value =
        inputValue;

    const isPrompt =
        type === "prompt";

    modalInput.hidden = !isPrompt;

    modalCancelBtn.hidden =
        type === "alert";

    modalConfirmBtn.hidden = false;

    modalConfirmBtn.classList.toggle(
        "danger",
        danger
    );

    modalOverlay.classList.add("open");
    modalOverlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    return new Promise(resolve => {

        modalResolver = resolve;

        requestAnimationFrame(() => {

            if (isPrompt) {
                modalInput.focus();
                modalInput.select();
            } else {
                modalConfirmBtn.focus();
            }

        });

    });
}


function bzAlert(
    message,
    title = "Buildzen",
    options = {}
) {

    return showModal({
        type: "alert",
        title,
        message,
        confirmText:
            options.confirmText || "OK",
        danger:
            Boolean(options.danger)
    });

}


function bzConfirm(
    message,
    title = "Buildzen",
    options = {}
) {

    return showModal({
        type: "confirm",
        title,
        message,
        confirmText:
            options.confirmText || "OK",
        cancelText:
            options.cancelText || "Cancel",
        danger:
            Boolean(options.danger)
    });

}


function bzPrompt(
    message,
    title = "Buildzen",
    defaultValue = "",
    options = {}
) {

    return showModal({
        type: "prompt",
        title,
        message,
        inputValue: defaultValue,
        confirmText:
            options.confirmText || "OK",
        cancelText:
            options.cancelText || "Cancel",
        danger:
            Boolean(options.danger)
    });

}


modalConfirmBtn.addEventListener(
    "click",
    () => {

        if (modalType === "prompt") {

            finishModal(
                modalInput.value
            );

            return;
        }

        finishModal(true);

    }
);


modalCancelBtn.addEventListener(
    "click",
    () => {
        finishModal(false);
    }
);


modalCloseBtn.addEventListener(
    "click",
    closeModal
);


modalOverlay.addEventListener(
    "click",
    event => {

        if (event.target === modalOverlay) {
            closeModal();
        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            !modalResolver ||
            !modalOverlay.classList.contains("open")
        ) {
            return;
        }

        if (event.key === "Escape") {

            event.preventDefault();

            closeModal();

            return;
        }

        if (
            event.key === "Enter" &&
            modalType === "prompt" &&
            document.activeElement === modalInput
        ) {

            event.preventDefault();

            finishModal(
                modalInput.value
            );

        }

    }
);


// ============================================================
// PROJECT STORAGE
// ============================================================

const STORAGE_KEY =
    "buildzen-project";

const REQUIRED_FILES = [
    "index.html",
    "style.css",
    "script.js"
];


const starterFiles = [

    {
        id: "index.html",
        name: "index.html",

        content:
            `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Buildzen Project</title>
</head>

<body>

    <h1>Hello, Buildzen!</h1>

    <p>
        Start building your website here.
    </p>

</body>

</html>`
    },

    {
        id: "style.css",
        name: "style.css",

        content:
            `* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: Arial, sans-serif;
}`
    },

    {
        id: "script.js",
        name: "script.js",

        content:
            `console.log("Buildzen project loaded.");`
    }

];


let project = {

    files: cloneStarterFiles(),

    activeFile: "index.html"

};


function cloneStarterFiles() {

    return starterFiles.map(file => ({
        ...file
    }));

}


function syncGlobalFiles() {

    window.buildzenFiles =
        project.files;

}


function saveProject() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(project)
        );

    } catch (error) {

        console.error(
            "Failed to save project:",
            error
        );

    }

}


function loadProject() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {
            return;
        }

        const parsed =
            JSON.parse(saved);

        if (
            !parsed ||
            !Array.isArray(parsed.files)
        ) {
            return;
        }

        project.files =
            parsed.files
                .filter(file =>
                    file &&
                    typeof file.name === "string" &&
                    typeof file.content === "string"
                )
                .map(file => ({
                    id:
                        typeof file.id === "string"
                            ? file.id
                            : file.name,

                    name: file.name,

                    content: file.content
                }));

        if (!project.files.length) {

            project.files =
                cloneStarterFiles();

        }

        project.activeFile =
            typeof parsed.activeFile === "string"
                ? parsed.activeFile
                : project.files[0].id;


        // Migrate older projects that may be
        // missing one of the core files.

        for (const required of REQUIRED_FILES) {

            const exists =
                project.files.some(
                    file =>
                        file.name === required
                );

            if (!exists) {

                const starter =
                    starterFiles.find(
                        file =>
                            file.name === required
                    );

                if (starter) {

                    project.files.push({
                        ...starter
                    });

                }

            }

        }

        if (
            !project.files.some(
                file =>
                    file.id === project.activeFile
            )
        ) {

            project.activeFile =
                project.files[0].id;

        }

    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );

        project = {

            files:
                cloneStarterFiles(),

            activeFile:
                "index.html"

        };

    }

}


function getActiveFile() {

    return project.files.find(
        file =>
            file.id === project.activeFile
    );

}


function fileExists(name) {

    return project.files.some(
        file =>
            file.name.toLowerCase() ===
            name.toLowerCase()
    );

}


function isValidFilename(name) {

    if (!name) {
        return false;
    }

    if (name.length > 255) {
        return false;
    }

    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(name)
    ) {
        return false;
    }

    if (
        name === "." ||
        name === ".."
    ) {
        return false;
    }

    return true;

}


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

    <title>${filename}</title>
</head>

<body>

</body>

</html>`;

    }


    if (extension === "css") {

        return `/* ${filename} */

`;

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return `// ${filename}

`;

    }


    return "";

}


// ============================================================
// FILE TREE
// ============================================================

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

    return "FILE";

}


function renderFileTree() {

    fileTree.innerHTML = "";


    for (const file of project.files) {

        const item =
            document.createElement("button");

        item.type = "button";

        item.className =
            "file-item";

        item.classList.toggle(
            "active",
            file.id === project.activeFile
        );


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
        project.files.find(
            item =>
                item.id === fileId
        );

    if (!file) {
        return;
    }

    project.activeFile =
        fileId;

    syncGlobalFiles();

    renderFileTree();

    switchEditor(fileId);

    saveProject();

}


// ============================================================
// FILE MANAGER
// ============================================================

async function createFile() {

    const filename =
        await bzPrompt(
            "Enter the name of the new file.",
            "New File",
            "untitled.html"
        );


    if (filename === null) {
        return;
    }


    const name =
        filename.trim();


    if (!isValidFilename(name)) {

        await bzAlert(
            "That filename is not valid.",
            "Invalid Filename"
        );

        return;
    }


    if (fileExists(name)) {

        await bzAlert(
            "A file with that name already exists.",
            "File Already Exists"
        );

        return;
    }


    const file = {

        id:
            crypto.randomUUID(),

        name,

        content:
            getDefaultContent(name)

    };


    project.files.push(file);

    syncGlobalFiles();

    addEditor(file);

    project.activeFile =
        file.id;

    renderFileTree();

    switchEditor(file.id);

    saveProject();

    updatePreview();

}


async function renameFile() {

    const file =
        getActiveFile();

    if (!file) {
        return;
    }


    const newName =
        await bzPrompt(
            "Enter the new filename.",
            "Rename File",
            file.name
        );


    if (newName === null) {
        return;
    }


    const name =
        newName.trim();


    if (!isValidFilename(name)) {

        await bzAlert(
            "That filename is not valid.",
            "Invalid Filename"
        );

        return;
    }


    if (
        name.toLowerCase() !==
        file.name.toLowerCase() &&
        fileExists(name)
    ) {

        await bzAlert(
            "A file with that name already exists.",
            "File Already Exists"
        );

        return;
    }


    file.name = name;

    syncGlobalFiles();

    renderFileTree();

    switchEditor(file.id);

    saveProject();

    updatePreview();

}


async function deleteFile() {

    const file =
        getActiveFile();

    if (!file) {
        return;
    }


    if (
        REQUIRED_FILES.includes(
            file.name
        )
    ) {

        await bzAlert(
            `${file.name} is a required Buildzen file and cannot be deleted.`,
            "Cannot Delete File"
        );

        return;
    }


    const confirmed =
        await bzConfirm(
            `Delete "${file.name}"? This cannot be undone.`,
            "Delete File",
            {
                confirmText: "Delete",
                cancelText: "Cancel",
                danger: true
            }
        );


    if (!confirmed) {
        return;
    }


    const index =
        project.files.findIndex(
            item =>
                item.id === file.id
        );


    if (index === -1) {
        return;
    }


    removeEditor(file.id);

    project.files.splice(
        index,
        1
    );


    const nextFile =
        project.files[
        Math.max(
            0,
            index - 1
        )
        ];


    if (nextFile) {

        project.activeFile =
            nextFile.id;

    }


    syncGlobalFiles();

    renderFileTree();

    if (nextFile) {

        switchEditor(
            nextFile.id
        );

    }

    saveProject();

    updatePreview();

}


// ============================================================
// PREVIEW
// ============================================================

function setStatus(text) {

    status.lastChild.textContent =
        ` ${text}`;

}


function collectPreviewCode() {

    const htmlFile =
        project.files.find(
            file =>
                file.name ===
                "index.html"
        );


    if (!htmlFile) {

        return {
            html: "",
            css: "",
            js: ""
        };

    }


    let html =
        getEditorContent(
            htmlFile.id
        );


    let css = "";

    let js = "";


    for (const file of project.files) {

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (extension === "css") {

            css +=
                `\n/* ${file.name} */\n` +
                getEditorContent(file.id) +
                "\n";

        }


        if (
            extension === "js" ||
            extension === "mjs"
        ) {

            js +=
                `\n// ${file.name}\n` +
                getEditorContent(file.id) +
                "\n";

        }

    }


    return {
        html,
        css,
        js
    };

}


function createPreviewBridge() {

    return `<script>
(function () {

    function send(type, args) {

        try {

            parent.postMessage({
                source: "buildzen-preview",
                type: type,
                args: args
            }, "*");

        } catch {}

    }


    const originalLog =
        console.log.bind(console);

    const originalInfo =
        console.info.bind(console);

    const originalWarn =
        console.warn.bind(console);

    const originalError =
        console.error.bind(console);


    console.log = function () {

        const args =
            Array.from(arguments);

        send("log", args);

        originalLog.apply(
            console,
            arguments
        );

    };


    console.info = function () {

        const args =
            Array.from(arguments);

        send("info", args);

        originalInfo.apply(
            console,
            arguments
        );

    };


    console.warn = function () {

        const args =
            Array.from(arguments);

        send("warn", args);

        originalWarn.apply(
            console,
            arguments
        );

    };


    console.error = function () {

        const args =
            Array.from(arguments);

        send("error", args);

        originalError.apply(
            console,
            arguments
        );

    };


    window.addEventListener(
        "error",
        function (event) {

            send("error", [
                event.message ||
                "Unknown error"
            ]);

        }
    );


    window.addEventListener(
        "unhandledrejection",
        function (event) {

            send("error", [
                String(
                    event.reason
                )
            ]);

        }
    );

})();
</script>`;

}


function updatePreview() {

    const {
        html,
        css,
        js
    } = collectPreviewCode();


    setStatus("Building...");

    previewStatus.textContent =
        "Building";


    const bridge =
        createPreviewBridge();


    const style =
        `<style>
${css}
</style>`;


    const script =
        `<script>
${js}
<\/script>`;


    let finalHTML =
        html;


    if (
        /<\/head>/i.test(
            finalHTML
        )
    ) {

        finalHTML =
            finalHTML.replace(
                /<\/head>/i,
                `${bridge}\n${style}\n</head>`
            );

    } else {

        finalHTML =
            `${bridge}\n${style}\n${finalHTML}`;

    }


    if (
        /<\/body>/i.test(
            finalHTML
        )
    ) {

        finalHTML =
            finalHTML.replace(
                /<\/body>/i,
                `${script}\n</body>`
            );

    } else {

        finalHTML +=
            script;

    }


    preview.onload = () => {

        setStatus("Live");

        previewStatus.textContent =
            "Live";

    };


    preview.srcdoc =
        finalHTML;

}


// ============================================================
// CONSOLE
// ============================================================

let consoleEntries = [];

let activeConsoleFilter =
    "all";


function stringifyConsoleValue(value) {

    if (
        value === null
    ) {
        return "null";
    }


    if (
        value === undefined
    ) {
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
    args
) {

    consoleEntries.push({

        type,

        args:
            args.map(
                stringifyConsoleValue
            ),

        time:
            new Date()

    });


    renderConsole();

}


function renderConsole() {

    consoleOutput.innerHTML = "";


    const filtered =
        activeConsoleFilter === "all"
            ? consoleEntries
            : consoleEntries.filter(
                entry =>
                    entry.type ===
                    activeConsoleFilter
            );


    consoleCount.textContent =
        `(${consoleEntries.length})`;


    for (const entry of filtered) {

        const row =
            document.createElement("div");

        row.className =
            `console-entry ${entry.type}`;


        const time =
            document.createElement("span");

        time.className =
            "console-time";

        time.textContent =
            entry.time.toLocaleTimeString();


        const type =
            document.createElement("span");

        type.className =
            "console-type";

        type.textContent =
            entry.type.toUpperCase();


        const message =
            document.createElement("pre");

        message.className =
            "console-message";

        message.textContent =
            entry.args.join(" ");


        row.append(
            time,
            type,
            message
        );


        consoleOutput.appendChild(
            row
        );

    }


    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;

}


window.addEventListener(
    "message",
    event => {

        const data =
            event.data;


        if (
            !data ||
            data.source !==
            "buildzen-preview"
        ) {
            return;
        }


        addConsoleEntry(
            data.type || "log",
            Array.isArray(data.args)
                ? data.args
                : [data.args]
        );

    }
);


// ============================================================
// ASSETS — INDEXEDDB
// ============================================================

const ASSET_DB_NAME =
    "buildzen-assets";

const ASSET_DB_VERSION =
    1;

const ASSET_STORE =
    "assets";


function openAssetDatabase() {

    return new Promise(
        (resolve, reject) => {

            const request =
                indexedDB.open(
                    ASSET_DB_NAME,
                    ASSET_DB_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames
                            .contains(
                                ASSET_STORE
                            )
                    ) {

                        db.createObjectStore(
                            ASSET_STORE,
                            {
                                keyPath: "id"
                            }
                        );

                    }

                };


            request.onsuccess = () => {

                resolve(
                    request.result
                );

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}


async function saveAsset(file) {

    const db =
        await openAssetDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    ASSET_STORE,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    ASSET_STORE
                );


            const asset = {

                id:
                    crypto.randomUUID(),

                name:
                    file.name,

                type:
                    file.type ||
                    "application/octet-stream",

                size:
                    file.size,

                lastModified:
                    file.lastModified,

                file

            };


            const request =
                store.add(asset);


            request.onsuccess = () => {

                resolve(asset);

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}


async function getAllAssets() {

    const db =
        await openAssetDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    ASSET_STORE,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    ASSET_STORE
                );


            const request =
                store.getAll();


            request.onsuccess = () => {

                resolve(
                    request.result
                );

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}

function getAssetIcon(asset) {

    const type = asset.type || "";

    if (type.startsWith("image/")) {
        return "IMG";
    }

    if (type.startsWith("video/")) {
        return "VID";
    }

    if (type.startsWith("audio/")) {
        return "AUD";
    }

    if (type.includes("font")) {
        return "FONT";
    }

    if (type.includes("pdf")) {
        return "PDF";
    }

    return "FILE";
}


uploadAssetBtn.addEventListener(
    "click",
    () => {

        assetInput.click();

    }
);


assetInput.addEventListener(
    "change",
    async () => {

        const files =
            Array.from(
                assetInput.files || []
            );


        if (!files.length) {
            return;
        }


        try {

            for (const file of files) {

                await saveAsset(file);

            }

            await renderAssets();

            console.log(
                `Uploaded ${files.length} asset${files.length === 1
                    ? ""
                    : "s"
                }.`
            );

        } catch (error) {

            console.error(
                "Failed to save asset:",
                error
            );

        }


        assetInput.value = "";

    }
);


// ============================================================
// EVENT HANDLERS
// ============================================================

newFileBtn.addEventListener(
    "click",
    createFile
);


renameFileBtn.addEventListener(
    "click",
    renameFile
);


deleteFileBtn.addEventListener(
    "click",
    deleteFile
);


refreshBtn.addEventListener(
    "click",
    updatePreview
);


clearConsoleBtn.addEventListener(
    "click",
    () => {

        consoleEntries = [];

        renderConsole();

    }
);


document
    .querySelectorAll(".console-filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".console-filter"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                button.classList.add(
                    "active"
                );


                activeConsoleFilter =
                    button.dataset.filter;


                renderConsole();

            }
        );

    });


resetBtn.addEventListener(
    "click",
    async () => {

        const confirmed =
            await bzConfirm(
                "Reset the project to the default Buildzen files? All current source code will be replaced.",
                "Reset Project",
                {
                    confirmText: "Reset",
                    cancelText: "Cancel",
                    danger: true
                }
            );


        if (!confirmed) {
            return;
        }


        project = {

            files:
                cloneStarterFiles(),

            activeFile:
                "index.html"

        };


        syncGlobalFiles();

        initializeEditors(
            project.files
        );

        renderFileTree();

        switchEditor(
            project.activeFile
        );

        saveProject();

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-edit",
    event => {

        const {
            fileId,
            content
        } =
            event.detail || {};


        const file =
            project.files.find(
                item =>
                    item.id === fileId
            );


        if (!file) {
            return;
        }


        file.content =
            content;


        saveProject();

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-save",
    () => {

        const file =
            getActiveFile();


        if (!file) {
            return;
        }


        file.content =
            getEditorContent(
                file.id
            );


        saveProject();

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-refresh",
    updatePreview
);


// ============================================================
// STARTUP
// ============================================================

loadProject();

syncGlobalFiles();

initializeEditors(
    project.files
);

renderFileTree();


if (
    project.files.some(
        file =>
            file.id ===
            project.activeFile
    )
) {

    switchEditor(
        project.activeFile
    );

}


updatePreview();


// Load stored assets so the asset
// database is initialized now.

renderAssets()
    .catch(error => {

        console.error(
            "Failed to load assets:",
            error
        );

    });

async function renderAssets() {

    const assets =
        await getAllAssets();

    assetTree.innerHTML = "";

    if (!assets.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-assets";

        empty.textContent =
            "No assets yet";

        assetTree.appendChild(empty);

        return;
    }

    assets.sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const asset of assets) {

        const item =
            document.createElement("div");

        item.className =
            "asset-item";


        const icon =
            document.createElement("span");

        icon.className =
            "asset-icon";

        icon.textContent =
            getAssetIcon(asset);


        const name =
            document.createElement("span");

        name.className =
            "asset-name";

        name.textContent =
            asset.name;

        name.title =
            asset.name;


        item.append(
            icon,
            name
        );

        assetTree.appendChild(item);

    }

}