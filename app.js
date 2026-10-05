import {
    editors,
    initializeEditors,
    getProjectCode,
    setProjectCode
} from "./editor.js";


/* =========================
   STARTER PROJECT
   ========================= */

const starterProject = {

    html: `<div class="card">
    <h1>Hello, Buildzen!</h1>
    <p>This page is built with separate HTML, CSS and JavaScript files.</p>
    <button id="helloBtn">
        Click me
    </button>
</div>`,

    css: `body {
    margin: 0;
    min-height: 100vh;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #111827;
    color: #f9fafb;

    font-family: Arial, sans-serif;
}

.card {
    width: min(420px, 90vw);

    padding: 32px;

    border-radius: 16px;

    background: #1f2937;

    text-align: center;

    box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.35);
}

h1 {
    margin-top: 0;
}

p {
    color: #9ca3af;
    line-height: 1.6;
}

button {
    padding: 10px 18px;

    border: 0;
    border-radius: 8px;

    background: #4f7cff;
    color: white;

    font-size: 14px;

    cursor: pointer;
}

button:hover {
    background: #416be0;
}`,

    js: `console.log("Buildzen preview loaded.");

const button = document.querySelector("#helloBtn");

button.addEventListener("click", () => {
    console.log("Button clicked!");
    alert("Hello from Buildzen!");
});`

};


/* =========================
   DOM REFERENCES
   ========================= */

const preview =
    document.querySelector("#preview");

const statusElement =
    document.querySelector("#status");

const resetBtn =
    document.querySelector("#resetBtn");

const refreshBtn =
    document.querySelector("#refreshBtn");

const consoleOutput =
    document.querySelector("#consoleOutput");

const consoleCount =
    document.querySelector("#consoleCount");

const clearConsoleBtn =
    document.querySelector("#clearConsoleBtn");

const consoleFilters =
    document.querySelectorAll(
        ".console-filter"
    );


/* =========================
   STATE
   ========================= */

const STORAGE_KEY =
    "buildzen-project";

let consoleMessages = [];

let consoleFilter = "all";


/* =========================
   PROJECT STORAGE
   ========================= */

function loadProject() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {
            return starterProject;
        }


        const project =
            JSON.parse(saved);


        return {

            html:
                typeof project.html === "string"
                    ? project.html
                    : starterProject.html,

            css:
                typeof project.css === "string"
                    ? project.css
                    : starterProject.css,

            js:
                typeof project.js === "string"
                    ? project.js
                    : starterProject.js

        };

    } catch {

        return starterProject;

    }

}


function saveProject() {

    const project =
        getProjectCode();


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(project)
    );


    setStatus("Saved");


    setTimeout(() => {
        setStatus("Live");
    }, 900);

}


/* =========================
   STATUS
   ========================= */

function setStatus(text) {

    statusElement.innerHTML = `
        <span class="status-dot"></span>
        ${text}
    `;

}


/* =========================
   CONSOLE
   ========================= */

function formatConsoleValue(value) {

    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return "undefined";
    }

    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
    ) {
        return String(value);
    }


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


function addConsoleMessage(
    type,
    message
) {

    consoleMessages.push({

        type,

        message,

        time: new Date()

    });


    renderConsole();

}


function renderConsole() {

    const filteredMessages =
        consoleFilter === "all"

            ? consoleMessages

            : consoleMessages.filter(
                message =>
                    message.type ===
                    consoleFilter
            );


    consoleOutput.innerHTML = "";


    if (
        filteredMessages.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "console-empty";

        empty.textContent =
            consoleMessages.length === 0
                ? "No console messages."
                : "No messages match this filter.";

        consoleOutput.appendChild(
            empty
        );

    } else {

        for (
            const entry
            of filteredMessages
        ) {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                `console-entry ${entry.type}`;


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


            const level =
                document.createElement(
                    "span"
                );

            level.className =
                "console-level";

            level.textContent =
                entry.type;


            const message =
                document.createElement(
                    "span"
                );

            message.className =
                "console-message";

            message.textContent =
                entry.message;


            row.append(
                time,
                level,
                message
            );


            consoleOutput.appendChild(
                row
            );

        }

    }


    consoleCount.textContent =
        `(${consoleMessages.length})`;


    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;

}


function clearConsole() {

    consoleMessages = [];

    renderConsole();

}


/* =========================
   CONSOLE BRIDGE
   ========================= */

const consoleBridge = `
<script>
(function () {

    function serialize(value) {

        if (value === undefined) {
            return "undefined";
        }

        if (value === null) {
            return "null";
        }

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint"
        ) {
            return String(value);
        }

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


    function send(type, args) {

        const message =
            args
                .map(serialize)
                .join(" ");


        parent.postMessage({

            source:
                "buildzen-preview",

            type,

            message

        }, "*");

    }


    const originalLog =
        console.log;

    const originalInfo =
        console.info;

    const originalWarn =
        console.warn;

    const originalError =
        console.error;


    console.log =
        function (...args) {

            send("log", args);

            originalLog.apply(
                console,
                args
            );

        };


    console.info =
        function (...args) {

            send("info", args);

            originalInfo.apply(
                console,
                args
            );

        };


    console.warn =
        function (...args) {

            send("warn", args);

            originalWarn.apply(
                console,
                args
            );

        };


    console.error =
        function (...args) {

            send("error", args);

            originalError.apply(
                console,
                args
            );

        };


    window.addEventListener(
        "error",
        function (event) {

            send(
                "error",
                [
                    event.message ||
                    "Unknown error"
                ]
            );

        }
    );


    window.addEventListener(
        "unhandledrejection",
        function (event) {

            send(
                "error",
                [
                    "Unhandled promise rejection:",
                    event.reason
                ]
            );

        }
    );

})();
<\/script>
`;


/* =========================
   PREVIEW
   ========================= */

function updatePreview() {

    const project =
        getProjectCode();


    const srcdoc = `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<style>
${project.css}
</style>

${consoleBridge}

</head>

<body>

${project.html}

<script>
${project.js}
<\/script>

</body>

</html>
`;


    consoleMessages = [];

    renderConsole();


    preview.srcdoc =
        srcdoc;


    setStatus("Live");

}


/* =========================
   CONSOLE FILTERS
   ========================= */

consoleFilters.forEach(
    filter => {

        filter.addEventListener(
            "click",
            () => {

                consoleFilter =
                    filter.dataset.filter;


                consoleFilters.forEach(
                    button => {

                        button.classList.toggle(
                            "active",
                            button === filter
                        );

                    }
                );


                renderConsole();

            }
        );

    }
);


/* =========================
   CLEAR CONSOLE
   ========================= */

clearConsoleBtn.addEventListener(
    "click",
    clearConsole
);


/* =========================
   REFRESH
   ========================= */

refreshBtn.addEventListener(
    "click",
    updatePreview
);


/* =========================
   RESET
   ========================= */

resetBtn.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Reset the project to the default Buildzen starter?"
            );


        if (!confirmed) {
            return;
        }


        localStorage.removeItem(
            STORAGE_KEY
        );


        setProjectCode(
            starterProject
        );


        updatePreview();


        setStatus("Reset");


        setTimeout(() => {
            setStatus("Live");
        }, 900);

    }
);


/* =========================
   PREVIEW MESSAGES
   ========================= */

window.addEventListener(
    "message",
    event => {

        if (
            event.source !==
            preview.contentWindow
        ) {
            return;
        }


        const data =
            event.data;


        if (
            !data ||
            data.source !==
            "buildzen-preview"
        ) {
            return;
        }


        if (
            ![
                "log",
                "info",
                "warn",
                "error"
            ].includes(data.type)
        ) {
            return;
        }


        addConsoleMessage(
            data.type,
            data.message
        );

    }
);


/* =========================
   EDITOR EVENTS
   ========================= */

window.addEventListener(
    "buildzen-save",
    saveProject
);


window.addEventListener(
    "buildzen-refresh",
    updatePreview
);


/* =========================
   INITIALIZE
   ========================= */

const project =
    loadProject();


initializeEditors(
    project
);


updatePreview();


addConsoleMessage(
    "log",
    "Buildzen preview loaded."
);