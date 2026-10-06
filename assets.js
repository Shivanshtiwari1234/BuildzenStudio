const ASSET_DB_NAME = "buildzen-assets";
const ASSET_DB_VERSION = 1;
const ASSET_STORE = "assets";


const assetTree =
    document.getElementById("assetTree");

const uploadAssetBtn =
    document.getElementById("uploadAssetBtn");

const assetInput =
    document.getElementById("assetInput");


let activePreviewAssetURLs =
    new Map();


/* ================================== */
/* IndexedDB                           */
/* ================================== */

function openAssetDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                ASSET_DB_NAME,
                ASSET_DB_VERSION
            );


        request.onupgradeneeded = event => {

            const db =
                event.target.result;


            if (
                !db.objectStoreNames.contains(
                    ASSET_STORE
                )
            ) {

                db.createObjectStore(
                    ASSET_STORE,
                    {
                        keyPath: "id"
                    }
                );
            }
        };


        request.onsuccess = () => {
            resolve(request.result);
        };


        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* ================================== */
/* Save asset                          */
/* ================================== */

export async function saveAsset(file) {

    const db =
        await openAssetDatabase();


    const asset = {
        id:
            crypto.randomUUID(),

        name:
            file.name,

        type:
            file.type || "application/octet-stream",

        size:
            file.size,

        file,

        createdAt:
            Date.now()
    };


    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                ASSET_STORE,
                "readwrite"
            );


        const store =
            transaction.objectStore(
                ASSET_STORE
            );


        const request =
            store.put(asset);


        request.onsuccess = () => {
            resolve(asset);
        };


        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* ================================== */
/* Get all assets                      */
/* ================================== */

export async function getAllAssets() {

    const db =
        await openAssetDatabase();


    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                ASSET_STORE,
                "readonly"
            );


        const store =
            transaction.objectStore(
                ASSET_STORE
            );


        const request =
            store.getAll();


        request.onsuccess = () => {

            const assets =
                request.result || [];


            assets.sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
            );


            resolve(assets);
        };


        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* ================================== */
/* Delete asset                        */
/* ================================== */

export async function deleteAsset(assetId) {

    const db =
        await openAssetDatabase();


    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                ASSET_STORE,
                "readwrite"
            );


        const store =
            transaction.objectStore(
                ASSET_STORE
            );


        const request =
            store.delete(assetId);


        request.onsuccess = () => {
            resolve();
        };


        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* ================================== */
/* Asset icons                         */
/* ================================== */

function getAssetIcon(asset) {

    const name =
        asset.name.toLowerCase();


    if (
        /\.(png|jpe?g|gif|webp|svg|avif)$/
            .test(name)
    ) {
        return "IMG";
    }


    if (
        /\.(woff2?|ttf|otf)$/
            .test(name)
    ) {
        return "FONT";
    }


    if (
        /\.(mp3|wav|ogg|m4a)$/
            .test(name)
    ) {
        return "AUD";
    }


    if (
        /\.(mp4|webm|mov)$/
            .test(name)
    ) {
        return "VID";
    }


    if (
        /\.(json|xml|txt|csv)$/
            .test(name)
    ) {
        return "FILE";
    }


    return "FILE";
}


/* ================================== */
/* Asset type helpers                  */
/* ================================== */

function isImageAsset(asset) {

    return /\.(png|jpe?g|gif|webp|svg|avif)$/i
        .test(asset.name);
}


function isFontAsset(asset) {

    return /\.(woff2?|ttf|otf)$/i
        .test(asset.name);
}


/* ================================== */
/* Insert asset into editor            */
/* ================================== */

function insertAssetReference(asset) {

    const editor =
        window.getBuildzenActiveEditor?.();


    if (!editor) {

        window.bzAlert?.(
            "Open a file in the editor first.",
            "Insert Asset"
        );

        return;
    }


    const files =
        window.buildzenFiles || [];


    const editorContainer =
        editor.dom?.parentElement;


    const fileId =
        editorContainer?.dataset?.fileId;


    const currentFile =
        files.find(
            file => file.id === fileId
        );


    if (!currentFile) {

        window.bzAlert?.(
            "Could not determine the active file.",
            "Insert Asset"
        );

        return;
    }


    const extension =
        currentFile.name
            .split(".")
            .pop()
            .toLowerCase();


    const filename =
        asset.name;


    let text = "";


    /* ------------------------------ */
    /* HTML                            */
    /* ------------------------------ */

    if (
        extension === "html" ||
        extension === "htm"
    ) {

        if (isImageAsset(asset)) {

            text =
                `<img src="${filename}" alt="">`;

        } else {

            text =
                filename;
        }
    }


    /* ------------------------------ */
    /* CSS                             */
    /* ------------------------------ */

    else if (extension === "css") {

        if (isFontAsset(asset)) {

            text =
                `url("${filename}")`;

        } else {

            text =
                `url("${filename}")`;
        }
    }


    /* ------------------------------ */
    /* JavaScript                      */
    /* ------------------------------ */

    else if (
        extension === "js" ||
        extension === "mjs"
    ) {

        text =
            `"${filename}"`;
    }


    /* ------------------------------ */
    /* Plain text / other              */
    /* ------------------------------ */

    else {

        text =
            filename;
    }


    const position =
        editor.state.selection.main.head;


    editor.dispatch({

        changes: {
            from: position,
            to: position,
            insert: text
        },

        selection: {
            anchor:
                position + text.length
        }
    });


    editor.focus();
}


/* ================================== */
/* Render assets                       */
/* ================================== */

export async function renderAssets() {

    if (!assetTree) return;


    /* -------------------------------- */
    /* Revoke old temporary preview URLs */
    /* -------------------------------- */

    for (
        const url
        of activePreviewAssetURLs.values()
    ) {

        try {
            URL.revokeObjectURL(url);
        } catch { }
    }


    activePreviewAssetURLs.clear();


    const assets =
        await getAllAssets();


    assetTree.innerHTML = "";


    if (assets.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "empty-assets";

        empty.textContent =
            "No assets yet";

        assetTree.appendChild(empty);

        return;
    }


    for (const asset of assets) {

        const row =
            document.createElement("div");

        row.className =
            "asset-item";


        /* ---------------------------- */
        /* Icon                          */
        /* ---------------------------- */

        const icon =
            document.createElement("span");

        icon.className =
            "asset-icon";

        icon.textContent =
            getAssetIcon(asset);


        /* ---------------------------- */
        /* Name                          */
        /* ---------------------------- */

        const name =
            document.createElement("span");

        name.className =
            "asset-name";

        name.textContent =
            asset.name;

        name.title =
            asset.name;


        /* ---------------------------- */
        /* Actions                       */
        /* ---------------------------- */

        const actions =
            document.createElement("div");

        actions.className =
            "asset-actions";


        /* ---------------------------- */
        /* Insert                         */
        /* ---------------------------- */

        const insertButton =
            document.createElement("button");

        insertButton.type =
            "button";

        insertButton.className =
            "asset-action";

        insertButton.textContent =
            "Insert";

        insertButton.title =
            `Insert ${asset.name}`;


        insertButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                insertAssetReference(
                    asset
                );
            }
        );


        /* ---------------------------- */
        /* Copy                           */
        /* ---------------------------- */

        const copyButton =
            document.createElement("button");

        copyButton.type =
            "button";

        copyButton.className =
            "asset-action";

        copyButton.textContent =
            "Copy";

        copyButton.title =
            `Copy URL for ${asset.name}`;


        copyButton.addEventListener(
            "click",
            async event => {

                event.stopPropagation();


                try {

                    const url =
                        URL.createObjectURL(
                            asset.file
                        );


                    await navigator.clipboard
                        .writeText(url);


                    setTimeout(
                        () => {
                            try {
                                URL.revokeObjectURL(
                                    url
                                );
                            } catch { }
                        },
                        30000
                    );


                    console.log(
                        `Copied asset URL for ${asset.name}.`
                    );

                } catch (error) {

                    console.error(
                        "Failed to copy asset URL:",
                        error
                    );
                }
            }
        );


        /* ---------------------------- */
        /* Delete                         */
        /* ---------------------------- */

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "asset-action asset-delete";

        deleteButton.textContent =
            "×";

        deleteButton.title =
            `Delete ${asset.name}`;


        deleteButton.addEventListener(
            "click",
            async event => {

                event.stopPropagation();


                const confirmed =
                    await window.bzConfirm(
                        `Delete "${asset.name}"?`,
                        "Delete Asset",
                        "danger"
                    );


                if (!confirmed) return;


                try {

                    await deleteAsset(
                        asset.id
                    );


                    await renderAssets();


                    window.dispatchEvent(
                        new CustomEvent(
                            "buildzen-assets-changed"
                        )
                    );

                } catch (error) {

                    console.error(
                        "Failed to delete asset:",
                        error
                    );
                }
            }
        );


        actions.appendChild(
            insertButton
        );

        actions.appendChild(
            copyButton
        );

        actions.appendChild(
            deleteButton
        );


        row.appendChild(icon);
        row.appendChild(name);
        row.appendChild(actions);


        assetTree.appendChild(row);
    }
}


/* ================================== */
/* Upload button                       */
/* ================================== */

if (uploadAssetBtn) {

    uploadAssetBtn.addEventListener(
        "click",
        () => {

            assetInput?.click();
        }
    );
}


/* ================================== */
/* File selection                      */
/* ================================== */

if (assetInput) {

    assetInput.addEventListener(
        "change",
        async () => {

            const files =
                Array.from(
                    assetInput.files || []
                );


            if (files.length === 0) {
                return;
            }


            try {

                for (const file of files) {

                    await saveAsset(file);
                }


                await renderAssets();


                window.dispatchEvent(
                    new CustomEvent(
                        "buildzen-assets-changed"
                    )
                );

            } catch (error) {

                console.error(
                    "Failed to save asset:",
                    error
                );

            } finally {

                assetInput.value = "";
            }
        }
    );
}


/* ================================== */
/* Create preview Blob URLs            */
/* ================================== */

export async function createAssetURLs() {

    const assets =
        await getAllAssets();


    const urls =
        new Map();


    for (const asset of assets) {

        if (!asset.file) continue;


        const url =
            URL.createObjectURL(
                asset.file
            );


        urls.set(
            asset.name,
            url
        );
    }


    return urls;
}


/* ================================== */
/* Preview URL lifecycle               */
/* ================================== */

export function revokePreviewAssetURLs() {

    for (
        const url
        of activePreviewAssetURLs.values()
    ) {

        try {
            URL.revokeObjectURL(url);
        } catch { }
    }


    activePreviewAssetURLs.clear();
}


export function setActivePreviewAssetURLs(
    urls
) {

    activePreviewAssetURLs =
        urls;
}


export function revokeAssetURLs(urls) {

    for (
        const url
        of urls.values()
    ) {

        try {
            URL.revokeObjectURL(url);
        } catch { }
    }
}


/* ================================== */
/* URL helpers                         */
/* ================================== */

export function isExternalAssetURL(
    value
) {

    return (
        /^(https?:|data:|blob:|\/\/|#)/i
            .test(value)
    );
}


export function cleanAssetPath(path) {

    return path
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/^\.\/+/, "")
        .replace(/^assets\/+/i, "");
}


/* ================================== */
/* Resolve HTML asset references       */
/* ================================== */

export function resolveAssetReferences(
    html,
    assetURLs
) {

    const parser =
        new DOMParser();


    const document =
        parser.parseFromString(
            html,
            "text/html"
        );


    const attributes = [
        "src",
        "href",
        "poster"
    ];


    for (const attribute of attributes) {

        const elements =
            document.querySelectorAll(
                `[${attribute}]`
            );


        for (const element of elements) {

            const value =
                element.getAttribute(
                    attribute
                );


            if (!value) continue;


            if (
                isExternalAssetURL(value)
            ) {
                continue;
            }


            const cleanPath =
                cleanAssetPath(value);


            const assetURL =
                assetURLs.get(cleanPath);


            if (!assetURL) continue;


            element.setAttribute(
                attribute,
                assetURL
            );
        }
    }


    return (
        "<!DOCTYPE html>\n" +
        document.documentElement.outerHTML
    );
}


/* ================================== */
/* Resolve CSS asset references        */
/* ================================== */

export function resolveCSSAssetReferences(
    css,
    assetURLs
) {

    return css.replace(
        /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,

        (
            match,
            quote,
            path
        ) => {

            if (
                isExternalAssetURL(path)
            ) {
                return match;
            }


            const cleanPath =
                cleanAssetPath(path);


            const assetURL =
                assetURLs.get(cleanPath);


            if (!assetURL) {
                return match;
            }


            return `url("${assetURL}")`;
        }
    );
}