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
    syntaxHighlighting
} from "@codemirror/language";

import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
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

function createEditor(file) {
    if (!editorContainer) {
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

    editorContainer.appendChild(
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


    editors[file.id] =
        view;

    return view;
}


/* ---------------------------------
   Initialize editors
--------------------------------- */

export function initializeEditors(files) {
    if (!editorContainer) {
        return;
    }

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
     * instance globally so assets.js
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


/*
 * Expose the getter globally.
 *
 * This allows modules that cannot
 * directly import editor.js to get
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