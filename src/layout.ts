/* =========================================================
   Buildzen Studio
   Resizable workspace layout
   ========================================================= */

const STORAGE_KEY = "buildzen-layout";

const workspace = document.querySelector(".workspace");
const filePanel = document.querySelector(".file-panel");
const editorPanel = document.querySelector(".editor-panel");
const rightPanel = document.querySelector(".right-panel");
const previewPanel = document.querySelector(".preview-panel");
const consolePanel = document.querySelector(".console-panel");

if (workspace && filePanel && editorPanel && rightPanel) {
    const DEFAULTS = {
        fileWidth: 180,
        editorWidth: 420,
        consoleHeight: 260
    };

    const LIMITS = {
        fileWidth: {
            min: 130,
            max: 340
        },

        editorWidth: {
            min: 280,
            max: 900
        },

        consoleHeight: {
            min: 150,
            max: 600
        }
    };

    let layout = loadLayout();

    let activeDrag = null;

    let startPointer = 0;
    let startValue = 0;

    let lastPointer = 0;
    let pointerVelocity = 0;
    let lastPointerTime = 0;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function loadLayout() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            );

            if (!saved || typeof saved !== "object") {
                return { ...DEFAULTS };
            }

            return {
                fileWidth: clamp(
                    Number(saved.fileWidth) || DEFAULTS.fileWidth,
                    LIMITS.fileWidth.min,
                    LIMITS.fileWidth.max
                ),

                editorWidth: clamp(
                    Number(saved.editorWidth) || DEFAULTS.editorWidth,
                    LIMITS.editorWidth.min,
                    LIMITS.editorWidth.max
                ),

                consoleHeight: clamp(
                    Number(saved.consoleHeight) || DEFAULTS.consoleHeight,
                    LIMITS.consoleHeight.min,
                    LIMITS.consoleHeight.max
                )
            };
        } catch {
            return { ...DEFAULTS };
        }
    }

    function saveLayout() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(layout)
            );
        } catch {
            // Layout persistence is optional.
        }
    }

    function applyLayout() {
        workspace.style.setProperty(
            "--file-panel-width",
            `${layout.fileWidth}px`
        );

        workspace.style.setProperty(
            "--editor-panel-width",
            `${layout.editorWidth}px`
        );

        rightPanel.style.setProperty(
            "--console-height",
            `${layout.consoleHeight}px`
        );
    }

    function resetLayout() {
        layout = { ...DEFAULTS };

        applyLayout();
        saveLayout();

        announce("Panel layout reset.");
    }

    function announce(message) {
        let live = document.getElementById(
            "buildzenLayoutAnnouncement"
        );

        if (!live) {
            live = document.createElement("div");
            live.id = "buildzenLayoutAnnouncement";

            Object.assign(live.style, {
                position: "fixed",
                width: "1px",
                height: "1px",
                padding: "0",
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: "0"
            });

            live.setAttribute("aria-live", "polite");
            live.setAttribute("aria-atomic", "true");

            document.body.appendChild(live);
        }

        live.textContent = message;
    }

    /*
     * Determine whether the user is currently interacting with
     * an editor/input. Global keyboard shortcuts should never
     * interfere with typing.
     */
    function isTypingContext(target) {
        if (!target) return false;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
        ) {
            return true;
        }

        if (target.isContentEditable) {
            return true;
        }

        if (target.closest?.(".cm-content")) {
            return true;
        }

        return false;
    }

    function createSplitter({
        id,
        orientation,
        label,
        value,
        getValue,
        setValue,
        min,
        max,
        direction
    }) {
        const splitter = document.createElement("div");

        splitter.className =
            `layout-splitter layout-splitter-${orientation}`;

        splitter.id = id;

        splitter.tabIndex = 0;

        splitter.setAttribute("role", "separator");
        splitter.setAttribute(
            "aria-orientation",
            orientation === "vertical"
                ? "vertical"
                : "horizontal"
        );

        splitter.setAttribute(
            "aria-label",
            label
        );

        splitter.setAttribute(
            "aria-valuemin",
            String(min)
        );

        splitter.setAttribute(
            "aria-valuemax",
            String(max)
        );

        splitter.setAttribute(
            "aria-valuenow",
            String(value)
        );

        splitter.title =
            `${label}. Drag to resize. ` +
            `Use arrow keys to resize. Double-click to reset.`;

        const grip = document.createElement("span");
        grip.className = "layout-splitter-grip";
        grip.setAttribute("aria-hidden", "true");

        splitter.appendChild(grip);

        function updateAria() {
            splitter.setAttribute(
                "aria-valuenow",
                String(Math.round(getValue()))
            );
        }

        function setFromPointer(pointer) {
            let delta = pointer - startPointer;

            if (direction === "reverse") {
                delta *= -1;
            }

            const next = clamp(
                startValue + delta,
                min,
                max
            );

            setValue(next);
            updateAria();
        }

        splitter.addEventListener(
            "pointerdown",
            event => {
                if (event.button !== 0) return;

                event.preventDefault();

                activeDrag = splitter;

                startPointer =
                    orientation === "vertical"
                        ? event.clientX
                        : event.clientY;

                startValue = getValue();

                lastPointer = startPointer;
                lastPointerTime = performance.now();
                pointerVelocity = 0;

                splitter.classList.add("dragging");

                document.body.classList.add(
                    orientation === "vertical"
                        ? "resizing-columns"
                        : "resizing-rows"
                );

                splitter.setPointerCapture?.(
                    event.pointerId
                );
            }
        );

        splitter.addEventListener(
            "pointermove",
            event => {
                if (activeDrag !== splitter) return;

                const pointer =
                    orientation === "vertical"
                        ? event.clientX
                        : event.clientY;

                const now = performance.now();
                const elapsed = now - lastPointerTime;

                if (elapsed > 0) {
                    pointerVelocity =
                        (pointer - lastPointer) / elapsed;
                }

                lastPointer = pointer;
                lastPointerTime = now;

                setFromPointer(pointer);
            }
        );

        function finishDrag() {
            if (activeDrag !== splitter) return;

            activeDrag = null;

            splitter.classList.remove("dragging");

            document.body.classList.remove(
                "resizing-columns",
                "resizing-rows"
            );

            saveLayout();

            if (Math.abs(pointerVelocity) > 0.5) {
                splitter.animate(
                    [
                        {
                            transform:
                                orientation === "vertical"
                                    ? "scaleX(1)"
                                    : "scaleY(1)"
                        },
                        {
                            transform:
                                orientation === "vertical"
                                    ? "scaleX(1.04)"
                                    : "scaleY(1.04)"
                        },
                        {
                            transform:
                                orientation === "vertical"
                                    ? "scaleX(1)"
                                    : "scaleY(1)"
                        }
                    ],
                    {
                        duration: 130,
                        easing: "ease-out"
                    }
                );
            }
        }

        splitter.addEventListener(
            "pointerup",
            finishDrag
        );

        splitter.addEventListener(
            "pointercancel",
            finishDrag
        );

        splitter.addEventListener(
            "dblclick",
            () => {
                setValue(value);
                updateAria();
                saveLayout();

                splitter.animate(
                    [
                        { opacity: 0.55 },
                        { opacity: 1 }
                    ],
                    {
                        duration: 160,
                        easing: "ease-out"
                    }
                );

                announce(`${label} reset.`);
            }
        );

        splitter.addEventListener(
            "keydown",
            event => {
                const current = getValue();

                let delta = 0;

                const step =
                    event.shiftKey
                        ? 50
                        : 10;

                if (
                    orientation === "vertical"
                ) {
                    if (event.key === "ArrowLeft") {
                        delta = -step;
                    } else if (
                        event.key === "ArrowRight"
                    ) {
                        delta = step;
                    }
                } else {
                    if (event.key === "ArrowUp") {
                        delta = -step;
                    } else if (
                        event.key === "ArrowDown"
                    ) {
                        delta = step;
                    }
                }

                if (event.key === "Home") {
                    setValue(min);
                    updateAria();
                    saveLayout();
                    event.preventDefault();
                    return;
                }

                if (event.key === "End") {
                    setValue(max);
                    updateAria();
                    saveLayout();
                    event.preventDefault();
                    return;
                }

                if (!delta) return;

                const next = clamp(
                    current + delta,
                    min,
                    max
                );

                setValue(next);
                updateAria();
                saveLayout();

                announce(
                    `${label}: ${Math.round(next)} pixels`
                );

                event.preventDefault();
            }
        );

        return splitter;
    }

    const columnSplitterOne = createSplitter({
        id: "fileEditorSplitter",
        orientation: "vertical",
        label: "File panel width",
        value: DEFAULTS.fileWidth,
        getValue: () => layout.fileWidth,
        setValue: value => {
            layout.fileWidth = value;
            applyLayout();
        },
        min: LIMITS.fileWidth.min,
        max: LIMITS.fileWidth.max,
        direction: "normal"
    });

    const columnSplitterTwo = createSplitter({
        id: "editorPreviewSplitter",
        orientation: "vertical",
        label: "Editor width",
        value: DEFAULTS.editorWidth,
        getValue: () => layout.editorWidth,
        setValue: value => {
            layout.editorWidth = value;
            applyLayout();
        },
        min: LIMITS.editorWidth.min,
        max: LIMITS.editorWidth.max,
        direction: "normal"
    });

    workspace.insertBefore(
        columnSplitterOne,
        editorPanel
    );

    workspace.insertBefore(
        columnSplitterTwo,
        rightPanel
    );

    const rowSplitter = createSplitter({
        id: "previewConsoleSplitter",
        orientation: "horizontal",
        label: "Console height",
        value: DEFAULTS.consoleHeight,
        getValue: () => layout.consoleHeight,
        setValue: value => {
            layout.consoleHeight = value;
            applyLayout();
        },
        min: LIMITS.consoleHeight.min,
        max: LIMITS.consoleHeight.max,
        direction: "reverse"
    });

    if (rightPanel && consolePanel) {
        rightPanel.insertBefore(
            rowSplitter,
            consolePanel
        );
    }

    /*
     * Global keyboard resizing.
     *
     * Alt + Shift + Arrow
     *
     * This deliberately does not run while typing in an editor
     * or form control.
     */
    document.addEventListener(
        "keydown",
        event => {
            if (
                !event.altKey ||
                !event.shiftKey
            ) {
                return;
            }

            if (isTypingContext(event.target)) {
                return;
            }

            if (event.key === "r") {
                resetLayout();
                event.preventDefault();
                return;
            }

            let changed = false;

            if (event.key === "ArrowLeft") {
                layout.fileWidth = clamp(
                    layout.fileWidth - 10,
                    LIMITS.fileWidth.min,
                    LIMITS.fileWidth.max
                );

                changed = true;
            }

            if (event.key === "ArrowRight") {
                layout.fileWidth = clamp(
                    layout.fileWidth + 10,
                    LIMITS.fileWidth.min,
                    LIMITS.fileWidth.max
                );

                changed = true;
            }

            if (event.key === "ArrowUp") {
                layout.consoleHeight = clamp(
                    layout.consoleHeight + 10,
                    LIMITS.consoleHeight.min,
                    LIMITS.consoleHeight.max
                );

                changed = true;
            }

            if (event.key === "ArrowDown") {
                layout.consoleHeight = clamp(
                    layout.consoleHeight - 10,
                    LIMITS.consoleHeight.min,
                    LIMITS.consoleHeight.max
                );

                changed = true;
            }

            if (!changed) return;

            applyLayout();
            saveLayout();

            event.preventDefault();
        }
    );

    /*
     * Keep the layout usable when the browser becomes narrow.
     * The desktop pixel widths are retained as preferences, but
     * CSS media queries take control of the actual composition.
     */
    const resizeObserver =
        new ResizeObserver(() => {
            applyLayout();
        });

    resizeObserver.observe(workspace);

    applyLayout();

    window.buildzenLayout = {
        reset: resetLayout,
        getState: () => ({ ...layout }),
        save: saveLayout
    };
}