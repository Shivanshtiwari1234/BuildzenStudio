import {
    initializeEditors,
    addEditor,
    removeEditor,
    switchEditor,
    getEditorContent
} from "./editor.js";


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
            `<main class="hero">
    <h1>Hello, Buildzen!</h1>
    <p>Start building your website.</p>
    <button onclick="sayHello()">Click me</button>
</main>`
    },

    {
        id: "style.css",
        name: "style.css",
        content:
            `.hero {
    font-family: system-ui, sans-serif;
    text-align: center;
    padding: 80px 20px;
}

button {
    padding: 10px 18px;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
}`
    },

    {
        id: "script.js",
        name: "script.js",
        content:
            `function sayHello() {
    console.log("Hello from Buildzen!");
}`
    }
];


let project = {
    files: [],
    activeFile: "index.html"
};


/*
 * editor.js uses this to get information
 * about the current project files.
 */
window.buildzenFiles = project.files;


/* =========================================================
   Project persistence
   ========================================================= */

function createId() {
    return crypto.randomUUID();
}


function loadProject() {

    const saved =
        localStorage.getItem(STORAGE_KEY);


    if (!saved) {

        project = {
            files: starterFiles.map(file => ({
                ...file
            })),
            activeFile: "index.html"
        };

        return;
    }


    try {

        const parsed =
            JSON.parse(saved);


        /*
         * Current Buildzen project format.
         */
        if (
            parsed &&
            Array.isArray(parsed.files)
        ) {

            project = parsed;

            /*
             * Protect against a malformed/
             * missing activeFile.
             */
            if (
                !project.activeFile ||
                !project.files.some(
                    file =>
                        file.id === project.activeFile
                )
            ) {

                project.activeFile =
                    project.files[0]?.id || null;

            }

            return;
        }


        /*
         * Migrate the old Buildzen format:
         *
         * {
         *     html: "...",
         *     css: "...",
         *     js: "..."
         * }
         */
        if (parsed) {

            project = {

                files: [

                    {
                        id: "index.html",
                        name: "index.html",
                        content: parsed.html || ""
                    },

                    {
                        id: "style.css",
                        name: "style.css",
                        content: parsed.css || ""
                    },

                    {
                        id: "script.js",
                        name: "script.js",
                        content: parsed.js || ""
                    }

                ],

                activeFile: "index.html"

            };

            saveProject();

            return;
        }

    } catch (error) {

        console.error(
            "Could not load saved project:",
            error
        );

    }


    project = {
        files: starterFiles.map(file => ({
            ...file
        })),
        activeFile: "index.html"
    };
}


function saveProject() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(project)
    );

}


function syncGlobalFiles() {

    window.buildzenFiles =
        project.files;

}


/* =========================================================
   Status
   ========================================================= */

function setStatus(text) {

    status.innerHTML = `
        <span class="status-dot"></span>
        ${text}
    `;

}


/* =========================================================
   File helpers
   ========================================================= */

function getActiveFile() {

    return project.files.find(
        file =>
            file.id === project.activeFile
    );

}


function getFileIcon(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (extension === "html") {

        return {
            text: "<>",
            className: "html-icon"
        };

    }


    if (extension === "css") {

        return {
            text: "#",
            className: "css-icon"
        };

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return {
            text: "JS",
            className: "js-icon"
        };

    }


    return {
        text: "•",
        className: "file-icon-default"
    };

}


function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


function renderFileTree() {

    fileTree.innerHTML = "";


    for (const file of project.files) {

        const button =
            document.createElement("button");

        button.className =
            "file-item";


        if (
            file.id === project.activeFile
        ) {

            button.classList.add("active");

        }


        const icon =
            getFileIcon(file.name);


        button.innerHTML = `

            <span class="file-icon ${icon.className}">
                ${icon.text}
            </span>

            <span class="file-name">
                ${escapeHtml(file.name)}
            </span>

        `;


        button.addEventListener(
            "click",
            () => {

                openFile(file.id);

            }
        );


        fileTree.appendChild(button);

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

    switchEditor(
        file.id,
        file
    );

    saveProject();

}


/* =========================================================
   File validation
   ========================================================= */

function isValidFilename(name) {

    if (!name) {
        return false;
    }


    if (
        name.includes("/") ||
        name.includes("\\")
    ) {

        return false;

    }


    return /^[^<>:"|?*]+$/.test(name);

}


function fileExists(
    name,
    exceptId = null
) {

    return project.files.some(
        file =>
            file.id !== exceptId &&
            file.name.toLowerCase() ===
            name.toLowerCase()
    );

}


/* =========================================================
   New file
   ========================================================= */

function getDefaultContent(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (extension === "html") {

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>New Page</title>
</head>
<body>

</body>
</html>`;

    }


    if (extension === "css") {

        return `/* ${filename} */`;

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return `// ${filename}`;

    }


    return "";

}


function createFile() {

    const name =
        prompt(
            "Enter the new file name:",
            "new-file.js"
        );


    if (name === null) {
        return;
    }


    const filename =
        name.trim();


    if (!isValidFilename(filename)) {

        alert("Invalid file name.");

        return;

    }


    if (fileExists(filename)) {

        alert(
            "A file with that name already exists."
        );

        return;

    }


    const file = {

        id: createId(),

        name: filename,

        content:
            getDefaultContent(filename)

    };


    project.files.push(file);

    project.activeFile =
        file.id;


    syncGlobalFiles();

    addEditor(file);

    renderFileTree();

    switchEditor(
        file.id,
        file
    );

    saveProject();

    setStatus("Saved");

    updatePreview();

}


/* =========================================================
   Rename
   ========================================================= */

function renameFile() {

    const file =
        getActiveFile();


    if (!file) {
        return;
    }


    const name =
        prompt(
            "Rename file:",
            file.name
        );


    if (name === null) {
        return;
    }


    const filename =
        name.trim();


    if (!isValidFilename(filename)) {

        alert("Invalid file name.");

        return;

    }


    if (
        fileExists(
            filename,
            file.id
        )
    ) {

        alert(
            "A file with that name already exists."
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

    setStatus("Saved");

    updatePreview();

}


/* =========================================================
   Delete
   ========================================================= */

function deleteFile() {

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

        alert(
            `${file.name} is a required Buildzen file and cannot be deleted.`
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete "${file.name}"?`
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


    /*
     * Select a sensible neighboring file.
     */
    const nextFile =
        project.files[
        Math.min(
            index,
            project.files.length - 1
        )
        ];


    project.activeFile =
        nextFile?.id ||
        project.files[0]?.id ||
        null;


    syncGlobalFiles();

    renderFileTree();


    if (project.activeFile) {

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

    }


    saveProject();

    setStatus("Saved");

    updatePreview();

}


/* =========================================================
   Preview
   ========================================================= */

function collectPreviewCode() {

    const htmlFile =
        project.files.find(
            file =>
                file.name.toLowerCase() ===
                "index.html"
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


    return {

        html:
            htmlFile
                ? getEditorContent(
                    htmlFile.id
                )
                : "",

        css:
            cssFiles
                .map(
                    file =>
                        getEditorContent(
                            file.id
                        )
                )
                .join("\n\n"),

        js:
            jsFiles
                .map(
                    file =>
                        getEditorContent(
                            file.id
                        )
                )
                .join("\n\n")

    };

}


/* =========================================================
   Console
   ========================================================= */

let consoleEntries = [];

let consoleFilter =
    "all";


function renderConsole() {

    consoleOutput.innerHTML = "";


    const filtered =
        consoleEntries.filter(
            entry =>
                consoleFilter === "all" ||
                entry.type === consoleFilter
        );


    for (const entry of filtered) {

        const row =
            document.createElement("div");

        row.className =
            `console-entry ${entry.type}`;


        row.textContent =
            entry.text;


        consoleOutput.appendChild(row);

    }


    consoleCount.textContent =
        `(${consoleEntries.length})`;

}


function addConsoleEntry(
    type,
    args
) {

    const text =
        args.map(value => {

            if (
                typeof value === "object" &&
                value !== null
            ) {

                try {

                    return JSON.stringify(
                        value
                    );

                } catch {

                    return String(value);

                }

            }

            return String(value);

        }).join(" ");


    consoleEntries.push({
        type,
        text
    });


    renderConsole();

}


function clearConsole() {

    consoleEntries = [];

    renderConsole();

}


const consoleBridge = `
<script>
(function() {

    const original = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    };

    function send(type, args) {

        parent.postMessage({
            source: "buildzen-console",
            type,
            args: args.map(value => {

                try {

                    return typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);

                } catch {

                    return String(value);

                }

            })

        }, "*");

    }

    console.log = function(...args) {
        send("log", args);
        original.log.apply(console, args);
    };

    console.info = function(...args) {
        send("info", args);
        original.info.apply(console, args);
    };

    console.warn = function(...args) {
        send("warn", args);
        original.warn.apply(console, args);
    };

    console.error = function(...args) {
        send("error", args);
        original.error.apply(console, args);
    };

    window.addEventListener("error", event => {

        send("error", [
            event.message
        ]);

    });

    window.addEventListener(
        "unhandledrejection",
        event => {

            send("error", [
                event.reason
            ]);

        }
    );

})();
</script>
`;


function updatePreview() {

    const code =
        collectPreviewCode();


    consoleEntries = [];

    renderConsole();


    const srcdoc = `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<style>
${code.css}
</style>

${consoleBridge}

</head>

<body>

${code.html}

<script>
${code.js}
<\/script>

</body>

</html>
`;


    previewStatus.textContent =
        "Refreshing…";


    preview.srcdoc =
        srcdoc;


    setStatus("Live");


    preview.addEventListener(
        "load",
        () => {

            previewStatus.textContent =
                "Live";

        },
        {
            once: true
        }
    );

}


/* =========================================================
   Console controls
   ========================================================= */

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


                consoleFilter =
                    button.dataset.filter;


                renderConsole();

            }
        );

    });


clearConsoleBtn.addEventListener(
    "click",
    clearConsole
);


/* =========================================================
   File controls
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


/* =========================================================
   Preview controls
   ========================================================= */

refreshBtn.addEventListener(
    "click",
    () => {

        updatePreview();

    }
);


/* =========================================================
   Reset
   ========================================================= */

resetBtn.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Reset the entire Buildzen project?"
            );


        if (!confirmed) {
            return;
        }


        localStorage.removeItem(
            STORAGE_KEY
        );


        project = {

            files:
                starterFiles.map(
                    file => ({
                        ...file
                    })
                ),

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


        saveProject();

        updatePreview();

        setStatus("Reset");


        setTimeout(
            () => setStatus("Live"),
            700
        );

    }
);


/* =========================================================
   Editor events
   ========================================================= */

window.addEventListener(
    "buildzen-edit",
    event => {

        const file =
            project.files.find(
                item =>
                    item.id ===
                    event.detail.fileId
            );


        if (!file) {
            return;
        }


        file.content =
            event.detail.content;


        saveProject();

        setStatus("Saved");

    }
);


window.addEventListener(
    "buildzen-save",
    () => {

        const active =
            getActiveFile();


        if (active) {

            active.content =
                getEditorContent(
                    active.id
                );

        }


        saveProject();

        setStatus("Saved");

    }
);


window.addEventListener(
    "buildzen-refresh",
    () => {

        updatePreview();

    }
);


/* =========================================================
   Preview -> parent console bridge
   ========================================================= */

window.addEventListener(
    "message",
    event => {

        if (
            event.data?.source !==
            "buildzen-console"
        ) {

            return;

        }


        addConsoleEntry(
            event.data.type,
            event.data.args || []
        );

    }
);


/* =========================================================
   STARTUP
   ========================================================= */

/*
 * Important startup order:
 *
 * 1. Load project from localStorage.
 * 2. Sync the global file list.
 * 3. Create CodeMirror editors.
 * 4. Render the project pane.
 * 5. Select the saved active file.
 * 6. Build the preview.
 */

loadProject();

syncGlobalFiles();

initializeEditors(
    project.files
);

renderFileTree();


if (project.activeFile) {

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

}


updatePreview();

console.log(
    "Buildzen preview loaded"
);