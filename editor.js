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


const htmlEditorElement =
    document.querySelector("#htmlEditor");

const cssEditorElement =
    document.querySelector("#cssEditor");

const jsEditorElement =
    document.querySelector("#jsEditor");

const cursorInfo =
    document.querySelector("#cursorInfo");

const fileName =
    document.querySelector("#fileName");

const languageInfo =
    document.querySelector("#languageInfo");

const fileItems =
    document.querySelectorAll(".file-item");


export const editorDetails = {
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


export const editors = {};


let activeEditor = "html";


function updateEditorInfo(view, language) {
    const selection =
        view.state.selection.main;

    const line =
        view.state.doc.lineAt(
            selection.head
        );

    const column =
        selection.head -
        line.from +
        1;

    cursorInfo.textContent =
        `Ln ${line.number}, Col ${column}`;

    languageInfo.textContent =
        language.toUpperCase();
}


const buildzenKeymap = keymap.of([

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


function createEditor(
    parent,
    value,
    languageExtension,
    languageName,
    editorName
) {
    const state =
        EditorState.create({

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

                        if (
                            update.docChanged
                        ) {
                            window.dispatchEvent(
                                new CustomEvent(
                                    "buildzen-edit"
                                )
                            );
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


export function initializeEditors(project) {

    editors.html =
        createEditor(
            htmlEditorElement,
            project.html,
            html(),
            "HTML",
            "html"
        );


    editors.css =
        createEditor(
            cssEditorElement,
            project.css,
            css(),
            "CSS",
            "css"
        );


    editors.js =
        createEditor(
            jsEditorElement,
            project.js,
            javascript(),
            "JavaScript",
            "js"
        );


    switchEditor("html");
}


export function getProjectCode() {
    return {
        html:
            editors.html.state.doc.toString(),

        css:
            editors.css.state.doc.toString(),

        js:
            editors.js.state.doc.toString()
    };
}


export function setProjectCode(project) {

    editors.html.dispatch({
        changes: {
            from: 0,
            to: editors.html.state.doc.length,
            insert: project.html
        }
    });


    editors.css.dispatch({
        changes: {
            from: 0,
            to: editors.css.state.doc.length,
            insert: project.css
        }
    });


    editors.js.dispatch({
        changes: {
            from: 0,
            to: editors.js.state.doc.length,
            insert: project.js
        }
    });
}


export function switchEditor(name) {

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


    fileItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.file === name
        );

    });


    const details =
        editorDetails[name];


    fileName.textContent =
        details.file;

    languageInfo.textContent =
        details.language;


    updateEditorInfo(
        editors[name],
        details.language
    );


    editors[name].focus();
}


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