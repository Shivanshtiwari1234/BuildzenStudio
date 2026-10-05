/* =========================
   STARTER CODE
   ========================= */

const starterCode = `<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>My Buildzen Website</title>

  <style>

    body {
      margin: 0;
      min-height: 100vh;

      display: grid;
      place-items: center;

      font-family: system-ui, sans-serif;

      background:
        linear-gradient(
          135deg,
          #f4f1ff,
          #e8f5ff
        );

      color: #20243a;
    }

    .card {
      width: min(90%, 500px);

      padding: 40px;

      text-align: center;

      background: white;

      border-radius: 20px;

      box-shadow:
        0 20px 60px #0002;
    }

    h1 {
      margin-bottom: 10px;
    }

    p {
      color: #697086;

      line-height: 1.7;
    }

    button {
      padding: 12px 20px;

      border: none;
      border-radius: 10px;

      background: #7565ee;
      color: white;

      font-weight: bold;

      cursor: pointer;
    }

    button:hover {
      background: #6252dc;
    }

  </style>

</head>


<body>

  <div class="card">

    <h1>
      Hello from Buildzen!
    </h1>

    <p>
      Edit the code on the left and
      watch this page update instantly.
    </p>

    <button
      onclick="console.log('Button clicked!'); alert('Buildzen works!')"
    >
      Test Button
    </button>

  </div>

</body>

</html>`;


/* =========================
   ELEMENTS
   ========================= */

const code =
    document.getElementById("code");

const preview =
    document.getElementById("preview");

const lineNumbers =
    document.getElementById("lineNumbers");

const lineCount =
    document.getElementById("lineCount");

const previewStatus =
    document.getElementById("previewStatus");

const consoleOutput =
    document.getElementById("consoleOutput");

const clearConsoleButton =
    document.getElementById("clearConsole");


/* =========================
   LINE NUMBERS
   ========================= */

function updateLineNumbers() {

    const lines =
        code.value.split("\n").length;

    let numbers = "";

    for (
        let i = 1;
        i <= lines;
        i++
    ) {

        numbers += i;

        if (i < lines) {
            numbers += "\n";
        }

    }

    lineNumbers.textContent =
        numbers;

    lineCount.textContent =
        lines === 1
            ? "1 line"
            : `${lines} lines`;
}


/* =========================
   CONSOLE
   ========================= */

function clearConsole() {

    consoleOutput.innerHTML = "";

    const empty =
        document.createElement("div");

    empty.className =
        "console-empty";

    empty.textContent =
        "Console cleared.";

    consoleOutput.appendChild(empty);
}


function addConsoleMessage(
    type,
    message
) {

    const empty =
        consoleOutput.querySelector(
            ".console-empty"
        );

    if (empty) {
        empty.remove();
    }


    const line =
        document.createElement("div");

    line.className =
        `console-line console-${type}`;


    const prefixes = {

        log: ">",

        info: "ℹ",

        warn: "⚠",

        error: "✕"

    };


    const prefix =
        prefixes[type] || ">";


    line.textContent =
        `${prefix} ${message}`;


    consoleOutput.appendChild(line);


    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;
}


/* =========================
   CONVERT JS VALUES TO TEXT
   ========================= */

function stringifyValue(value) {

    if (
        typeof value === "object" &&
        value !== null
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


/* =========================
   LIVE PREVIEW
   ========================= */

function updatePreview() {

    clearConsole();

    previewStatus.textContent =
        "Updating...";


    /*
      This script is injected into
      the preview before the user's
      HTML.
  
      It forwards console messages
      back to Buildzen Studio.
    */

    const consoleBridge = `

<script>

(function () {

  function send(type, args) {

    try {

      const message =
        args.map(function (arg) {

          if (
            typeof arg === "object" &&
            arg !== null
          ) {

            try {

              return JSON.stringify(
                arg,
                null,
                2
              );

            } catch {

              return String(arg);

            }

          }

          return String(arg);

        }).join(" ");


      parent.postMessage({

        source:
          "buildzen-preview",

        type:
          type,

        message:
          message

      }, "*");


    } catch (error) {

      parent.postMessage({

        source:
          "buildzen-preview",

        type:
          "error",

        message:
          String(error)

      }, "*");

    }

  }


  /*
    console.log()
  */

  const originalLog =
    console.log;

  console.log =
    function () {

      send(
        "log",
        Array.from(arguments)
      );

      originalLog.apply(
        console,
        arguments
      );

    };


  /*
    console.info()
  */

  const originalInfo =
    console.info;

  console.info =
    function () {

      send(
        "info",
        Array.from(arguments)
      );

      originalInfo.apply(
        console,
        arguments
      );

    };


  /*
    console.warn()
  */

  const originalWarn =
    console.warn;

  console.warn =
    function () {

      send(
        "warn",
        Array.from(arguments)
      );

      originalWarn.apply(
        console,
        arguments
      );

    };


  /*
    console.error()
  */

  const originalError =
    console.error;

  console.error =
    function () {

      send(
        "error",
        Array.from(arguments)
      );

      originalError.apply(
        console,
        arguments
      );

    };


  /*
    JavaScript errors
  */

  window.addEventListener(
    "error",
    function (event) {

      send(
        "error",
        [
          event.message +
          " (" +
          event.lineno +
          ":" +
          event.colno +
          ")"
        ]
      );

    }
  );


  /*
    Unhandled promises
  */

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


    /*
      Run the user's webpage.
    */

    preview.srcdoc =
        consoleBridge +
        code.value;


    setTimeout(
        () => {

            previewStatus.textContent =
                "Up to date";

        },
        100
    );

}


/* =========================
   RECEIVE CONSOLE MESSAGES
   ========================= */

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


        addConsoleMessage(
            event.data.type,
            event.data.message
        );

    }
);


/* =========================
   TYPING
   ========================= */

code.addEventListener(
    "input",
    () => {

        updateLineNumbers();

        updatePreview();

    }
);


/* =========================
   TAB SUPPORT
   ========================= */

code.addEventListener(
    "keydown",
    event => {

        if (event.key === "Tab") {

            event.preventDefault();


            const start =
                code.selectionStart;

            const end =
                code.selectionEnd;


            code.setRangeText(
                "  ",
                start,
                end,
                "end"
            );


            updateLineNumbers();

            updatePreview();

        }

    }
);


/* =========================
   CTRL + ENTER
   ========================= */

code.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            (event.ctrlKey ||
                event.metaKey)
        ) {

            event.preventDefault();

            updatePreview();

        }

    }
);


/* =========================
   EDITOR SCROLL
   ========================= */

code.addEventListener(
    "scroll",
    () => {

        lineNumbers.scrollTop =
            code.scrollTop;

    }
);


/* =========================
   BUTTONS
   ========================= */

document
    .getElementById("runButton")
    .addEventListener(
        "click",
        updatePreview
    );


document
    .getElementById("resetButton")
    .addEventListener(
        "click",
        () => {

            code.value =
                starterCode;

            updateLineNumbers();

            updatePreview();

        }
    );


clearConsoleButton
    .addEventListener(
        "click",
        clearConsole
    );


/* =========================
   INITIALIZE
   ========================= */

code.value =
    starterCode;

updateLineNumbers();

updatePreview();
