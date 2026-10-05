import {
    initializeEditors,
    addEditor,
    removeEditor,
    switchEditor,
    getEditorContent
} from "./editor.js";


/* =========================================================
   DOM REFERENCES
   ========================================================= */

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


/* =========================================================
   MODAL SYSTEM
   ========================================================= */

let modalResolver = null;
let modalType = "alert";
let modalPreviousFocus = null;


function finishModal(result) {

    if (!modalResolver) {
        return;
    }


    const resolver =
        modalResolver;

    modalResolver = null;


    modalOverlay.classList.remove(
        "visible"
    );

    modalOverlay.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow = "";


    const previous =
        modalPreviousFocus;

    modalPreviousFocus = null;


    if (
        previous &&
        typeof previous.focus === "function"
    ) {

        requestAnimationFrame(() => {

            try {
                previous.focus();
            } catch {
                // Focus restoration is best-effort.
            }

        });
    }


    resolver(result);
}


function closeModal() {

    if (!modalResolver) {
        return;
    }


    if (modalType === "alert") {

        finishModal(true);

    } else if (modalType === "confirm") {

        finishModal(false);

    } else {

        finishModal(null);
    }

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

    /*
     * Buildzen dialogs are intentionally serialized.
     * This prevents two UI operations from fighting over
     * the same modal.
     */

    if (modalResolver) {

        return Promise.reject(
            new Error(
                "A Buildzen modal is already open."
            )
        );

    }


    return new Promise(resolve => {

        modalType = type;

        modalResolver = resolve;

        modalPreviousFocus =
            document.activeElement;


        modalTitle.textContent =
            title;

        modalMessage.textContent =
            message;


        modalConfirmBtn.textContent =
            confirmText;

        modalCancelBtn.textContent =
            cancelText;


        /* Icon */

        modalIcon.className =
            "modal-icon";


        if (danger) {

            modalIcon.classList.add(
                "danger"
            );

            modalIcon.textContent =
                "!";

        } else if (type === "confirm") {

            modalIcon.classList.add(
                "warning"
            );

            modalIcon.textContent =
                "?";

        } else if (type === "prompt") {

            modalIcon.classList.add(
                "info"
            );

            modalIcon.textContent =
                "✎";

        } else {

            modalIcon.classList.add(
                "info"
            );

            modalIcon.textContent =
                "i";
        }


        /* Confirm button */

        modalConfirmBtn.classList.toggle(
            "modal-btn-danger",
            danger
        );


        /* Cancel button */

        modalCancelBtn.style.display =
            type === "alert"
                ? "none"
                : "";


        /* Input */

        if (type === "prompt") {

            modalInput.style.display =
                "block";

            modalInput.value =
                inputValue;

        } else {

            modalInput.style.display =
                "none";

            modalInput.value =
                "";
        }


        /* Open */

        modalOverlay.classList.add(
            "visible"
        );

        modalOverlay.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";


        requestAnimationFrame(() => {

            if (type === "prompt") {

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
            options.danger === true

    });
}


function bzConfirm(
    message,
    title = "Confirm",
    options = {}
) {

    return showModal({

        type: "confirm",

        title,

        message,

        confirmText:
            options.confirmText || "Confirm",

        cancelText:
            options.cancelText || "Cancel",

        danger:
            options.danger === true

    });
}


function bzPrompt(
    message,
    title = "Input",
    defaultValue = "",
    options = {}
) {

    return showModal({

        type: "prompt",

        title,

        message,

        confirmText:
            options.confirmText || "OK",

        cancelText:
            options.cancelText || "Cancel",

        inputValue:
            defaultValue,

        danger:
            options.danger === true

    });
}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

modalConfirmBtn.addEventListener(
    "click",
    () => {

        if (modalType === "prompt") {

            finishModal(
                modalInput.value
            );

        } else {

            finishModal(true);
        }

    }
);


modalCancelBtn.addEventListener(
    "click",
    () => {

        if (modalType === "prompt") {

            finishModal(null);

        } else {

            finishModal(false);
        }

    }
);


modalCloseBtn.addEventListener(
    "click",
    closeModal
);


modalOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target !==
            modalOverlay
        ) {
            return;
        }

        closeModal();

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            !modalOverlay.classList.contains(
                "visible"
            )
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
            document.activeElement ===
            modalInput
        ) {

            event.preventDefault();

            finishModal(
                modalInput.value
            );

        }

    }
);


/* =========================================================
   PROJECT DATA
   ========================================================= */

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

        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buildzen Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <main>
        <h1>Hello, Buildzen!</h1>
        <p>Edit the files to start building.</p>
    </main>

    <script src="script.js"></script>
</body>
</html>`
    },

    {
        id: "style.css",

        name: "style.css",

        content: `body {
    margin: 0;
    min-height: 100vh;

    display: flex;
    align-items: center;
    justify-content: center;

    font-family: system-ui, sans-serif;

    background: #111318;
    color: #f1f3f5;
}

main {
    text-align: center;
}

h1 {
    margin-bottom: 8px;
}`
    },

    {
        id: "script.js",

        name: "script.js",

        content: `console.log("Buildzen project loaded.");`
    }

];


let project = {
    files: [],
    activeFile: "index.html"
};


window.buildzenFiles =
    project.files;


/* =========================================================
   PROJECT STORAGE
   ========================================================= */

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
            "Could not save Buildzen project:",
            error
        );

    }

}


function cloneStarterFiles() {

    return starterFiles.map(
        file => ({
            id: file.id,
            name: file.name,
            content: file.content
        })
    );

}


function loadProject() {

    const saved =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (!saved) {

        project = {
            files: cloneStarterFiles(),
            activeFile: "index.html"
        };

        return;
    }


    try {

        const parsed =
            JSON.parse(saved);


        /* Current format */

        if (
            parsed &&
            Array.isArray(parsed.files)
        ) {

            project = {

                files: parsed.files
                    .filter(file =>
                        file &&
                        typeof file.id ===
                        "string" &&
                        typeof file.name ===
                        "string" &&
                        typeof file.content ===
                        "string"
                    ),

                activeFile:
                    typeof parsed.activeFile ===
                        "string"
                        ? parsed.activeFile
                        : "index.html"

            };


            /*
             * Ensure the three required files exist.
             */

            for (
                const required of REQUIRED_FILES
            ) {

                const exists =
                    project.files.some(
                        file =>
                            file.name ===
                            required
                    );


                if (!exists) {

                    const starter =
                        starterFiles.find(
                            file =>
                                file.name ===
                                required
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
                        file.id ===
                        project.activeFile
                )
            ) {

                const index =
                    project.files.find(
                        file =>
                            file.name ===
                            "index.html"
                    );


                project.activeFile =
                    index?.id ||
                    project.files[0]?.id ||
                    "index.html";
            }


            return;
        }


        /* Legacy format */

        if (
            parsed &&
            typeof parsed.html ===
            "string" &&
            typeof parsed.css ===
            "string" &&
            typeof parsed.js ===
            "string"
        ) {

            project = {

                files: [

                    {
                        id: "index.html",
                        name: "index.html",
                        content: parsed.html
                    },

                    {
                        id: "style.css",
                        name: "style.css",
                        content: parsed.css
                    },

                    {
                        id: "script.js",
                        name: "script.js",
                        content: parsed.js
                    }

                ],

                activeFile: "index.html"
            };


            saveProject();

            return;
        }


        throw new Error(
            "Unsupported project format"
        );

    } catch (error) {

        console.warn(
            "Buildzen project could not be loaded. Starting fresh.",
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


/* =========================================================
   FILE HELPERS
   ========================================================= */

function getActiveFile() {

    return project.files.find(
        file =>
            file.id ===
            project.activeFile
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
        name === "." ||
        name === ".."
    ) {
        return false;
    }


    /*
     * Buildzen currently has a flat project tree,
     * so path separators are intentionally forbidden.
     */

    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            name
        )
    ) {
        return false;
    }


    if (
        name.endsWith(".") ||
        name.endsWith(" ")
    ) {
        return false;
    }


    return true;
}


function getDefaultContent(filename) {

    const lower =
        filename.toLowerCase();


    if (
        lower.endsWith(".html") ||
        lower.endsWith(".htm")
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


    if (lower.endsWith(".css")) {

        return `/* ${filename} */

`;
    }


    if (
        lower.endsWith(".js") ||
        lower.endsWith(".mjs")
    ) {

        return `// ${filename}

`;
    }


    return "";
}


/* =========================================================
   FILE TREE
   ========================================================= */

function getFileIcon(filename) {

    const lower =
        filename.toLowerCase();


    if (
        lower.endsWith(".html") ||
        lower.endsWith(".htm")
    ) {
        return "◇";
    }


    if (lower.endsWith(".css")) {
        return "#";
    }


    if (
        lower.endsWith(".js") ||
        lower.endsWith(".mjs")
    ) {
        return "JS";
    }


    if (lower.endsWith(".json")) {
        return "{}";
    }


    if (lower.endsWith(".md")) {
        return "M";
    }


    return "•";
}


function renderFileTree() {

    fileTree.replaceChildren();


    for (const file of project.files) {

        const item =
            document.createElement(
                "button"
            );


        item.type = "button";

        item.className =
            "file-item";


        item.classList.toggle(
            "active",
            file.id ===
            project.activeFile
        );


        const icon =
            document.createElement(
                "span"
            );

        icon.className =
            "file-icon";

        icon.textContent =
            getFileIcon(file.name);


        const name =
            document.createElement(
                "span"
            );

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
            () =>
                openFile(file.id)
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
        file.id;


    syncGlobalFiles();

    renderFileTree();

    switchEditor(
        file.id,
        file
    );

    saveProject();

}


/* =========================================================
   CREATE FILE
   ========================================================= */

async function createFile() {

    const name =
        await bzPrompt(
            "Enter the name for the new file.",
            "New File",
            "untitled.txt",
            {
                confirmText: "Create"
            }
        );


    if (name === null) {
        return;
    }


    const filename =
        name.trim();


    if (!isValidFilename(filename)) {

        await bzAlert(
            "That filename is not valid.",
            "Invalid Filename"
        );

        return;
    }


    if (fileExists(filename)) {

        await bzAlert(
            `A file named "${filename}" already exists.`,
            "File Already Exists"
        );

        return;
    }


    const file = {

        id:
            crypto.randomUUID(),

        name:
            filename,

        content:
            getDefaultContent(filename)

    };


    project.files.push(file);

    project.activeFile =
        file.id;


    addEditor(file);

    syncGlobalFiles();

    renderFileTree();

    switchEditor(
        file.id,
        file
    );

    saveProject();

    updatePreview();

}


/* =========================================================
   RENAME FILE
   ========================================================= */

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
            file.name,
            {
                confirmText: "Rename"
            }
        );


    if (newName === null) {
        return;
    }


    const filename =
        newName.trim();


    if (!isValidFilename(filename)) {

        await bzAlert(
            "That filename is not valid.",
            "Invalid Filename"
        );

        return;
    }


    if (
        filename !== file.name &&
        fileExists(filename)
    ) {

        await bzAlert(
            `A file named "${filename}" already exists.`,
            "File Already Exists"
        );

        return;
    }


    file.name =
        filename;


    syncGlobalFiles();

    renderFileTree();

    switchEditor(
        file.id,
        file
    );

    saveProject();

    updatePreview();

}


/* =========================================================
   DELETE FILE
   ========================================================= */

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
            `"${file.name}" is a required Buildzen file and cannot be deleted.`,
            "Cannot Delete File",
            {
                danger: true
            }
        );

        return;
    }


    const confirmed =
        await bzConfirm(
            `Are you sure you want to delete "${file.name}"?\n\nThis cannot be undone.`,
            "Delete File",
            {
                confirmText: "Delete",
                danger: true
            }
        );


    if (!confirmed) {
        return;
    }


    const index =
        project.files.findIndex(
            item =>
                item.id ===
                file.id
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
        project.files[index] ||
        project.files[index - 1] ||
        project.files[0];


    if (!nextFile) {

        await bzAlert(
            "Buildzen cannot delete the last remaining file.",
            "Cannot Delete File",
            {
                danger: true
            }
        );

        return;
    }


    project.activeFile =
        nextFile.id;


    syncGlobalFiles();

    renderFileTree();

    switchEditor(
        nextFile.id,
        nextFile
    );

    saveProject();

    updatePreview();

}


/* =========================================================
   STATUS
   ========================================================= */

function setStatus(
    text,
    live = true
) {

    status.replaceChildren();


    const dot =
        document.createElement(
            "span"
        );

    dot.className =
        "status-dot";


    status.append(
        dot,
        document.createTextNode(
            text
        )
    );


    previewStatus.textContent =
        live
            ? "Live"
            : text;

}


/* =========================================================
   PREVIEW BUILD
   ========================================================= */

function collectPreviewCode() {

    const htmlFile =
        project.files.find(
            file =>
                file.name.toLowerCase() ===
                "index.html"
        );


    if (!htmlFile) {
        return "";
    }


    let html =
        getEditorContent(
            htmlFile.id
        );


    const cssFiles =
        project.files.filter(
            file =>
                file.name
                    .toLowerCase()
                    .endsWith(".css")
        );


    const jsFiles =
        project.files.filter(
            file => {

                const name =
                    file.name.toLowerCase();

                return (
                    name.endsWith(".js") ||
                    name.endsWith(".mjs")
                );

            }
        );


    const css =
        cssFiles
            .map(
                file =>
                    getEditorContent(
                        file.id
                    )
            )
            .join("\n\n");


    const js =
        jsFiles
            .map(
                file =>
                    getEditorContent(
                        file.id
                    )
            )
            .join("\n\n");


    if (css.trim()) {

        const style =
            `<style>\n${css}\n</style>`;


        if (
            html.includes(
                "</head>"
            )
        ) {

            html =
                html.replace(
                    "</head>",
                    `${style}\n</head>`
                );

        } else {

            html =
                `${style}\n${html}`;
        }

    }


    if (js.trim()) {

        const script =
            `<script>\n${js}\n<\/script>`;


        if (
            html.includes(
                "</body>"
            )
        ) {

            html =
                html.replace(
                    "</body>",
                    `${script}\n</body>`
                );

        } else {

            html +=
                script;
        }

    }


    return html;

}


/* =========================================================
   PREVIEW CONSOLE BRIDGE
   ========================================================= */

function createPreviewBridge() {

    return `
<script>
(() => {

    const serialize = value => {

        if (typeof value === "string") {
            return value;
        }

        try {

            const result =
                JSON.stringify(value);

            return result === undefined
                ? String(value)
                : result;

        } catch {

            return String(value);
        }

    };


    const send = (
        type,
        args
    ) => {

        try {

            window.parent.postMessage(
                {
                    source:
                        "buildzen-preview",

                    type,

                    args:
                        args.map(serialize)
                },
                "*"
            );

        } catch {
            // Ignore bridge failures.
        }

    };


    const originalLog =
        console.log;

    const originalInfo =
        console.info;

    const originalWarn =
        console.warn;

    const originalError =
        console.error;


    console.log =
        (...args) => {

            send("log", args);

            originalLog.apply(
                console,
                args
            );

        };


    console.info =
        (...args) => {

            send("info", args);

            originalInfo.apply(
                console,
                args
            );

        };


    console.warn =
        (...args) => {

            send("warn", args);

            originalWarn.apply(
                console,
                args
            );

        };


    console.error =
        (...args) => {

            send("error", args);

            originalError.apply(
                console,
                args
            );

        };


    window.addEventListener(
        "error",
        event => {

            send(
                "error",
                [
                    event.message ||
                    "Unknown runtime error"
                ]
            );

        }
    );


    window.addEventListener(
        "unhandledrejection",
        event => {

            send(
                "error",
                [
                    String(
                        event.reason
                    )
                ]
            );

        }
    );

})();
</script>
`;

}


function updatePreview() {

    previewStatus.textContent =
        "Updating...";


    setStatus(
        "Building",
        false
    );


    const html =
        collectPreviewCode();


    const bridge =
        createPreviewBridge();


    let finalHTML =
        html;


    if (
        finalHTML.includes(
            "</head>"
        )
    ) {

        finalHTML =
            finalHTML.replace(
                "</head>",
                `${bridge}\n</head>`
            );

    } else {

        finalHTML =
            bridge +
            finalHTML;
    }


    preview.onload = () => {

        setStatus(
            "Live",
            true
        );

        previewStatus.textContent =
            "Live";

    };


    preview.srcdoc =
        finalHTML;

}


/* =========================================================
   CONSOLE
   ========================================================= */

let consoleEntries = [];

let activeConsoleFilter =
    "all";


function addConsoleEntry(
    type,
    args
) {

    consoleEntries.push({
        type,
        args
    });


    renderConsole();

}


function renderConsole() {

    consoleOutput.replaceChildren();


    const filtered =
        activeConsoleFilter ===
            "all"

            ? consoleEntries

            : consoleEntries.filter(
                entry =>
                    entry.type ===
                    activeConsoleFilter
            );


    for (
        const entry of filtered
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.className =
            `console-entry ${entry.type}`;


        const message =
            document.createElement(
                "span"
            );


        message.textContent =
            entry.args.join(" ");


        row.appendChild(
            message
        );


        consoleOutput.appendChild(
            row
        );

    }


    consoleCount.textContent =
        `(${consoleEntries.length})`;

}


/* =========================================================
   PREVIEW MESSAGES
   ========================================================= */

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


        const type =
            [
                "log",
                "info",
                "warn",
                "error"
            ].includes(
                event.data.type
            )
                ? event.data.type
                : "log";


        const args =
            Array.isArray(
                event.data.args
            )
                ? event.data.args
                : [
                    String(
                        event.data.args ??
                        ""
                    )
                ];


        addConsoleEntry(
            type,
            args
        );

    }
);


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

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


consoleFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                consoleFilters.forEach(
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

    }
);


/* =========================================================
   RESET PROJECT
   ========================================================= */

resetBtn.addEventListener(
    "click",
    async () => {

        const confirmed =
            await bzConfirm(

                "Reset the entire project to the default Buildzen project?\n\nAll current files and changes will be lost.",

                "Reset Project",

                {
                    confirmText:
                        "Reset Project",

                    danger:
                        true
                }

            );


        if (!confirmed) {
            return;
        }


        localStorage.removeItem(
            STORAGE_KEY
        );


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


        const activeFile =
            project.files.find(
                file =>
                    file.id ===
                    project.activeFile
            );


        if (activeFile) {

            switchEditor(
                activeFile.id,
                activeFile
            );

        }


        consoleEntries = [];

        renderConsole();

        saveProject();

        updatePreview();

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


        if (
            typeof fileId !==
            "string"
        ) {
            return;
        }


        const file =
            project.files.find(
                item =>
                    item.id ===
                    fileId
            );


        if (!file) {
            return;
        }


        file.content =
            typeof content ===
                "string"
                ? content
                : "";


        saveProject();

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-save",
    () => {

        const activeFile =
            getActiveFile();


        if (activeFile) {

            activeFile.content =
                getEditorContent(
                    activeFile.id
                );

        }


        saveProject();

    }
);


window.addEventListener(
    "buildzen-refresh",
    updatePreview
);


/* =========================================================
   STARTUP
   ========================================================= */

loadProject();

syncGlobalFiles();


initializeEditors(
    project.files
);


renderFileTree();


const activeFile =
    project.files.find(
        file =>
            file.id ===
            project.activeFile
    );


if (activeFile) {

    switchEditor(
        activeFile.id,
        activeFile
    );

}


updatePreview();
