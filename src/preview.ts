import { getEditorContent } from "./editor.ts";

import {
    createAssetURLs,
    revokePreviewAssetURLs,
    setActivePreviewAssetURLs,
    revokeAssetURLs,
    resolveAssetReferences,
    resolveCSSAssetReferences,
    getAllAssets
} from "./assets.ts";


/* =========================================================
   PREVIEW CONTROLLER
   ========================================================= */

export function createPreviewController({
    preview,
    status,
    previewStatus,
    getFiles
}) {

    let previewBuildId = 0;
    let currentPreviewDocument = "";
    let currentPreviewLoadId = 0;

    preview.addEventListener("load", () => {
        if (
            !currentPreviewDocument ||
            currentPreviewLoadId !== previewBuildId
        ) {
            return;
        }

        status.classList.remove("updating");

        if (previewStatus) {
            previewStatus.textContent = "Live";
        }
    });


    /* =====================================================
       COLLECT PROJECT CODE
       ===================================================== */

    function collectPreviewCode() {

        const files = getFiles();

        const htmlFile = files.find(file => {

            const extension = file.name
                .split(".")
                .pop()
                .toLowerCase();

            return (
                extension === "html" ||
                extension === "htm"
            );

        });


        let html = "";

        if (htmlFile) {
            html = getEditorContent(htmlFile.id);
        }


        let css = "";
        let js = "";


        for (const file of files) {

            const extension = file.name
                .split(".")
                .pop()
                .toLowerCase();


            if (extension === "css") {

                css +=
                    "\n\n/* " +
                    file.name +
                    " */\n\n";

                css += getEditorContent(file.id);

            }


            if (
                extension === "js" ||
                extension === "mjs" ||
                extension === "cjs"
            ) {

                js +=
                    "\n\n// " +
                    file.name +
                    "\n\n";

                js += getEditorContent(file.id);

            }

        }


        return {
            html,
            css,
            js
        };

    }


    /* =====================================================
       CONSOLE BRIDGE
       ===================================================== */

    function createPreviewBridge() {

        return `
<script>
(function () {

    function send(type, args, location) {

        try {

            parent.postMessage(
                {
                    source: "buildzen-preview",
                    type: type,
                    args: args,
                    location: location || null
                },
                "*"
            );

        } catch (error) {
            // Ignore postMessage failures.
        }

    }


    const originalLog =
        console.log.bind(console);

    const originalInfo =
        console.info.bind(console);

    const originalWarn =
        console.warn.bind(console);

    const originalError =
        console.error.bind(console);


    console.log = function () {

        const args =
            Array.from(arguments);

        send("log", args);

        originalLog.apply(
            console,
            arguments
        );

    };


    console.info = function () {

        const args =
            Array.from(arguments);

        send("info", args);

        originalInfo.apply(
            console,
            arguments
        );

    };


    console.warn = function () {

        const args =
            Array.from(arguments);

        send("warn", args);

        originalWarn.apply(
            console,
            arguments
        );

    };


    console.error = function () {

        const args =
            Array.from(arguments);

        send("error", args);

        originalError.apply(
            console,
            arguments
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
                ],
                {
                    file:
                        event.filename ||
                        "unknown",
                    line:
                        event.lineno || null,
                    column:
                        event.colno || null
                }
            );

        }
    );


    window.addEventListener(
        "unhandledrejection",
        function (event) {

            const reason = event.reason;

            send(
                "error",
                [
                    String(reason)
                ],
                {
                    file: "unhandledrejection",
                    line: null,
                    column: null
                }
            );

        }
    );


})();
<\/script>
`;

    }


    /* =====================================================
       REMOVE DUPLICATE LOCAL RESOURCE REFERENCES
       ===================================================== */

    function removeManagedReferences(
        html,
        files
    ) {

        let result = html;


        for (const file of files) {

            const name =
                file.name.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            /*
             * CSS:
             *
             * <link rel="stylesheet" href="style.css">
             */

            if (extension === "css") {

                const pattern =
                    new RegExp(
                        '<link[^>]+href=["\'](?:\\./)?' +
                        name +
                        '["\'][^>]*>',
                        "gi"
                    );

                result =
                    result.replace(
                        pattern,
                        ""
                    );

            }


            /*
             * JavaScript:
             *
             * <script src="script.js"></script>
             */

            if (
                extension === "js" ||
                extension === "mjs" ||
                extension === "cjs"
            ) {

                const pattern =
                    new RegExp(
                        '<script[^>]+src=["\'](?:\\./)?' +
                        name +
                        '["\'][^>]*>\\s*<\\/script>',
                        "gi"
                    );

                result =
                    result.replace(
                        pattern,
                        ""
                    );

            }

        }


        return result;

    }


    /* =====================================================
       UPDATE PREVIEW
       ===================================================== */

    async function updatePreview() {

        const buildId =
            ++previewBuildId;


        status.classList.add(
            "updating"
        );


        if (previewStatus) {

            previewStatus.textContent =
                "Updating...";

        }


        const {
            html,
            css,
            js
        } =
            collectPreviewCode();


        const files =
            getFiles();


        let assetURLs;


        /* -------------------------------------------------
           Load assets
           ------------------------------------------------- */

        try {

            assetURLs =
                await createAssetURLs();

        } catch (error) {

            console.error(
                "Failed to load preview assets:",
                error
            );

            assetURLs =
                new Map();

        }


        /*
         * Another preview may have been requested while
         * assets were loading.
         */

        if (
            buildId !== previewBuildId
        ) {

            revokeAssetURLs(
                assetURLs
            );

            return;

        }


        /* -------------------------------------------------
           Resolve asset references
           ------------------------------------------------- */

        let resolvedHTML =
            resolveAssetReferences(
                html,
                assetURLs
            );


        resolvedHTML =
            removeManagedReferences(
                resolvedHTML,
                files
            );


        const resolvedCSS =
            resolveCSSAssetReferences(
                css,
                assetURLs
            );


        /* -------------------------------------------------
           Buildzen preview CSS
           ------------------------------------------------- */

        const previewBaseStyle = `
<style id="buildzen-preview-base">

html {
    min-height: 100%;
    overflow-y: auto;
}

body {
    min-height: 100%;
    overflow-y: auto !important;
    overflow-x: auto;
}

</style>
`;


        const projectStyle = `
<style id="buildzen-project-styles">

${resolvedCSS}

</style>
`;


        /* -------------------------------------------------
           Console bridge
           ------------------------------------------------- */

        const bridge =
            createPreviewBridge();


        /* -------------------------------------------------
           Project JavaScript
           ------------------------------------------------- */

        /*
         * Prevent a literal </script> inside user JS from
         * terminating the generated script element.
         */

        const safeJS =
            js.replace(
                /<\/script/gi,
                "<\\/script"
            );


        const projectScript = `
<script id="buildzen-project-script">

${safeJS}

<\/script>
`;


        /* -------------------------------------------------
           Assemble document
           ------------------------------------------------- */

        let finalHTML =
            resolvedHTML;


        if (
            /<\/head>/i.test(
                finalHTML
            )
        ) {

            finalHTML =
                finalHTML.replace(
                    /<\/head>/i,
                    previewBaseStyle +
                    projectStyle +
                    "</head>"
                );

        } else {

            finalHTML =
                previewBaseStyle +
                projectStyle +
                finalHTML;

        }


        if (
            /<\/body>/i.test(
                finalHTML
            )
        ) {

            finalHTML =
                finalHTML.replace(
                    /<\/body>/i,
                    bridge +
                    projectScript +
                    "</body>"
                );

        } else {

            finalHTML +=
                bridge +
                projectScript;

        }


        /* -------------------------------------------------
           Prevent stale preview
           ------------------------------------------------- */

        if (
            buildId !== previewBuildId
        ) {

            revokeAssetURLs(
                assetURLs
            );

            return;

        }


        /* -------------------------------------------------
           Activate assets
           ------------------------------------------------- */

        revokePreviewAssetURLs();

        setActivePreviewAssetURLs(
            assetURLs
        );


        /* -------------------------------------------------
           Load iframe
           ------------------------------------------------- */

        currentPreviewDocument =
            finalHTML;

        currentPreviewLoadId = buildId;
        preview.srcdoc =
            currentPreviewDocument;

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    function reloadPreview() {

        if (!currentPreviewDocument) {
            return;
        }

        status.classList.add("updating");

        if (previewStatus) {
            previewStatus.textContent = "Updating...";
        }

        currentPreviewLoadId = previewBuildId;
        preview.srcdoc =
            currentPreviewDocument;

    }


    function openPreviewWindow() {

        if (!currentPreviewDocument) {
            return;
        }

        const previewBlob =
            new Blob(
                [currentPreviewDocument],
                {
                    type: "text/html"
                }
            );

        const previewUrl =
            URL.createObjectURL(previewBlob);

        const popup =
            window.open(
                previewUrl,
                "_blank",
                "noopener,noreferrer"
            );

        if (popup) {
            popup.focus();
        }

        setTimeout(() => {
            URL.revokeObjectURL(previewUrl);
        }, 10000);

    }


    async function createStandaloneHTML() {

        const { html, css, js } = collectPreviewCode();
        const files = getFiles();
        const assets = await getAllAssets();
        const assetURLs = new Map();

        for (const asset of assets) {
            if (!asset.file) continue;

            const dataURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(asset.file);
            });

            assetURLs.set(asset.name, dataURL);
        }

        let output = resolveAssetReferences(html, assetURLs);
        output = removeManagedReferences(output, files);
        const resolvedCSS = resolveCSSAssetReferences(css, assetURLs);
        const safeJS = js.replace(/<\/script/gi, "<\\/script");
        const style = `<style>\n${resolvedCSS}\n</style>`;
        const script = `<script>\n${safeJS}\n<\/script>`;

        if (/<\/head>/i.test(output)) {
            output = output.replace(/<\/head>/i, `${style}\n</head>`);
        } else {
            output = `${style}\n${output}`;
        }

        if (/<\/body>/i.test(output)) {
            output = output.replace(/<\/body>/i, `${script}\n</body>`);
        } else {
            output += script;
        }

        return output;
    }


    return {

        updatePreview,

        collectPreviewCode,

        reloadPreview,

        openPreviewWindow,

        createStandaloneHTML

    };

}