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
    document.getElementById("editorContainer");

const cursorInfo =
    document.getElementById("cursorInfo");

const fileName =
    document.getElementById("fileName");

const languageInfo =
    document.getElementById("languageInfo");


export const editors = {};

let activeEditor = null;


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

    return languageMap[extension] || {
        name: "Plain Text",
        extension: []
    };
}


function updateEditorInfo(view) {
    if (!view) return;

    const position =
        view.state.selection.main.head;

    const line =
        view.state.doc.lineAt(position);

    cursorInfo.textContent =
        `Ln ${line.number}, Col ${position - line.from + 1}`;
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
    const container =
        document.createElement("div");

    container.className = "editor";
    container.dataset.fileId = file.id;

    editorContainer.appendChild(container);


    const language =
        getLanguage(file.name);


    const state =
        EditorState.create({
            doc: file.content || "",

            extensions: [

                // Editor UI
                lineNumbers(),

                highlightActiveLineGutter(),

                highlightSpecialChars(),

                highlightActiveLine(),

                drawSelection(),

                dropCursor(),

                rectangularSelection(),

                crosshairCursor(),


                // Editing
                history(),

                keymap.of(historyKeymap),

                buildzenKeymap(),


                // Language
                language.extension,


                // Theme
                oneDark,

                syntaxHighlighting(
                    classHighlighter
                ),


                // Buildzen events
                EditorView.updateListener.of(update => {

                    if (update.docChanged) {

                        window.dispatchEvent(
                            new CustomEvent(
                                "buildzen-edit",
                                {
                                    detail: {
                                        fileId: file.id,

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
                })
            ]
        });


    const view =
        new EditorView({
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

    activeEditor = null;


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

    const editor =
        editors[fileId];

    if (!editor) return;


    const element =
        editor.dom;

    editor.destroy();


    if (element.parentElement) {
        element.parentElement.remove();
    }


    delete editors[fileId];


    if (activeEditor === editor) {
        activeEditor = null;
    }
}


export function switchEditor(fileId) {

    const editor =
        editors[fileId];

    if (!editor) return;


    activeEditor = editor;


    Object.entries(editors).forEach(
        ([id, view]) => {

            const container =
                view.dom.parentElement;

            if (!container) return;

            container.classList.toggle(
                "active-editor",
                id === fileId
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


export function getActiveEditor() {
    return activeEditor;
}


export function getEditorContent(fileId) {

    const editor =
        editors[fileId];

    if (!editor) return "";

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


export function setEditorContent(
    fileId,
    content
) {

    const editor =
        editors[fileId];

    if (!editor) return;


    editor.dispatch({
        changes: {
            from: 0,

            to:
                editor.state.doc.length,

            insert: content
        }
    });
}