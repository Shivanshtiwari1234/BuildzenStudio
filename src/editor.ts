import { EditorState } from "@codemirror/state";

import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    highlightSpecialChars
} from "@codemirror/view";

import {
    history,
    historyKeymap,
    indentWithTab
} from "@codemirror/commands";

import {
    bracketMatching,
    syntaxHighlighting
} from "@codemirror/language";

import { closeBrackets } from "@codemirror/autocomplete";
import { openSearchPanel, searchKeymap } from "@codemirror/search";

import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import { classHighlighter } from "@lezer/highlight";


const editorContainer =
    document.getElementById(
        "editorContainer"
    );

const cursorInfo =
    document.getElementById(
        "cursorInfo"
    );

const fileName =
    document.getElementById(
        "fileName"
    );

const languageInfo =
    document.getElementById(
        "languageInfo"
    );


export const editors = {};

let activeEditor = null;
let splitEditor = null;
let syncingEditors = false;


/* ---------------------------------
   Language configuration
--------------------------------- */

const languageMap = {
    html: {
        name: "HTML",
        extension: html()
    },

    htm: {
        name: "HTML",
        extension: html()
    },

    css: {
        name: "CSS",
        extension: css()
    },

    js: {
        name: "JavaScript",
        extension: javascript()
    },

    mjs: {
        name: "JavaScript",
        extension: javascript()
    },

    cjs: {
        name: "JavaScript",
        extension: javascript()
    },

    jsx: {
        name: "JSX",
        extension: javascript({ jsx: true })
    },

    ts: {
        name: "TypeScript",
        extension: javascript({ typescript: true })
    },

    mts: {
        name: "TypeScript",
        extension: javascript({ typescript: true })
    },

    cts: {
        name: "TypeScript",
        extension: javascript({ typescript: true })
    },

    tsx: {
        name: "TypeScript JSX",
        extension: javascript({ typescript: true, jsx: true })
    },

    json: {
        name: "JSON",
        extension: json()
    },

    xml: {
        name: "XML",
        extension: xml()
    },

    svg: {
        name: "XML",
        extension: xml()
    },

    md: {
        name: "Markdown",
        extension: markdown()
    },

    markdown: {
        name: "Markdown",
        extension: markdown()
    },

    py: {
        name: "Python",
        extension: python()
    },

    python: {
        name: "Python",
        extension: python()
    },

    yaml: {
        name: "YAML",
        extension: yaml()
    },

    yml: {
        name: "YAML",
        extension: yaml()
    },

    sql: {
        name: "SQL",
        extension: sql()
    }
};


function getLanguage(filename) {
    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();

    return (
        languageMap[extension] || {
            name: "Plain Text",
            extension: []
        }
    );
}


/* ---------------------------------
   Editor information
--------------------------------- */

function updateEditorInfo(view) {
    if (!view || !cursorInfo) {
        return;
    }

    const position =
        view.state.selection.main.head;

    const line =
        view.state.doc.lineAt(
            position
        );

    cursorInfo.textContent =
        `Ln ${line.number}, Col ${position - line.from + 1}`;
}


/* ---------------------------------
   Buildzen keybindings
--------------------------------- */

function buildzenKeymap() {
    return keymap.of([
        indentWithTab,

        ...searchKeymap,

        {
            key: "Mod-s",

            run() {
                window.dispatchEvent(
                    new CustomEvent(
                        "buildzen-save"
                    )
                );

                return true;
            }
        },

        {
            key: "Mod-f",

            run(view) {
                openSearchPanel(view);
                return true;
            }
        },

        {
            key: "Shift-Alt-f",

            run(view) {
                const fileElement =
                    view.dom.closest(".editor");

                const fileId =
                    fileElement?.dataset.fileId;

                if (fileId) {
                    window.dispatchEvent(
                        new CustomEvent(
                            "buildzen-format-document",
                            {
                                detail: {
                                    fileId
                                }
                            }
                        )
                    );
                }

                return true;
            }
        },

        {
            key: "Mod-Enter",

            run() {
                window.dispatchEvent(
                    new CustomEvent(
                        "buildzen-refresh"
                    )
                );

                return true;
            }
        }
    ]);
}


/* ---------------------------------
   Create editor
--------------------------------- */

function createEditor(file, parent = editorContainer, register = true) {
    if (!parent) {
        throw new Error(
            "Buildzen editor container was not found."
        );
    }

    const container =
        document.createElement(
            "div"
        );

    container.className =
        "editor";

    container.dataset.fileId =
        file.id;

    parent.appendChild(
        container
    );


    const language =
        getLanguage(
            file.name
        );


    const state =
        EditorState.create({
            doc: file.content || "",

            extensions: [

                /* Editor UI */

                lineNumbers(),

                highlightActiveLineGutter(),

                highlightSpecialChars(),

                bracketMatching(),

                closeBrackets(),

                highlightActiveLine(),

                drawSelection(),

                dropCursor(),

                rectangularSelection(),

                crosshairCursor(),


                /* Editing */

                history(),

                keymap.of(
                    historyKeymap
                ),

                buildzenKeymap(),


                /* Language */

                language.extension,


                /* Theme */

                oneDark,

                syntaxHighlighting(
                    classHighlighter
                ),


                /* Buildzen events */

                EditorView.updateListener.of(
                    update => {

                        if (
                            update.docChanged
                        ) {
                            const sourceView = update.view;
                            const peerView = sourceView === splitEditor
                                ? editors[file.id]
                                : splitEditor?.dom.dataset.fileId === file.id
                                    ? splitEditor
                                    : null;

                            if (peerView && !syncingEditors) {
                                syncingEditors = true;
                                try {
                                    peerView.dispatch({ changes: update.changes });
                                } finally {
                                    syncingEditors = false;
                                }
                            }

                            window.dispatchEvent(
                                new CustomEvent(
                                    "buildzen-edit",
                                    {
                                        detail: {
                                            fileId:
                                                file.id,

                                            content:
                                                update.state.doc.toString()
                                        }
                                    }
                                )
                            );
                        }


                        if (
                            update.selectionSet ||
                            update.docChanged
                        ) {
                            if (
                                activeEditor &&
                                activeEditor.state ===
                                update.state
                            ) {
                                updateEditorInfo(
                                    activeEditor
                                );
                            }
                        }
                    }
                )
            ]
        });


    const view =
        new EditorView({
            state,
            parent: container
        });

    view.dom.addEventListener("focusin", () => {
        activeEditor = view;
        window.buildzenActiveEditor = view;
        updateEditorInfo(view);
    });


    if (register) {
        editors[file.id] = view;
    }

    return view;
}


export function destroySplitEditor() {
    if (!splitEditor) return;

    splitEditor.destroy();
    splitEditor.dom.parentElement?.remove();
    splitEditor = null;
}


export function createSplitEditor(fileId, parent) {
    const file = window.buildzenFiles?.find(item => item.id === fileId);
    const primary = editors[fileId];
    if (!file || !primary || !parent) return null;

    destroySplitEditor();

    splitEditor = createEditor({
        ...file,
        content: primary.state.doc.toString()
    }, parent, false);

    splitEditor.dom.dataset.fileId = fileId;
    splitEditor.dom.parentElement.classList.add("active-editor");
    return splitEditor;
}


/* ---------------------------------
   Initialize editors
--------------------------------- */

export function initializeEditors(files) {
    if (!editorContainer) {
        return;
    }

    destroySplitEditor();

    editorContainer.innerHTML =
        "";

    Object.keys(editors).forEach(
        id => {
            delete editors[id];
        }
    );

    activeEditor =
        null;

    window.buildzenActiveEditor =
        null;

    for (const file of files) {
        createEditor(file);
    }

    if (files.length > 0) {
        switchEditor(
            files[0].id
        );
    }
}


/* ---------------------------------
   Add editor
--------------------------------- */

export function addEditor(file) {
    return createEditor(file);
}


/* ---------------------------------
   Remove editor
--------------------------------- */

export function removeEditor(fileId) {
    const editor =
        editors[fileId];

    if (!editor) {
        return;
    }

    const element =
        editor.dom;

    const wasActive =
        activeEditor === editor;

    editor.destroy();

    if (
        element.parentElement
    ) {
        element.parentElement.remove();
    }

    delete editors[fileId];

    if (wasActive) {
        activeEditor =
            null;

        window.buildzenActiveEditor =
            null;
    }
}


/* ---------------------------------
   Switch active editor
--------------------------------- */

export function switchEditor(fileId) {
    const editor =
        editors[fileId];

    if (!editor) {
        return;
    }

    activeEditor =
        editor;

    /*
     * Expose the active CodeMirror
    * instance globally so assets.ts
     * and other Buildzen modules can
     * interact with it.
     */

    window.buildzenActiveEditor =
        editor;


    Object.entries(
        editors
    ).forEach(
        ([id, view]) => {

            const container =
                view.dom.parentElement;

            if (!container) {
                return;
            }

            container.classList.toggle(
                "active-editor",
                id === fileId
            );
        }
    );


    const currentFile =
        window.buildzenFiles?.find(
            file =>
                file.id === fileId
        );


    if (currentFile) {
        const language =
            getLanguage(
                currentFile.name
            );

        if (fileName) {
            fileName.textContent =
                currentFile.name;
        }

        if (languageInfo) {
            languageInfo.textContent =
                language.name;
        }
    }


    updateEditorInfo(
        editor
    );

    editor.focus();
}


/* ---------------------------------
   Active editor getter
--------------------------------- */

export function getActiveEditor() {
    return activeEditor;
}

export function getEditorAtCoords(x, y) {
    return [splitEditor, activeEditor].find(view => {
        if (!view) return false;

        const bounds = view.dom.getBoundingClientRect();
        return x >= bounds.left && x <= bounds.right &&
            y >= bounds.top && y <= bounds.bottom;
    }) || null;
}


/*
 * Expose the getter globally.
 *
 * This allows modules that cannot
 * directly import editor.ts to get
 * the active CodeMirror instance.
 */

window.getBuildzenActiveEditor =
    getActiveEditor;


/* ---------------------------------
   Get editor content
--------------------------------- */

export function getEditorContent(
    fileId
) {
    const editor =
        editors[fileId];

    if (!editor) {
        return "";
    }

    return editor.state.doc.toString();
}


/* ---------------------------------
   Get all editor content
--------------------------------- */

export function getAllEditorContent() {
    const result = {};

    Object.keys(
        editors
    ).forEach(
        id => {
            result[id] =
                editors[id]
                    .state
                    .doc
                    .toString();
        }
    );

    return result;
}


/* ---------------------------------
   Set editor content
--------------------------------- */

export function setEditorContent(
    fileId,
    content
) {
    const editor =
        editors[fileId];

    if (!editor) {
        return;
    }

    editor.dispatch({
        changes: {
            from: 0,

            to:
                editor.state.doc.length,

            insert:
                content
        }
    });
}