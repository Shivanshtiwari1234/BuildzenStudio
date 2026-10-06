const ASSET_DB_NAME = "buildzen-assets";
const ASSET_DB_VERSION = 1;
const ASSET_STORE = "assets";

const assetTree = document.getElementById("assetTree");
const uploadAssetBtn = document.getElementById("uploadAssetBtn");
const assetInput = document.getElementById("assetInput");

let activePreviewAssetURLs = new Map();


/* =========================================================
   INDEXEDDB
   ========================================================= */

function openAssetDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(
            ASSET_DB_NAME,
            ASSET_DB_VERSION
        );

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(ASSET_STORE)) {
                db.createObjectStore(
                    ASSET_STORE,
                    { keyPath: "id" }
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


export async function saveAsset(file) {
    const db = await openAssetDatabase();

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

        const asset = {
            id: crypto.randomUUID(),
            name: file.name,
            type:
                file.type ||
                "application/octet-stream",
            size: file.size,
            lastModified: file.lastModified,
            file
        };

        const request = store.add(asset);

        request.onsuccess = () => {
            resolve(asset);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


export async function getAllAssets() {
    const db = await openAssetDatabase();

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

        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


export async function deleteAsset(assetId) {
    const db = await openAssetDatabase();

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


/* =========================================================
   ASSET UI
   ========================================================= */

function getAssetIcon(asset) {
    const type = asset.type || "";

    if (type.startsWith("image/")) {
        return "IMG";
    }

    if (type.startsWith("video/")) {
        return "VID";
    }

    if (type.startsWith("audio/")) {
        return "AUD";
    }

    if (type.includes("font")) {
        return "FONT";
    }

    if (type.includes("pdf")) {
        return "PDF";
    }

    return "FILE";
}


export async function renderAssets() {
    const assets = await getAllAssets();

    assetTree.innerHTML = "";

    if (!assets.length) {
        const empty =
            document.createElement("div");

        empty.className = "empty-assets";
        empty.textContent = "No assets yet";

        assetTree.appendChild(empty);

        return;
    }

    assets.sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const asset of assets) {
        const item =
            document.createElement("div");

        item.className = "asset-item";

        const icon =
            document.createElement("span");

        icon.className = "asset-icon";
        icon.textContent =
            getAssetIcon(asset);

        const name =
            document.createElement("span");

        name.className = "asset-name";
        name.textContent = asset.name;
        name.title = asset.name;

        const actions =
            document.createElement("div");

        actions.className = "asset-actions";


        /* Copy */

        const copyButton =
            document.createElement("button");

        copyButton.type = "button";
        copyButton.className = "asset-action";
        copyButton.textContent = "Copy";
        copyButton.title = "Copy asset URL";

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

                    /*
                     * Do not revoke immediately.
                     * The copied URL would otherwise
                     * become invalid.
                     *
                     * Keep it alive briefly.
                     */
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 30000);

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


        /* Delete */

        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "asset-action asset-delete";

        deleteButton.textContent = "×";
        deleteButton.title = "Delete asset";

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

                if (!confirmed) {
                    return;
                }

                try {
                    await deleteAsset(asset.id);

                    await renderAssets();

                    console.log(
                        `Deleted asset "${asset.name}".`
                    );

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


        actions.append(
            copyButton,
            deleteButton
        );

        item.append(
            icon,
            name,
            actions
        );

        assetTree.appendChild(item);
    }
}


/* =========================================================
   UPLOAD
   ========================================================= */

uploadAssetBtn.addEventListener(
    "click",
    () => assetInput.click()
);

assetInput.addEventListener(
    "change",
    async () => {
        const files =
            Array.from(
                assetInput.files || []
            );

        if (!files.length) {
            return;
        }

        try {
            for (const file of files) {
                await saveAsset(file);
            }

            await renderAssets();

            console.log(
                `Uploaded ${files.length} asset${files.length === 1
                    ? ""
                    : "s"
                }.`
            );

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
        }

        assetInput.value = "";
    }
);


/* =========================================================
   PREVIEW ASSET URLS
   ========================================================= */

export async function createAssetURLs() {
    const assets = await getAllAssets();

    const urls = new Map();

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


export function setActivePreviewAssetURLs(urls) {
    activePreviewAssetURLs = urls;
}


export function revokeAssetURLs(urls) {
    for (const url of urls.values()) {
        try {
            URL.revokeObjectURL(url);
        } catch { }
    }
}


/* =========================================================
   PATH HELPERS
   ========================================================= */

export function isExternalAssetURL(value) {
    const trimmed = value.trim();

    return (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("data:") ||
        trimmed.startsWith("blob:") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("mailto:") ||
        trimmed.startsWith("tel:") ||
        trimmed.startsWith("javascript:")
    );
}


export function cleanAssetPath(path) {
    return path
        .split("?")[0]
        .split("#")[0]
        .replace(/^\.?\//, "")
        .trim();
}


/* =========================================================
   HTML ASSET RESOLUTION
   ========================================================= */

export function resolveAssetReferences(
    html,
    assetURLs
) {
    const parser = new DOMParser();

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
        document
            .querySelectorAll(
                `[${attribute}]`
            )
            .forEach(element => {
                const value =
                    element.getAttribute(
                        attribute
                    );

                if (!value) {
                    return;
                }

                if (
                    isExternalAssetURL(
                        value
                    )
                ) {
                    return;
                }

                const cleanPath =
                    cleanAssetPath(value);

                const assetURL =
                    assetURLs.get(
                        cleanPath
                    );

                if (assetURL) {
                    element.setAttribute(
                        attribute,
                        assetURL
                    );
                }
            });
    }

    return (
        "<!DOCTYPE html>\n" +
        document.documentElement
            .outerHTML
    );
}


/* =========================================================
   CSS ASSET RESOLUTION
   ========================================================= */

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