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

    display: grid;
    place-items: center;

    font-family: Arial, sans-serif;
    background: #f3f4f6;
}

.card {
    width: 360px;

    padding: 30px;

    text-align: center;

    background: white;

    border-radius: 16px;

    box-shadow:
        0 10px 30px rgba(0, 0, 0, 0.12);
}

h1 {
    margin-top: 0;
}

button {
    padding: 10px 16px;

    border: none;
    border-radius: 8px;

    background: #2563eb;
    color: white;

    cursor: pointer;
}

button:hover {
    background: #1d4ed8;
}`,

  js: `console.log("Buildzen preview loaded.");

const button = document.querySelector("#helloBtn");

button.addEventListener("click", () => {
    console.log("Button clicked!");

    alert("Hello from Buildzen!");
});`

};


/* =========================
   DOM
   ========================= */

const htmlEditorElement =
  document.getElementById("htmlEditor");

const cssEditorElement =
  document.getElementById("cssEditor");

const jsEditorElement =
  document.getElementById("jsEditor");

const preview =
  document.getElementById("preview");

const statusElement =
  document.getElementById("status");

const cursorInfo =
  document.getElementById("cursorInfo");

const fileName =
  document.getElementById("fileName");

const languageInfo =
  document.getElementById("languageInfo");

const resetBtn =
  document.getElementById("resetBtn");

const refreshBtn =
  document.getElementById("refreshBtn");

const clearConsoleBtn =
  document.getElementById("clearConsoleBtn");

const consoleOutput =
  document.getElementById("consoleOutput");

const consoleCount =
  document.getElementById("consoleCount");

const tabs =
  document.querySelectorAll(".tab");

const consoleFilters =
  document.querySelectorAll(".console-filter");


/* =========================
   CONSOLE STATE
   ========================= */

let consoleMessages = [];

let consoleFilter = "all";


/* =========================
   CONSOLE VALUE FORMATTER
   ========================= */

function formatConsoleValue(value) {

  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }


  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }


  if (typeof value === "object") {

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


/* =========================
   ADD CONSOLE MESSAGE
   ========================= */

function addConsoleMessage(
  type,
  message
) {

  consoleMessages.push({

    type,

    message,

    time: new Date().toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    )

  });

  renderConsole();
}


/* =========================
   RENDER CONSOLE
   ========================= */

function renderConsole() {

  consoleOutput.innerHTML = "";


  const filteredMessages =
    consoleMessages.filter(message => {

      if (consoleFilter === "all") {
        return true;
      }

      return message.type === consoleFilter;

    });


  if (filteredMessages.length === 0) {

    const empty =
      document.createElement("div");

    empty.className =
      "console-empty";

    empty.textContent =
      consoleMessages.length === 0
        ? "Console is empty."
        : "No messages match this filter.";

    consoleOutput.appendChild(empty);

  }


  for (const message of filteredMessages) {

    const entry =
      document.createElement("div");

    entry.className =
      `console-entry ${message.type}`;


    const time =
      document.createElement("div");

    time.className =
      "console-time";

    time.textContent =
      message.time;


    const level =
      document.createElement("div");

    level.className =
      "console-level";

    level.textContent =
      message.type.toUpperCase();


    const content =
      document.createElement("div");

    content.className =
      "console-message";

    content.textContent =
      message.message;


    entry.appendChild(time);
    entry.appendChild(level);
    entry.appendChild(content);

    consoleOutput.appendChild(entry);
  }


  consoleCount.textContent =
    `(${consoleMessages.length})`;


  consoleOutput.scrollTop =
    consoleOutput.scrollHeight;
}


/* =========================
   CLEAR CONSOLE
   ========================= */

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

        if (value === null) {
            return "null";
        }

        if (value === undefined) {
            return "undefined";
        }


        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint"
        ) {
            return String(value);
        }


        if (typeof value === "object") {

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


    const originalLog =
        console.log;

    const originalInfo =
        console.info;

    const originalWarn =
        console.warn;

    const originalError =
        console.error;


    console.log = (...args) => {

        originalLog(...args);

        send("log", args);

    };


    console.info = (...args) => {

        originalInfo(...args);

        send("info", args);

    };


    console.warn = (...args) => {

        originalWarn(...args);

        send("warn", args);

    };


    console.error = (...args) => {

        originalError(...args);

        send("error", args);

    };


    window.addEventListener(
        "error",
        event => {

            send("error", [
                event.message ||
                "Unknown JavaScript error"
            ]);

        }
    );


    window.addEventListener(
        "unhandledrejection",
        event => {

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

function setStatus(text) {

  statusElement.innerHTML = `
        <span class="status-dot"></span>
        ${text}
    `;

}


/* =========================
   EDITOR INFO
   ========================= */

let activeEditorName = "html";


function updateEditorInfo(view) {

  const position =
    view.state.selection.main.head;

  const line =
    view.state.doc.lineAt(position);

  const column =
    position - line.from + 1;


  cursorInfo.textContent =
    `Ln ${line.number}, Col ${column}`;
}


/* =========================
   LOAD PROJECT
   ========================= */

function loadProject() {

  const saved =
    localStorage.getItem(
      "buildzen-project"
    );


  if (!saved) {
    return starterProject;
  }


  try {

    const project =
      JSON.parse(saved);


    return {

      html:
        project.html ??
        starterProject.html,

      css:
        project.css ??
        starterProject.css,

      js:
        project.js ??
        starterProject.js

    };

  } catch {

    return starterProject;

  }

}


/* =========================
   SAVE PROJECT
   ========================= */

function saveProject() {

  const project = {

    html:
      editors.html.state.doc.toString(),

    css:
      editors.css.state.doc.toString(),

    js:
      editors.js.state.doc.toString()

  };


  localStorage.setItem(
    "buildzen-project",
    JSON.stringify(project)
  );


  setStatus("Saved");


  setTimeout(() => {

    setStatus("Live");

  }, 800);

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


  preview.srcdoc =
    srcdoc;


  setStatus("Live");

}


/* =========================
   KEYMAP
   ========================= */

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


/* =========================
   CREATE EDITOR
   ========================= */

function createEditor({
  parent,
  value,
  language
}) {

  let languageExtension;


  if (language === "html") {

    languageExtension =
      html();

  }


  if (language === "css") {

    languageExtension =
      css();

  }


  if (language === "javascript") {

    languageExtension =
      javascript();

  }


  return new EditorView({

    state: EditorState.create({

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
              update.docChanged ||
              update.selectionSet
            ) {

              updateEditorInfo(
                update.view
              );

            }


            if (
              update.docChanged
            ) {

              updatePreview();

              setStatus("Live");

            }

          }
        )

      ]

    }),

    parent

  });

}


/* =========================
   CREATE ALL EDITORS
   ========================= */

const project =
  loadProject();


const editors = {

  html: createEditor({

    parent:
      htmlEditorElement,

    value:
      project.html,

    language:
      "html"

  }),


  css: createEditor({

    parent:
      cssEditorElement,

    value:
      project.css,

    language:
      "css"

  }),


  js: createEditor({

    parent:
      jsEditorElement,

    value:
      project.js,

    language:
      "javascript"

  })

};


/* =========================
   SWITCH EDITOR TAB
   ========================= */

function switchEditor(name) {

  activeEditorName =
    name;


  document
    .querySelectorAll(".editor")
    .forEach(editor => {

      editor.classList.remove(
        "active-editor"
      );

    });


  document
    .getElementById(
      `${name}Editor`
    )
    .classList.add(
      "active-editor"
    );


  tabs.forEach(tab => {

    tab.classList.toggle(
      "active",
      tab.dataset.editor === name
    );

  });


  const info = {

    html: {

      file:
        "index.html",

      language:
        "HTML"

    },

    css: {

      file:
        "style.css",

      language:
        "CSS"

    },

    js: {

      file:
        "script.js",

      language:
        "JavaScript"

    }

  };


  fileName.textContent =
    info[name].file;


  languageInfo.textContent =
    info[name].language;


  const editor =
    editors[name];


  editor.requestMeasure();

  editor.focus();

  updateEditorInfo(editor);

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
   CONSOLE FILTERS
   ========================= */

consoleFilters.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      consoleFilters.forEach(
        other => {

          other.classList.remove(
            "active"
          );

        }
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


/* =========================
   BUTTON EVENTS
   ========================= */

refreshBtn.addEventListener(
  "click",
  updatePreview
);


clearConsoleBtn.addEventListener(
  "click",
  clearConsole
);


resetBtn.addEventListener(
  "click",
  () => {

    editors.html.dispatch({

      changes: {

        from: 0,

        to:
          editors.html.state.doc.length,

        insert:
          starterProject.html

      }

    });


    editors.css.dispatch({

      changes: {

        from: 0,

        to:
          editors.css.state.doc.length,

        insert:
          starterProject.css

      }

    });


    editors.js.dispatch({

      changes: {

        from: 0,

        to:
          editors.js.state.doc.length,

        insert:
          starterProject.js

      }

    });


    localStorage.removeItem(
      "buildzen-project"
    );


    clearConsole();

    updatePreview();

    setStatus("Reset");


    setTimeout(() => {

      setStatus("Live");

    }, 800);

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


    if (
      !event.data ||
      event.data.source !==
      "buildzen-preview"
    ) {
      return;
    }


    addConsoleMessage(

      event.data.type ||
      "log",

      event.data.message ||
      ""

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