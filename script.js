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

import { oneDark }
  from "https://esm.sh/@codemirror/theme-one-dark@6.1.2?deps=@codemirror%2Fstate@6.5.2";

import { syntaxHighlighting }
  from "https://esm.sh/@codemirror/language@6.12.4?deps=@codemirror%2Fstate@6.5.2";

import { classHighlighter }
  from "https://esm.sh/@lezer/highlight@1.2.5?target=es2022";

import { indentWithTab }
  from "https://esm.sh/@codemirror/commands@6.11.1?deps=@codemirror%2Fstate@6.5.2";


// ============================================================
// SYNTAX HIGHLIGHTING CSS
// ============================================================

const syntaxStyle = document.createElement("style");

syntaxStyle.id = "buildzen-syntax-highlighting";

syntaxStyle.textContent = `
    /* HTML / XML */

    .tok-angleBracket {
        color: #abb2bf;
    }

    .tok-tagName {
        color: #e06c75;
    }

    .tok-attributeName {
        color: #d19a66;
    }

    .tok-propertyName {
        color: #61afef;
    }

    .tok-string {
        color: #98c379;
    }

    .tok-comment {
        color: #7f848e;
        font-style: italic;
    }

    .tok-meta {
        color: #c678dd;
    }

    /* JavaScript / CSS */

    .tok-keyword {
        color: #c678dd;
    }

    .tok-variableName {
        color: #e06c75;
    }

    .tok-variableName2 {
        color: #61afef;
    }

    .tok-definition {
        color: #61afef;
    }

    .tok-typeName {
        color: #e5c07b;
    }

    .tok-className {
        color: #e5c07b;
    }

    .tok-number {
        color: #d19a66;
    }

    .tok-bool {
        color: #d19a66;
    }

    .tok-atom {
        color: #d19a66;
    }

    .tok-operator {
        color: #56b6c2;
    }

    .tok-punctuation {
        color: #abb2bf;
    }

    .tok-string2 {
        color: #98c379;
    }

    .tok-regexp {
        color: #56b6c2;
    }

    .tok-escape {
        color: #56b6c2;
    }

    .tok-link {
        color: #61afef;
        text-decoration: underline;
    }

    .tok-invalid {
        color: #ffffff;
        background: #e06c75;
    }

    .tok-content {
        color: #abb2bf;
    }

    .tok-labelName {
        color: #61afef;
    }

    .tok-macroName {
        color: #c678dd;
    }

    .tok-function {
        color: #61afef;
    }
`;

document.head.appendChild(syntaxStyle);


// ============================================================
// STARTER CODE
// ============================================================

const starterCode = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Buildzen Website</title>

    <style>
        body {
            margin: 0;
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            font-family: Arial, sans-serif;
            background: #f4f6f8;
        }

        .card {
            padding: 40px;

            text-align: center;

            background: white;
            border-radius: 16px;

            box-shadow:
                0 10px 30px
                rgba(0, 0, 0, 0.12);
        }

        .button {
            padding: 12px 20px;

            border: none;
            border-radius: 8px;

            background: #4f7cff;
            color: white;

            cursor: pointer;
        }

        .button:hover {
            background: #3d68e6;
        }
    </style>
</head>

<body>

    <div class="card">
        <h1>Hello from Buildzen!</h1>

        <p>Start editing the code.</p>

        <button
            class="button"
            onclick="testBuildzen()"
        >
            Test Buildzen
        </button>
    </div>

    <script>
        function testBuildzen() {
            console.log("Button clicked!");

            alert("Buildzen JavaScript is working!");
        }

        console.log("Buildzen preview loaded.");
    <\/script>

</body>
</html>`;


// ============================================================
// ELEMENTS
// ============================================================

const editorElement = document.getElementById("editor");
const preview = document.getElementById("preview");

const status = document.getElementById("status");
const lineCount = document.getElementById("lineCount");
const cursorPosition = document.getElementById("cursorPosition");

const previewStatus = document.getElementById("previewStatus");

const consoleOutput = document.getElementById("consoleOutput");
const consoleCount = document.getElementById("consoleCount");

const resetBtn = document.getElementById("resetBtn");
const refreshBtn = document.getElementById("refreshBtn");
const clearConsoleBtn = document.getElementById("clearConsole");


// ============================================================
// CONSOLE
// ============================================================

let consoleMessages = 0;

function clearConsole() {
  consoleMessages = 0;

  consoleCount.textContent = "0";

  consoleOutput.innerHTML = `
        <div class="console-empty">
            Console output will appear here...
        </div>
    `;
}


function addConsoleMessage(type, message) {
  if (consoleOutput.querySelector(".console-empty")) {
    consoleOutput.innerHTML = "";
  }

  consoleMessages++;

  consoleCount.textContent = consoleMessages;

  const entry = document.createElement("div");

  entry.className = `console-entry console-${type}`;

  const time = new Date().toLocaleTimeString();

  entry.innerHTML = `
        <span class="console-time">${time}</span>
        <span class="console-type">${type}</span>
        <span class="console-message"></span>
    `;

  entry.querySelector(".console-message").textContent = message;

  consoleOutput.appendChild(entry);

  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}


// ============================================================
// PREVIEW CONSOLE BRIDGE
// ============================================================

const consoleBridge = `
<script>
(function () {

    function serialize(value) {
        try {
            if (typeof value === "string") {
                return value;
            }

            return JSON.stringify(value, null, 2);
        } catch (error) {
            return String(value);
        }
    }

    function send(type, args) {
        parent.postMessage({
            source: "buildzen-preview",
            type: type,
            message: args.map(serialize).join(" ")
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
            event.message,
            "Line " + event.lineno
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
</script>
`;


// ============================================================
// PREVIEW
// ============================================================

function createPreviewHTML(code) {
  if (code.includes("</head>")) {
    return code.replace(
      "</head>",
      consoleBridge + "</head>"
    );
  }

  if (code.includes("<body>")) {
    return code.replace(
      "<body>",
      "<body>" + consoleBridge
    );
  }

  return consoleBridge + code;
}


function updatePreview() {
  const code = editor.state.doc.toString();

  preview.srcdoc = createPreviewHTML(code);

  previewStatus.textContent = "Preview updated";

  setStatus("Live");
}


// ============================================================
// STATUS
// ============================================================

function setStatus(text) {
  status.innerHTML = `
        <span class="status-dot"></span>
        ${text}
    `;
}


// ============================================================
// EDITOR INFORMATION
// ============================================================

function updateEditorInfo(view) {
  const state = view.state;

  const lines = state.doc.lines;

  lineCount.textContent =
    `${lines} ${lines === 1 ? "line" : "lines"}`;

  const cursor = state.selection.main.head;

  const line = state.doc.lineAt(cursor);

  const column =
    cursor - line.from + 1;

  cursorPosition.textContent =
    `Ln ${line.number}, Col ${column}`;
}


// ============================================================
// SAVE
// ============================================================

function saveProject() {
  const code = editor.state.doc.toString();

  localStorage.setItem(
    "buildzen-code",
    code
  );

  setStatus("Saved");

  setTimeout(() => {
    setStatus("Live");
  }, 1000);
}


// ============================================================
// RESET
// ============================================================

function resetProject() {
  const confirmed = confirm(
    "Reset the editor to the default Buildzen project?"
  );

  if (!confirmed) {
    return;
  }

  editor.dispatch({
    changes: {
      from: 0,
      to: editor.state.doc.length,
      insert: starterCode
    }
  });

  localStorage.removeItem("buildzen-code");

  updatePreview();

  clearConsole();

  setStatus("Reset");
}


// ============================================================
// KEYMAP
// ============================================================

const buildzenKeymap = keymap.of([
  indentWithTab,

  {
    key: "Mod-s",

    run: () => {
      saveProject();
      return true;
    }
  },

  {
    key: "Mod-Enter",

    run: () => {
      updatePreview();
      return true;
    }
  }
]);


// ============================================================
// EDITOR
// ============================================================

const savedCode =
  localStorage.getItem("buildzen-code");

const initialCode =
  savedCode || starterCode;


const updateListener =
  EditorView.updateListener.of((update) => {

    if (update.docChanged) {
      updatePreview();

      setStatus("Live");
    }

    if (update.selectionSet || update.docChanged) {
      updateEditorInfo(update.view);
    }
  });


const editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,

    extensions: [

      basicSetup,

      // HTML parser, including embedded CSS and JS
      html(),

      // One Dark editor UI
      oneDark,

      // Stable tok-* syntax classes
      syntaxHighlighting(classHighlighter),

      buildzenKeymap,

      updateListener
    ]
  }),

  parent: editorElement
});


// ============================================================
// EVENTS
// ============================================================

resetBtn.addEventListener(
  "click",
  resetProject
);

refreshBtn.addEventListener(
  "click",
  updatePreview
);

clearConsoleBtn.addEventListener(
  "click",
  clearConsole
);


// ============================================================
// PREVIEW MESSAGES
// ============================================================

window.addEventListener(
  "message",
  (event) => {

    if (
      !event.data ||
      event.data.source !== "buildzen-preview"
    ) {
      return;
    }

    addConsoleMessage(
      event.data.type || "log",
      event.data.message || ""
    );
  }
);


// ============================================================
// INITIALIZE
// ============================================================

updateEditorInfo(editor);

updatePreview();

setStatus("Live");
