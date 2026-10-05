import { EditorState }
  from "https://esm.sh/@codemirror/state@6.5.2";

import {
  EditorView,
  keymap
}
  from "https://esm.sh/@codemirror/view@6.43.13?deps=@codemirror%2Fstate@6.5.2";

import { basicSetup }
  from "https://esm.sh/codemirror@6.0.1?deps=@codemirror%2Fstate@6.5.2";

import { html }
  from "https://esm.sh/@codemirror/lang-html@6.4.9?deps=@codemirror%2Fstate@6.5.2";

import { css }
  from "https://esm.sh/@codemirror/lang-css@6.3.1?deps=@codemirror%2Fstate@6.5.2";

import { javascript }
  from "https://esm.sh/@codemirror/lang-javascript@6.2.3?deps=@codemirror%2Fstate@6.5.2";

import { oneDark }
  from "https://esm.sh/@codemirror/theme-one-dark@6.1.2?deps=@codemirror%2Fstate@6.5.2";

import { syntaxHighlighting }
  from "https://esm.sh/@codemirror/language@6.12.4?deps=@codemirror%2Fstate@6.5.2";

import { classHighlighter }
  from "https://esm.sh/@lezer/highlight@1.2.5?target=es2022";

import { indentWithTab }
  from "https://esm.sh/@codemirror/commands@6.11.1?deps=@codemirror%2Fstate@6.5.2";


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

const htmlEditorElement = document.querySelector("#htmlEditor");
const cssEditorElement = document.querySelector("#cssEditor");
const jsEditorElement = document.querySelector("#jsEditor");

const preview = document.querySelector("#preview");

const statusElement = document.querySelector("#status");

const cursorInfo = document.querySelector("#cursorInfo");
const fileName = document.querySelector("#fileName");
const languageInfo = document.querySelector("#languageInfo");

const resetBtn = document.querySelector("#resetBtn");
const refreshBtn = document.querySelector("#refreshBtn");

const tabs = document.querySelectorAll(".tab");
const fileItems = document.querySelectorAll(".file-item");

const consoleOutput = document.querySelector("#consoleOutput");
const consoleCount = document.querySelector("#consoleCount");
const clearConsoleBtn = document.querySelector("#clearConsoleBtn");
const consoleFilters = document.querySelectorAll(".console-filter");


/* =========================
   STATE
   ========================= */

const STORAGE_KEY = "buildzen-project";

const editors = {};

let activeEditor = "html";

let consoleMessages = [];
let consoleFilter = "all";


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
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}


function addConsoleMessage(type, message) {
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
        message => message.type === consoleFilter
      );

  consoleOutput.innerHTML = "";

  if (filteredMessages.length === 0) {
    const empty = document.createElement("div");

    empty.className = "console-empty";
    empty.textContent =
      consoleMessages.length === 0
        ? "No console messages."
        : "No messages match this filter.";

    consoleOutput.appendChild(empty);
  } else {
    for (const entry of filteredMessages) {
      const row = document.createElement("div");

      row.className = `console-entry ${entry.type}`;

      const time = document.createElement("span");
      time.className = "console-time";

      time.textContent =
        entry.time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

      const level = document.createElement("span");
      level.className = "console-level";
      level.textContent = entry.type;

      const message = document.createElement("span");
      message.className = "console-message";
      message.textContent = entry.message;

      row.append(
        time,
        level,
        message
      );

      consoleOutput.appendChild(row);
    }
  }

  consoleCount.textContent = `(${consoleMessages.length})`;

  consoleOutput.scrollTop =
    consoleOutput.scrollHeight;
}


function clearConsole() {
  consoleMessages = [];
  renderConsole();
}


/* =========================
   PREVIEW CONSOLE BRIDGE
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
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }

    function send(type, args) {
        const message = args
            .map(serialize)
            .join(" ");

        parent.postMessage({
            source: "buildzen-preview",
            type,
            message
        }, "*");
    }

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = function (...args) {
        send("log", args);
        originalLog.apply(console, args);
    };

    console.info = function (...args) {
        send("info", args);
        originalInfo.apply(console, args);
    };

    console.warn = function (...args) {
        send("warn", args);
        originalWarn.apply(console, args);
    };

    console.error = function (...args) {
        send("error", args);
        originalError.apply(console, args);
    };

    window.addEventListener("error", function (event) {
        send("error", [
            event.message || "Unknown error"
        ]);
    });

    window.addEventListener(
        "unhandledrejection",
        function (event) {
            send("error", [
                "Unhandled promise rejection:",
                event.reason
            ]);
        }
    );
})();
<\/script>
`;


/* =========================
   STATUS
   ========================= */

function setStatus(text, state = "live") {
  statusElement.innerHTML = `
        <span class="status-dot"></span>
        ${text}
    `;

  if (state === "error") {
    statusElement.querySelector(".status-dot").style.background =
      "#f06a6a";
  }
}


/* =========================
   EDITOR INFO
   ========================= */

function updateEditorInfo(view, language) {
  const selection = view.state.selection.main;

  const line =
    view.state.doc.lineAt(selection.head);

  const column =
    selection.head - line.from + 1;

  cursorInfo.textContent =
    `Ln ${line.number}, Col ${column}`;

  languageInfo.textContent =
    language.toUpperCase();
}


/* =========================
   PROJECT STORAGE
   ========================= */

function loadProject() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

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
  const project = {
    html: editors.html.state.doc.toString(),
    css: editors.css.state.doc.toString(),
    js: editors.js.state.doc.toString()
  };

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
   PREVIEW
   ========================= */

function updatePreview() {
  const htmlCode =
    editors.html.state.doc.toString();

  const cssCode =
    editors.css.state.doc.toString();

  const jsCode =
    editors.js.state.doc.toString();

  const srcdoc = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>
${cssCode}
</style>

${consoleBridge}

</head>

<body>

${htmlCode}

<script>
${jsCode}
<\/script>

</body>
</html>
`;

  consoleMessages = [];

  preview.srcdoc = srcdoc;

  renderConsole();

  setStatus("Live");
}


/* =========================
   CODEMIRROR
   ========================= */

const buildzenKeymap = keymap.of([
  indentWithTab,

  {
    key: "Mod-s",

    run() {
      saveProject();
      return true;
    }
  },

  {
    key: "Mod-Enter",

    run() {
      updatePreview();
      return true;
    }
  }
]);


function createEditor(
  parent,
  value,
  languageExtension,
  languageName,
  editorName
) {
  const state = EditorState.create({
    doc: value,

    extensions: [
      basicSetup,

      languageExtension,

      oneDark,

      syntaxHighlighting(
        classHighlighter
      ),

      buildzenKeymap,

      EditorView.updateListener.of(
        update => {
          if (
            update.selectionSet ||
            update.docChanged
          ) {
            if (
              activeEditor ===
              editorName
            ) {
              updateEditorInfo(
                update.view,
                languageName
              );
            }
          }

          if (update.docChanged) {
            setStatus("Editing");
          }
        }
      )
    ]
  });

  return new EditorView({
    state,
    parent
  });
}


/* =========================
   CREATE EDITORS
   ========================= */

const project = loadProject();

editors.html = createEditor(
  htmlEditorElement,
  project.html,
  html(),
  "HTML",
  "html"
);

editors.css = createEditor(
  cssEditorElement,
  project.css,
  css(),
  "CSS",
  "css"
);

editors.js = createEditor(
  jsEditorElement,
  project.js,
  javascript(),
  "JavaScript",
  "js"
);


/* =========================
   EDITOR SWITCHING
   ========================= */

const editorDetails = {
  html: {
    file: "index.html",
    language: "HTML"
  },

  css: {
    file: "style.css",
    language: "CSS"
  },

  js: {
    file: "script.js",
    language: "JavaScript"
  }
};


function switchEditor(name) {
  if (!editors[name]) {
    return;
  }

  activeEditor = name;

  document
    .querySelectorAll(".editor")
    .forEach(editor => {
      editor.classList.remove(
        "active-editor"
      );
    });

  const editorElement =
    document.querySelector(
      `#${name}Editor`
    );

  if (editorElement) {
    editorElement.classList.add(
      "active-editor"
    );
  }


  /* Tabs */

  tabs.forEach(tab => {
    tab.classList.toggle(
      "active",
      tab.dataset.editor === name
    );
  });


  /* Project tree */

  fileItems.forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.file === name
    );
  });


  /* File information */

  const details =
    editorDetails[name];

  fileName.textContent =
    details.file;

  languageInfo.textContent =
    details.language;


  /* Cursor information */

  updateEditorInfo(
    editors[name],
    details.language
  );


  /* Focus */

  editors[name].focus();
}


/* =========================
   TAB EVENTS
   ========================= */

tabs.forEach(tab => {
  tab.addEventListener(
    "click",
    () => {
      switchEditor(
        tab.dataset.editor
      );
    }
  );
});


/* =========================
   PROJECT TREE EVENTS
   ========================= */

fileItems.forEach(item => {
  item.addEventListener(
    "click",
    () => {
      switchEditor(
        item.dataset.file
      );
    }
  );
});


/* =========================
   CONSOLE FILTERS
   ========================= */

consoleFilters.forEach(filter => {
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
});


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
  () => {
    updatePreview();
  }
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

    editors.html.dispatch({
      changes: {
        from: 0,
        to: editors.html.state.doc.length,
        insert: starterProject.html
      }
    });

    editors.css.dispatch({
      changes: {
        from: 0,
        to: editors.css.state.doc.length,
        insert: starterProject.css
      }
    });

    editors.js.dispatch({
      changes: {
        from: 0,
        to: editors.js.state.doc.length,
        insert: starterProject.js
      }
    });

    switchEditor("html");

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

    const data = event.data;

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
   INITIALIZE
   ========================= */

switchEditor("html");

updatePreview();

addConsoleMessage(
  "log",
  "Buildzen preview loaded."
);
