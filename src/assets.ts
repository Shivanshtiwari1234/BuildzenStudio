const ASSET_DB_NAME = "buildzen-assets";
const ASSET_DB_VERSION = 1;
const ASSET_STORE = "assets";

const assetTree =
    document.getElementById("assetTree");

const uploadAssetBtn =
    document.getElementById("uploadAssetBtn");

const assetInput =
    document.getElementById("assetInput");

let activePreviewAssetURLs = new Map();

let lastActiveEditor = null;


/* ---------------------------------
   Active editor tracking
--------------------------------- */

function getBuildzenEditor() {
    const editor =
        window.buildzenActiveEditor ||
        window.getBuildzenActiveEditor?.();

    if (editor) {
        lastActiveEditor = editor;
        return editor;
    }

    return lastActiveEditor;
}


/* ---------------------------------
   IndexedDB
--------------------------------- */

function openAssetDatabase() {
    return new Promise((resolve, reject) => {
        const request =
            indexedDB.open(
                ASSET_DB_NAME,
                ASSET_DB_VERSION
            );

        request.onupgradeneeded = event => {
            const db = event.target.result;

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
            const db = request.result;

            db.onversionchange = () => {
                db.close();
            };

            resolve(db);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


export async function saveAsset(file) {
    if (!(file instanceof File)) {
        throw new TypeError(
            "saveAsset() expects a File object."
        );
    }

    const db =
        await openAssetDatabase();

    const extensionIndex = file.name.lastIndexOf(".");
    const baseName = extensionIndex > 0
        ? file.name.slice(0, extensionIndex)
        : file.name;
    const extension = extensionIndex > 0
        ? file.name.slice(extensionIndex)
        : "";
    let asset;

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

        const request = store.getAll();

        request.onsuccess = () => {
            const existingNames = new Set(
                request.result.map(existing => existing.name.toLowerCase())
            );
            let name = file.name;
            let suffix = 1;

            while (existingNames.has(name.toLowerCase())) {
                suffix += 1;
                name = `${baseName}-${suffix}${extension}`;
            }

            asset = {
                id: crypto.randomUUID(),
                name,
                type: file.type || "application/octet-stream",
                size: file.size,
                file,
                createdAt: Date.now()
            };

            store.add(asset);
        };

        transaction.oncomplete = () => {
            resolve(asset);
        };

        transaction.onerror = () => {
            reject(transaction.error || new Error("Asset transaction failed."));
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error("Asset transaction aborted.")
            );
        };
    });
}


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

            assets.sort((a, b) =>
                a.name.localeCompare(
                    b.name,
                    undefined,
                    {
                        sensitivity: "base"
                    }
                )
            );

            resolve(assets);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


export async function deleteAsset(assetId) {
    if (!assetId) {
        throw new Error(
            "An asset ID is required."
        );
    }

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


/* ---------------------------------
   Asset helpers
--------------------------------- */

function getAssetIcon(asset) {
    const name =
        asset.name.toLowerCase();

    if (
        /\.(png|jpe?g|gif|webp|svg|avif)$/.test(
            name
        )
    ) {
        return "IMG";
    }

    if (
        /\.(woff2?|ttf|otf)$/.test(
            name
        )
    ) {
        return "FONT";
    }

    if (
        /\.(mp3|wav|ogg|m4a)$/.test(
            name
        )
    ) {
        return "AUD";
    }

    if (
        /\.(mp4|webm|mov)$/.test(
            name
        )
    ) {
        return "VID";
    }

    if (
        /\.(json|xml|txt|csv)$/.test(
            name
        )
    ) {
        return "FILE";
    }

    return "FILE";
}


function isImageAsset(asset) {
    return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(
        asset.name
    );
}


function isFontAsset(asset) {
    return /\.(woff2?|ttf|otf)$/i.test(
        asset.name
    );
}


function encodeAssetPath(name) {
    return encodeURIComponent(name);
}


/* ---------------------------------
   Insert asset reference
--------------------------------- */

function insertAssetReference(asset) {
    const editor =
        getBuildzenEditor();

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

    if (
        extension === "html" ||
        extension === "htm"
    ) {
        if (isImageAsset(asset)) {
            text =
                `<img src="${encodeAssetPath(filename)}" alt="">`;
        } else {
            text =
                filename;
        }
    } else if (extension === "css") {
        if (isFontAsset(asset)) {
            const fontFamily = filename
                .replace(/\.[^.]+$/, "")
                .replace(/["\\]/g, "\\$&");
            const format = /\.woff2?$/i.test(filename)
                ? "woff2"
                : /\.ttf$/i.test(filename)
                    ? "truetype"
                    : /\.otf$/i.test(filename)
                        ? "opentype"
                        : "woff";

            text = `@font-face {\n    font-family: "${fontFamily}";\n    src: url("${encodeAssetPath(filename)}") format("${format}");\n    font-style: normal;\n    font-weight: 100 900;\n    font-display: swap;\n}`;
        } else {
            text = `url("${encodeAssetPath(filename)}")`;
        }
    } else if (
        extension === "js" ||
        extension === "mjs"
    ) {
        text =
            `"${filename}"`;
    } else {
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
        },

        scrollIntoView: true
    });

    editor.focus();
}


/* ---------------------------------
   Render assets
--------------------------------- */

export async function renderAssets() {
    if (!assetTree) {
        return;
    }

    for (
        const url of
        activePreviewAssetURLs.values()
    ) {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignore already-revoked URLs.
        }
    }

    activePreviewAssetURLs.clear();

    let assets;

    try {
        assets =
            await getAllAssets();
    } catch (error) {
        console.error(
            "Failed to load assets:",
            error
        );

        assetTree.innerHTML = "";

        const errorElement =
            document.createElement("div");

        errorElement.className =
            "empty-assets";

        errorElement.textContent =
            "Failed to load assets";

        assetTree.appendChild(
            errorElement
        );

        return;
    }

    assetTree.innerHTML = "";

    if (assets.length === 0) {
        const empty =
            document.createElement("div");

        empty.className =
            "empty-assets";

        empty.textContent =
            "No assets yet";

        assetTree.appendChild(
            empty
        );

        return;
    }

    for (const asset of assets) {
        const row =
            document.createElement("div");

        row.className =
            "asset-item";

        const icon =
            document.createElement("span");

        icon.className =
            "asset-icon";

        icon.textContent =
            getAssetIcon(asset);

        const name =
            document.createElement("span");

        name.className =
            "asset-name";

        name.textContent =
            asset.name;

        name.title =
            asset.name;

        const actions =
            document.createElement("div");

        actions.className =
            "asset-actions";


        /* Insert */

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


        /*
         * Prevent the asset button from
         * stealing focus from CodeMirror.
         *
         * This is important because the
         * CodeMirror selection/cursor is
         * what determines the insertion point.
         */

        insertButton.addEventListener(
            "mousedown",
            event => {
                event.preventDefault();

                const editor =
                    window.buildzenActiveEditor ||
                    window.getBuildzenActiveEditor?.();

                if (editor) {
                    lastActiveEditor =
                        editor;
                }
            }
        );


        insertButton.addEventListener(
            "click",
            event => {
                event.stopPropagation();

                insertAssetReference(
                    asset
                );
            }
        );


        /* Copy */

        const copyButton =
            document.createElement("button");

        copyButton.type =
            "button";

        copyButton.className =
            "asset-action";

        copyButton.textContent =
            "Copy";

        copyButton.title =
            `Copy project path for ${asset.name}`;

        copyButton.addEventListener(
            "click",
            async event => {
                event.stopPropagation();

                try {
                    await navigator.clipboard.writeText(
                        asset.name
                    );

                    console.log(
                        `Copied project path for ${asset.name}.`
                    );
                } catch (error) {
                    console.error(
                        "Failed to copy asset path:",
                        error
                    );
                }
            }
        );


        /* Delete */

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
                    await window.bzConfirm?.(
                        `Delete "${asset.name}"?`,
                        "Delete Asset",
                        "danger"
                    );

                if (!confirmed) {
                    return;
                }

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

        row.appendChild(
            icon
        );

        row.appendChild(
            name
        );

        row.appendChild(
            actions
        );

        assetTree.appendChild(
            row
        );
    }
}


/* ---------------------------------
   Upload
--------------------------------- */

if (uploadAssetBtn) {
    uploadAssetBtn.addEventListener(
        "click",
        () => {
            assetInput?.click();
        }
    );
}


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

            const results = await Promise.allSettled(
                files.map(file => saveAsset(file))
            );
            const uploadedFiles = files.filter(
                (_, index) => results[index].status === "fulfilled"
            );
            const failedFiles = files.filter(
                (_, index) => results[index].status === "rejected"
            );

            try {
                if (uploadedFiles.length === 0) {
                    throw new Error("No assets were saved.");
                }

                await renderAssets();

                window.dispatchEvent(
                    new CustomEvent(
                        "buildzen-assets-changed"
                    )
                );

                window.bzAlert?.(
                    failedFiles.length === 0
                        ? `${uploadedFiles.length} asset${uploadedFiles.length === 1 ? "" : "s"} added to the project.`
                        : `${uploadedFiles.length} saved; ${failedFiles.length} failed: ${failedFiles.slice(0, 5).map(file => file.name).join(", ")}${failedFiles.length > 5 ? ", …" : ""}`,
                    failedFiles.length === 0 ? "Assets Uploaded" : "Some Uploads Failed",
                    failedFiles.length === 0 ? "success" : "warning"
                );
            } catch (error) {
                console.error(
                    "Failed to save uploaded assets:",
                    error
                );

                window.bzAlert?.(
                    `Could not save ${failedFiles.length} asset${failedFiles.length === 1 ? "" : "s"}: ${failedFiles.slice(0, 5).map(file => file.name).join(", ")}${failedFiles.length > 5 ? ", …" : ""}`,
                    "Upload Failed",
                    "danger"
                );
            } finally {
                assetInput.value = "";
            }
        }
    );
}


/* ---------------------------------
   Preview asset URLs
--------------------------------- */

export async function createAssetURLs() {
    const assets =
        await getAllAssets();

    const urls =
        new Map();

    for (const asset of assets) {
        if (!asset.file) {
            continue;
        }

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


export function revokePreviewAssetURLs() {
    for (const url of activePreviewAssetURLs.values()) {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignore already-revoked URLs.
        }
    }

    activePreviewAssetURLs.clear();
}


export function setActivePreviewAssetURLs(
    urls
) {
    activePreviewAssetURLs =
        urls instanceof Map
            ? urls
            : new Map();
}


export function revokeAssetURLs(urls) {
    if (!urls) {
        return;
    }

    for (const url of urls.values()) {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignore.
        }
    }
}


/* ---------------------------------
   Asset path helpers
--------------------------------- */

export function isExternalAssetURL(value) {
    if (!value) {
        return false;
    }

    return /^(https?:|data:|blob:|\/\/|#)/i.test(
        value.trim()
    );
}


export function cleanAssetPath(path) {
    const cleanPath = path
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/^\.\/+/, "")
        .replace(/^assets\/+/i, "");

    try {
        return decodeURIComponent(cleanPath);
    } catch {
        return cleanPath;
    }
}


/* ---------------------------------
   HTML asset references
--------------------------------- */

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

    for (
        const attribute of
        attributes
    ) {
        const elements =
            document.querySelectorAll(
                `[${attribute}]`
            );

        for (
            const element of
            elements
        ) {
            const value =
                element.getAttribute(
                    attribute
                );

            if (!value) {
                continue;
            }

            if (
                isExternalAssetURL(value)
            ) {
                continue;
            }

            const cleanPath =
                cleanAssetPath(value);

            const assetURL =
                assetURLs.get(
                    cleanPath
                );

            if (!assetURL) {
                continue;
            }

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


/* ---------------------------------
   CSS asset references
--------------------------------- */

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
                assetURLs.get(
                    cleanPath
                );

            if (!assetURL) {
                return match;
            }

            return `url("${assetURL}")`;
        }
    );
}