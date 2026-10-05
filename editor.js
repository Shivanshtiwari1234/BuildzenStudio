import {
    EditorState
} from "https://esm.sh/@codemirror/state@6.5.2";

import {
    EditorView,
    keymap
} from "https://esm.sh/@codemirror/view@6.43.13?deps=@codemirror%2Fstate@6.5.2";

import {
    basicSetup
} from "https://esm.sh/codemirror@6.0.1?deps=@codemirror%2Fstate@6.5.2";

import {
    html
} from "https://esm.sh/@codemirror/lang-html@6.4.9?deps=@codemirror%2Fstate@6.5.2";

import {
    css
} from "https://esm.sh/@codemirror/lang-css@6.3.1?deps=@codemirror%2Fstate@6.5.2";

import {
    javascript
} from "https://esm.sh/@codemirror/lang-javascript@6.2.3?deps=@codemirror%2Fstate@6.5.2";

import {
    oneDark
} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2?deps=@codemirror%2Fstate@6.5.2";

import {
    syntaxHighlighting
} from "https://esm.sh/@codemirror/language@6.12.4?deps=@codemirror%2Fstate@6.5.2";

import {
    classHighlighter
} from "https://esm.sh/@lezer/highlight@1.2.5?target=es2022";

import {
    indentWithTab
} from "https://esm.sh/@codemirror/commands@6.11.1?deps=@codemirror%2Fstate@6.5.2";


const editorContainer = document.getElementById("editorContainer");
const cursorInfo = document.getElementById("cursorInfo");
const fileName = document.getElementById("fileName");
const languageInfo = document.getElementById("languageInfo");


export const editors = {};

let activeEditor = null;


const languageMap = {
    html: {
        name: "HTML",
        extension: html
    },

    htm: {
        name: "HTML",
        extension: html
    },

    css: {
        name: "CSS",
        extension: css
    },

    js: {
        name: "JavaScript",
        extension: javascript
    },

    mjs: {
        name: "JavaScript",
        extension: javascript
    }
};


function getLanguage(filename) {

    const extension = filename
        .split(".")
        .pop()
        .toLowerCase();

    return languageMap[extension] || {
        name: "Plain Text",
        extension: []
    };
}


function updateEditorInfo(view) {

    if (!view) {
        return;
    }

    const position = view.state.selection.main.head;

    const line = view.state.doc.lineAt(position);

    const lineNumber = line.number;

    const column = position - line.from + 1;

    cursorInfo.textContent =
        `Ln ${lineNumber}, Col ${column}`;
}


function buildzenKeymap() {

    return keymap.of([

        indentWithTab,

        {
            key: "Mod-s",

            run() {

                window.dispatchEvent(
                    new CustomEvent("buildzen-save")
                );

                return true;
            }
        },

        {
            key: "Mod-Enter",

            run() {

                window.dispatchEvent(
                    new CustomEvent("buildzen-refresh")
                );

                return true;
            }
        }

    ]);
}


function createEditor(file) {

    const container = document.createElement("div");

    container.className = "editor";

    container.dataset.fileId = file.id;

    editorContainer.appendChild(container);


    const language = getLanguage(file.name);


    const state = EditorState.create({

        doc: file.content || "",

        extensions: [

            basicSetup,

            language.extension,

            oneDark,

            syntaxHighlighting(classHighlighter),

            buildzenKeymap(),

            EditorView.updateListener.of(update => {

                if (update.docChanged) {

                    window.dispatchEvent(
                        new CustomEvent("buildzen-edit", {
                            detail: {
                                fileId: file.id,
                                content: update.state.doc.toString()
                            }
                        })
                    );

                }

                if (
                    update.selectionSet ||
                    update.docChanged
                ) {

                    if (
                        activeEditor &&
                        activeEditor.state === update.state
                    ) {
                        updateEditorInfo(activeEditor);
                    }

                }

            })

        ]

    });


    const view = new EditorView({

        state,

        parent: container

    });


    editors[file.id] = view;

    return view;
}


export function initializeEditors(files) {

    editorContainer.innerHTML = "";

    Object.keys(editors).forEach(id => {
        delete editors[id];
    });


    for (const file of files) {

        createEditor(file);

    }


    if (files.length > 0) {

        switchEditor(files[0].id);

    }

}


export function addEditor(file) {

    return createEditor(file);

}


export function removeEditor(fileId) {

    const editor = editors[fileId];

    if (!editor) {
        return;
    }

    const element = editor.dom;

    editor.destroy();

    if (element.parentElement) {
        element.parentElement.remove();
    }

    delete editors[fileId];

}


export function switchEditor(fileId) {

    const editor = editors[fileId];

    if (!editor) {
        return;
    }


    activeEditor = editor;


    Object.entries(editors).forEach(
        ([id, view]) => {

            const active = id === fileId;

            view.dom.classList.toggle(
                "active-editor",
                active
            );

        }
    );


    const currentFile =
        window.buildzenFiles?.find(
            file => file.id === fileId
        );


    if (currentFile) {

        const language =
            getLanguage(currentFile.name);

        fileName.textContent =
            currentFile.name;

        languageInfo.textContent =
            language.name;

    }


    updateEditorInfo(editor);

    editor.focus();

}


export function getEditorContent(fileId) {

    const editor = editors[fileId];

    if (!editor) {
        return "";
    }

    return editor.state.doc.toString();

}


export function getAllEditorContent() {

    const result = {};

    Object.keys(editors).forEach(id => {

        result[id] =
            editors[id].state.doc.toString();

    });

    return result;

}


export function setEditorContent(fileId, content) {

    const editor = editors[fileId];

    if (!editor) {
        return;
    }

    editor.dispatch({

        changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: content
        }

    });

}