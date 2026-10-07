import {
    initializeEditors,
    addEditor,
    removeEditor,
    switchEditor,
    getEditorContent,
    setEditorContent,
    getActiveEditor
} from "./editor.js";

import { renderAssets } from "./assets.js";

import {
    createPreviewController
} from "./preview.js";


const loadingScreen =
    document.getElementById("loadingScreen");

const loadingStatus =
    document.getElementById("loadingStatus");


function setLoadingStatus(text) {

    if (loadingStatus) {
        loadingStatus.textContent = text;
    }

}


function finishLoading() {

    if (!loadingScreen) {
        return;
    }

    loadingScreen.classList.add("hidden");

    setTimeout(() => {
        loadingScreen.remove();
    }, 400);

}


/* =========================================================
   DOM
   ========================================================= */

const preview =
    document.getElementById("preview");

const previewViewport =
    document.getElementById("previewViewport");

const previewDeviceButtons =
    document.querySelectorAll(".device-mode-btn");

const previewWidthInput =
    document.getElementById("previewWidthInput");

const previewZoomSelect =
    document.getElementById("previewZoomSelect");

const previewReloadBtn =
    document.getElementById("previewReloadBtn");

const previewOpenBtn =
    document.getElementById("previewOpenBtn");

const previewFullscreenBtn =
    document.getElementById("previewFullscreenBtn");

const status =
    document.getElementById("status");

const refreshBtn =
    document.getElementById("refreshBtn");

const resetBtn =
    document.getElementById("resetBtn");

const templatesBtn =
    document.getElementById("templatesBtn");

const templateDialog =
    document.getElementById("templateDialog");

const templateGrid =
    document.getElementById("templateGrid");

const closeTemplateDialogBtn =
    document.getElementById("closeTemplateDialogBtn");

const fileTree =
    document.getElementById("fileTree");

const editorContainer =
    document.getElementById("editorContainer");

const blockPalette =
    document.getElementById("blockPalette");

const newFileBtn =
    document.getElementById("newFileBtn");

const renameFileBtn =
    document.getElementById("renameFileBtn");

const deleteFileBtn =
    document.getElementById("deleteFileBtn");

const previewStatus =
    document.getElementById("previewStatus");

const docsBtn =
    document.getElementById("docsBtn");

const saveStatus =
    document.getElementById("saveStatus");

const consoleOutput =
    document.getElementById("consoleOutput");

const consoleCount =
    document.getElementById("consoleCount");

const clearConsoleBtn =
    document.getElementById("clearConsoleBtn");

const consoleFilters =
    document.querySelectorAll(".console-filter");


/* =========================================================
   MODAL DOM
   ========================================================= */

const modalOverlay =
    document.getElementById("modalOverlay");

const modal =
    document.getElementById("modal");

const modalTitle =
    document.getElementById("modalTitle");

const modalIcon =
    document.getElementById("modalIcon");

const modalMessage =
    document.getElementById("modalMessage");

const modalInput =
    document.getElementById("modalInput");

const modalCancelBtn =
    document.getElementById("modalCancelBtn");

const modalConfirmBtn =
    document.getElementById("modalConfirmBtn");

const modalCloseBtn =
    document.getElementById("modalCloseBtn");


/* =========================================================
   PROJECT STATE
   ========================================================= */

const PROJECT_STORAGE_KEY =
    "buildzen-project";

let buildzenFiles = [];

let activeFileId = null;

window.buildzenFiles =
    buildzenFiles;


/* =========================================================
   MODAL SYSTEM
   ========================================================= */

let modalResolver = null;


function closeModal(value = null) {

    modalOverlay.classList.remove("open");

    modalOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    if (modalResolver) {

        const resolve =
            modalResolver;

        modalResolver = null;

        resolve(value);

    }

}


function showModal({
    title = "Buildzen",
    message = "",
    type = "info",
    input = false,
    defaultValue = "",
    confirmText = "OK",
    cancelText = "Cancel"
} = {}) {

    return new Promise(resolve => {

        modalResolver = resolve;

        modalTitle.textContent =
            title;

        modalMessage.textContent =
            message;

        modalIcon.className =
            `modal-icon ${type}`;

        if (type === "danger") {

            modalIcon.textContent = "!";

        } else if (type === "warning") {

            modalIcon.textContent = "!";

        } else if (type === "success") {

            modalIcon.textContent = "✓";

        } else {

            modalIcon.textContent = "i";

        }

        modalInput.style.display =
            input ? "block" : "none";

        modalInput.value =
            defaultValue;

        modalConfirmBtn.textContent =
            confirmText;

        modalCancelBtn.textContent =
            cancelText;

        modalCancelBtn.style.display =
            "block";

        modalOverlay.classList.add("open");

        modalOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        if (input) {

            setTimeout(() => {

                modalInput.focus();
                modalInput.select();

            }, 0);

        } else {

            setTimeout(() => {

                modalConfirmBtn.focus();

            }, 0);

        }

    });

}


function bzAlert(
    message,
    title = "Buildzen",
    type = "info"
) {

    return showModal({
        title,
        message,
        type,
        confirmText: "OK",
        cancelText: "Close"
    }).then(() => { });

}


function bzConfirm(
    message,
    title = "Confirm",
    type = "warning"
) {

    return showModal({
        title,
        message,
        type,
        confirmText: "Confirm",
        cancelText: "Cancel"
    });

}


function bzPrompt(
    message,
    defaultValue = "",
    title = "Buildzen"
) {

    return showModal({
        title,
        message,
        type: "info",
        input: true,
        defaultValue,
        confirmText: "OK",
        cancelText: "Cancel"
    });

}


/*
 * assets.js uses these functions when
 * deleting assets.
 */

window.bzConfirm =
    bzConfirm;

window.bzAlert =
    bzAlert;

window.bzPrompt =
    bzPrompt;


modalConfirmBtn.addEventListener(
    "click",
    () => {

        if (!modalResolver) {
            return;
        }

        const inputVisible =
            modalInput.style.display !== "none";

        closeModal(
            inputVisible
                ? modalInput.value
                : true
        );

    }
);


modalCancelBtn.addEventListener(
    "click",
    () => {

        closeModal(null);

    }
);


modalCloseBtn.addEventListener(
    "click",
    () => {

        closeModal(null);

    }
);


modalOverlay.addEventListener(
    "click",
    event => {

        if (event.target === modalOverlay) {
            closeModal(null);
        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            !modalOverlay.classList.contains("open")
        ) {
            return;
        }

        if (event.key === "Escape") {

            event.preventDefault();

            closeModal(null);

        }

        if (
            event.key === "Enter" &&
            document.activeElement !== modalInput
        ) {

            event.preventDefault();

            closeModal(true);

        }

    }
);


/* =========================================================
   DEFAULT FILE CONTENT
   ========================================================= */

function getDefaultContent(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension === "html" ||
        extension === "htm"
    ) {

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buildzen Project</title>
</head>
<body>
    <h1>Hello, Buildzen!</h1>
</body>
</html>`;

    }


    if (extension === "css") {

        return `body {
    font-family: sans-serif;
}`;

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return `console.log("Hello from Buildzen!");`;

    }


    return "";

}


/* =========================================================
   DEFAULT PROJECT
   ========================================================= */

function createDefaultProject() {

    return {

        files: [

            {
                id: "index.html",

                name: "index.html",

                content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buildzen Studio</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello, Buildzen!</h1>
    <script src="script.js"></script>
</body>
</html>`
            },

            {
                id: "style.css",

                name: "style.css",

                content: `body {
    font-family: Arial, sans-serif;
    padding: 40px;
}

h1 {
    color: #4f8cff;
}`
            },

            {
                id: "script.js",
                name: "script.js",
                content: `console.log("Buildzen is running!");`
            }

        ],

        activeFile: "index.html"

    };

}


const PROJECT_TEMPLATES = [
    {
        id: "landing",
        name: "Landing page",
        category: "Marketing",
        description: "A focused launch page with a clear offer and feature highlights.",
        brand: "Morrow",
        badge: "A better way to begin",
        headline: "Make room for your next big idea.",
        copy: "A thoughtful toolkit for teams turning ambitious plans into meaningful work.",
        action: "Explore the toolkit",
        sectionTitle: "Everything in its right place",
        accent: "#b7f36b",
        background: "#17211c",
        cards: ["Find your focus", "Build with intent", "Make progress visible"]
    },
    {
        id: "portfolio",
        name: "Portfolio",
        category: "Personal site",
        description: "A considered portfolio with an introduction and selected work.",
        brand: "Avery Stone",
        badge: "Independent designer and maker",
        headline: "Useful things, made with feeling.",
        copy: "I partner with curious teams to shape digital products, identities, and experiences.",
        action: "View selected work",
        sectionTitle: "Selected projects",
        accent: "#ff9a72",
        background: "#241b19",
        cards: ["Field Notes · Product design", "Common Ground · Identity", "Good Form · Art direction"]
    },
    {
        id: "ecommerce",
        name: "E-commerce",
        category: "Online store",
        description: "A product-led storefront with a featured collection and shop links.",
        brand: "Forma Objects",
        badge: "Objects for everyday rituals",
        headline: "Small details. Better days.",
        copy: "Considered essentials made to be used, kept, and passed along.",
        action: "Shop the collection",
        sectionTitle: "Made to live with",
        accent: "#f2be72",
        background: "#211e18",
        cards: ["Arc table light · $148", "Studio vessel · $64", "Everyday tray · $42"]
    },
    {
        id: "blog",
        name: "Blog layout",
        category: "Editorial",
        description: "An editorial home for essays, field notes, and ongoing ideas.",
        brand: "The Sunday Edit",
        badge: "Ideas for a more considered life",
        headline: "A little more curious, every day.",
        copy: "Notes on creativity, culture, and the everyday things worth noticing.",
        action: "Read the latest",
        sectionTitle: "Fresh from the journal",
        accent: "#88c9ed",
        background: "#172127",
        cards: ["The quiet value of starting over", "Objects that earn their place", "A city guide for slow mornings"]
    },
    {
        id: "saas",
        name: "SaaS dashboard",
        category: "Product UI",
        description: "A compact product overview with metrics, activity, and navigation.",
        brand: "Northstar",
        badge: "WORKSPACE / OVERVIEW",
        headline: "Good work, moving forward.",
        copy: "Bring the important signals, team activity, and next steps into one clear view.",
        action: "Open workspace",
        sectionTitle: "This week at a glance",
        accent: "#7bc7a2",
        background: "#17211f",
        cards: ["Projects on track", "Tasks completed", "Team momentum"]
    }
];


const UI_BLOCKS = [
    {
        id: "navbar",
        name: "Navbar",
        markup: `<nav class="site-nav" aria-label="Main navigation">
    <a class="site-logo" href="#">Brand</a>
    <div class="site-nav-links"><a href="#about">About</a><a href="#work">Work</a><a href="#contact">Contact</a></div>
    <a class="site-nav-cta" href="#contact">Get in touch</a>
</nav>`
    },
    {
        id: "hero",
        name: "Hero section",
        markup: `<section class="hero-section">
    <p class="hero-eyebrow">A short introduction</p>
    <h1>Make your next idea matter.</h1>
    <p class="hero-copy">Add a sentence that explains what you do and who it helps.</p>
    <a class="hero-button" href="#work">Explore more</a>
</section>`
    },
    {
        id: "card",
        name: "Feature card",
        markup: `<article class="feature-card">
    <span class="feature-card-icon" aria-hidden="true">✳</span>
    <h2>A feature worth sharing</h2>
    <p>Explain the value in a clear, useful sentence.</p>
</article>`
    },
    {
        id: "pricing",
        name: "Pricing table",
        markup: `<section class="pricing-card" aria-labelledby="pricing-title">
    <p class="pricing-label">Plan name</p>
    <h2 id="pricing-title">$24 <small>/ month</small></h2>
    <p>Everything you need to get started.</p>
    <ul><li>Unlimited projects</li><li>Priority support</li><li>Cancel any time</li></ul>
    <a href="#signup">Choose this plan</a>
</section>`
    },
    {
        id: "cta",
        name: "Call to action",
        markup: `<section class="cta-section">
    <div><p class="cta-eyebrow">Ready when you are</p><h2>Let's make something good.</h2></div>
    <a href="#contact">Start a conversation <span aria-hidden="true">↗</span></a>
</section>`
    }
];


function createTemplateProject(templateId) {

    const template = PROJECT_TEMPLATES.find(
        item => item.id === templateId
    );

    if (!template) {
        return createDefaultProject();
    }

    const cards = template.cards.map((title, index) => `
            <article class="feature-card">
                <span class="card-index">0${index + 1}</span>
                <h3>${title}</h3>
                <p>${template.id === "saas" ? "A clear signal to help your team decide what comes next." : "Thoughtfully made to help you spend more time on what matters."}</p>
            </article>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.brand}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="template-${template.id}">
    <header class="site-header">
        <a class="brand" href="#top">${template.brand}</a>
        <nav aria-label="Main navigation"><a href="#about">About</a><a href="#work">Discover</a><a href="#contact">Contact</a></nav>
        <a class="header-link" href="#work">${template.action} <span aria-hidden="true">↗</span></a>
    </header>
    <main id="top">
        <section class="dashboard-overview" style="display: ${template.id === "saas" ? "grid" : "none"}">
            <aside class="dashboard-sidebar"><p>WORKSPACE</p><a class="selected" href="#top">Overview</a><a href="#projects">Projects</a><a href="#activity">Activity</a><a href="#settings">Settings</a></aside>
            <div class="dashboard-main">
                <div class="dashboard-welcome"><div><p class="eyebrow">MONDAY, OCTOBER 07</p><h1>Good morning, Alex</h1></div><button type="button">+ New project</button></div>
                <div class="dashboard-stats">${template.cards.map((title, index) => `<article><span>${title}</span><strong>${["12", "84%", "6.4h"][index]}</strong><small>${["2 updated today", "+8% this week", "saved this week"][index]}</small></article>`).join("")}</div>
                <div class="dashboard-lower">
                    <section id="projects" class="dashboard-panel"><div class="dashboard-panel-heading"><h2>Recent activity</h2><a href="#activity">View all ↗</a></div><p><b>Olivia Chen</b> moved <strong>Website refresh</strong> to review <time>10 min ago</time></p><p><b>Marcus Lee</b> completed <strong>Onboarding flow</strong> <time>1 hour ago</time></p><p><b>You</b> created <strong>Q4 launch plan</strong> <time>Yesterday</time></p></section>
                    <section class="dashboard-panel dashboard-chart"><div class="dashboard-panel-heading"><h2>Team progress</h2><span>This week</span></div><div class="chart-bars" aria-label="Weekly team progress"><i style="--bar:48%"></i><i style="--bar:72%"></i><i style="--bar:57%"></i><i style="--bar:86%"></i><i style="--bar:66%"></i><i style="--bar:100%"></i><i style="--bar:78%"></i></div><div class="chart-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div></section>
                </div>
            </div>
        </section>
        <section class="hero">
            <div class="hero-copy">
                <p class="eyebrow"><span></span>${template.badge}</p>
                <h1>${template.headline}</h1>
                <p class="intro">${template.copy}</p>
                <a class="primary-link" href="#work">${template.action}<span aria-hidden="true">↗</span></a>
            </div>
            <div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-shape"></div><span>MAKE<br>IT MATTER</span></div>
        </section>
        <section id="work" class="work-section">
            <div class="section-heading"><div><p class="eyebrow">A FEW GOOD THINGS</p><h2>${template.sectionTitle}</h2></div><p>Made with care. Built for the long run.</p></div>
            <div class="feature-grid">${cards}
            </div>
        </section>
        <footer id="contact"><span>${template.brand}</span><a href="mailto:hello@example.com">Let's make something good <span aria-hidden="true">↗</span></a><span>© 2026</span></footer>
    </main>
    <script src="script.js"></script>
</body>
</html>`;

    const css = `:root {
    color-scheme: dark;
    --accent: ${template.accent};
    --ground: ${template.background};
    --ink: #f3f1e9;
    --muted: #aaa99f;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-synthesis: none;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--ground); color: var(--ink); }
a { color: inherit; text-decoration: none; }
.site-header { height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 24px; max-width: 1200px; margin: auto; padding: 0 36px; border-bottom: 1px solid #ffffff20; }
.brand { font-size: 15px; font-weight: 700; letter-spacing: .02em; }
nav { display: flex; gap: 30px; color: var(--muted); font-size: 12px; }
.header-link { font-size: 11px; }
.hero { min-height: 540px; display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: 52px; max-width: 1200px; margin: auto; padding: 70px 8%; }
.hero-copy { max-width: 610px; }
.eyebrow { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: 10px; letter-spacing: .13em; text-transform: uppercase; }
.eyebrow span { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
h1 { max-width: 680px; margin: 25px 0 18px; font-size: clamp(48px, 6vw, 82px); line-height: .98; letter-spacing: -.055em; font-weight: 550; }
.intro { max-width: 450px; color: var(--muted); font-size: 15px; line-height: 1.75; }
.primary-link { display: inline-flex; align-items: center; gap: 30px; margin-top: 22px; padding: 14px 17px; background: var(--accent); color: #182019; font-size: 12px; font-weight: 700; }
.hero-art { position: relative; min-height: 320px; display: grid; place-items: center; overflow: hidden; background: color-mix(in srgb, var(--accent) 13%, transparent); }
.art-ring { position: absolute; width: 250px; aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--accent) 65%, transparent); border-radius: 50%; box-shadow: 0 0 0 34px color-mix(in srgb, var(--accent) 8%, transparent), 0 0 0 68px color-mix(in srgb, var(--accent) 5%, transparent); }
.art-shape { width: 132px; aspect-ratio: 1; background: var(--accent); transform: rotate(25deg); border-radius: 38% 62% 52% 48%; }
.hero-art > span { position: absolute; right: 20px; bottom: 18px; color: var(--ground); font-size: 10px; font-weight: 800; line-height: 1.2; }
.work-section { padding: 70px max(8%, calc((100% - 1000px) / 2)) 88px; background: #ffffff08; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.section-heading h2 { margin: 12px 0 0; font-size: 30px; font-weight: 500; letter-spacing: -.03em; }
.section-heading > p { color: var(--muted); font-size: 12px; }
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.feature-card { min-height: 170px; padding: 20px; border: 1px solid #ffffff1a; background: #ffffff05; }
.card-index { color: var(--accent); font-size: 10px; }
.feature-card h3 { margin: 34px 0 9px; font-size: 16px; font-weight: 550; }
.feature-card p { max-width: 270px; margin: 0; color: var(--muted); font-size: 11px; line-height: 1.6; }
footer { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 1200px; margin: auto; padding: 18px 36px; color: var(--muted); font-size: 11px; }
footer a { color: var(--ink); }
.template-portfolio .hero-art { background: linear-gradient(145deg, #d98565, #563b35 60%, #28201e); }
.template-portfolio .art-shape { border-radius: 50%; transform: rotate(-18deg) scaleX(.8); }
.template-ecommerce .hero-art { background: radial-gradient(ellipse at center, #b98a4c, #493923 50%, #2a241a 75%); }
.template-ecommerce .art-shape { border-radius: 10px 10px 46% 46%; transform: rotate(0); }
.template-blog h1 { font-family: Georgia, serif; font-weight: 400; letter-spacing: -.04em; }
.template-blog .hero-art { background: linear-gradient(145deg, #7599a5, #283b42 66%); }
.template-blog .art-shape { width: 155px; border-radius: 50% 50% 5px 5px; }
.template-saas .hero { min-height: 430px; }
.template-saas .hero-art { min-height: 255px; }
.template-saas .art-shape { width: 110px; border-radius: 24px; transform: rotate(0); }
.template-saas .site-header nav { display: none; }
.template-saas .dashboard-overview { min-height: 560px; max-width: 1200px; grid-template-columns: 160px minmax(0, 1fr); gap: 32px; margin: auto; padding: 38px 36px; }
.template-saas .dashboard-sidebar { display: flex; flex-direction: column; gap: 7px; padding-right: 18px; border-right: 1px solid #ffffff18; }
.template-saas .dashboard-sidebar p { margin: 0 0 10px; color: var(--muted); font-size: 9px; letter-spacing: .12em; }
.template-saas .dashboard-sidebar a { padding: 10px; color: var(--muted); font-size: 11px; }
.template-saas .dashboard-sidebar a.selected { background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--ink); }
.template-saas .dashboard-main { min-width: 0; }
.template-saas .dashboard-welcome { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 26px; }
.template-saas .dashboard-welcome .eyebrow { margin: 0 0 7px; }
.template-saas .dashboard-welcome h1 { margin: 0; font-size: 28px; letter-spacing: -.03em; }
.template-saas .dashboard-welcome button { padding: 10px 13px; border: 0; background: var(--accent); color: #142019; font-size: 11px; font-weight: 700; }
.template-saas .dashboard-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.template-saas .dashboard-stats article, .template-saas .dashboard-panel { min-width: 0; padding: 16px; border: 1px solid #ffffff18; background: #ffffff06; }
.template-saas .dashboard-stats article { display: flex; flex-direction: column; gap: 8px; }
.template-saas .dashboard-stats span, .template-saas .dashboard-stats small { color: var(--muted); font-size: 10px; }
.template-saas .dashboard-stats strong { font-size: 25px; font-weight: 550; }
.template-saas .dashboard-lower { display: grid; grid-template-columns: 1.2fr .8fr; gap: 10px; margin-top: 12px; }
.template-saas .dashboard-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px; }
.template-saas .dashboard-panel-heading h2 { margin: 0; font-size: 13px; font-weight: 550; }
.template-saas .dashboard-panel-heading a, .template-saas .dashboard-panel-heading > span { color: var(--muted); font-size: 9px; }
.template-saas .dashboard-panel > p { display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; padding: 10px 0; border-top: 1px solid #ffffff12; color: var(--muted); font-size: 9px; }
.template-saas .dashboard-panel > p b, .template-saas .dashboard-panel > p strong { color: var(--ink); font-weight: 500; }
.template-saas .dashboard-panel > p time { grid-column: 2; color: var(--muted); }
.template-saas .chart-bars { height: 115px; display: flex; align-items: end; justify-content: space-around; gap: 8px; border-bottom: 1px solid #ffffff20; background: repeating-linear-gradient(to bottom, transparent 0 27px, #ffffff0c 28px); }
.template-saas .chart-bars i { width: 9%; height: var(--bar); background: color-mix(in srgb, var(--accent) 76%, transparent); }
.template-saas .chart-days { display: flex; justify-content: space-around; margin-top: 8px; color: var(--muted); font-size: 9px; }
.template-saas .hero, .template-saas .work-section, .template-saas footer { display: none; }
@media (max-width: 700px) {
    .site-header { height: 62px; padding: 0 18px; }
    nav { display: none; }
    .hero { min-height: auto; grid-template-columns: 1fr; gap: 32px; padding: 58px 22px 42px; }
    h1 { font-size: clamp(44px, 13vw, 66px); }
    .hero-art { min-height: 230px; }
    .art-ring { width: 175px; }
    .art-shape { width: 94px; }
    .work-section { padding: 48px 22px 60px; }
    .section-heading { align-items: start; flex-direction: column; gap: 6px; }
    .feature-grid { grid-template-columns: 1fr; }
    .feature-card { min-height: 130px; }
    .feature-card h3 { margin-top: 20px; }
    footer { flex-wrap: wrap; padding: 18px 22px; }
    .template-saas .dashboard-overview { grid-template-columns: 1fr; gap: 18px; padding: 24px 18px; }
    .template-saas .dashboard-sidebar { flex-direction: row; overflow-x: auto; padding: 0 0 8px; border-right: 0; border-bottom: 1px solid #ffffff18; }
    .template-saas .dashboard-sidebar p { display: none; }
    .template-saas .dashboard-stats { grid-template-columns: 1fr; }
    .template-saas .dashboard-stats article { display: grid; grid-template-columns: 1fr auto; }
    .template-saas .dashboard-stats small { grid-column: 1 / -1; }
    .template-saas .dashboard-lower { grid-template-columns: 1fr; }
    .template-saas .dashboard-welcome h1 { font-size: 22px; }
}`;

    const script = `document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});`;

    return {
        files: [
            { id: "index.html", name: "index.html", content: html },
            { id: "style.css", name: "style.css", content: css },
            { id: "script.js", name: "script.js", content: script }
        ],
        activeFile: "index.html"
    };
}


/* =========================================================
   PROJECT MIGRATION
   ========================================================= */

function normalizeProject(project) {

    if (
        project &&
        Array.isArray(project.files)
    ) {

        return {

            files: project.files.map(file => ({

                id:
                    file.id ||
                    file.name,

                name:
                    file.name ||
                    file.id,

                content:
                    typeof file.content === "string"
                        ? file.content
                        : ""

            })),

            activeFile:
                project.activeFile ||
                project.files[0]?.id ||
                null

        };

    }


    /*
     * Migration from the old:
     *
     * {
     *     html: "...",
     *     css: "...",
     *     js: "..."
     * }
     */

    if (
        project &&
        (
            "html" in project ||
            "css" in project ||
            "js" in project
        )
    ) {

        return {

            files: [

                {
                    id: "index.html",

                    name: "index.html",

                    content:
                        typeof project.html === "string"
                            ? project.html
                            : getDefaultContent(
                                "index.html"
                            )
                },

                {
                    id: "style.css",

                    name: "style.css",

                    content:
                        typeof project.css === "string"
                            ? project.css
                            : getDefaultContent(
                                "style.css"
                            )
                },

                {
                    id: "script.js",

                    name: "script.js",

                    content:
                        typeof project.js === "string"
                            ? project.js
                            : getDefaultContent(
                                "script.js"
                            )
                }

            ],

            activeFile:
                "index.html"

        };

    }


    return createDefaultProject();

}


function loadProject() {

    try {

        const raw =
            localStorage.getItem(
                PROJECT_STORAGE_KEY
            );

        if (!raw) {

            return createDefaultProject();

        }

        return normalizeProject(
            JSON.parse(raw)
        );

    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );

        return createDefaultProject();

    }

}


function saveProject() {

    try {

        localStorage.setItem(
            PROJECT_STORAGE_KEY,

            JSON.stringify({

                files:
                    buildzenFiles,

                activeFile:
                    activeFileId

            })
        );

    } catch (error) {

        console.error(
            "Failed to save project:",
            error
        );

    }

}


async function applyProject(project) {

    buildzenFiles = project.files;
    window.buildzenFiles = buildzenFiles;
    activeFileId = project.activeFile || buildzenFiles[0]?.id || null;

    saveProject();
    initializeEditors(buildzenFiles);
    renderFileTree();

    if (activeFileId) {
        switchEditor(activeFileId);
    }

    consoleEntries = [];
    renderConsole();
    await updatePreview();
}


/* =========================================================
   FILE HELPERS
   ========================================================= */

function getFile(fileId) {

    return buildzenFiles.find(
        file =>
            file.id === fileId
    );

}


function getFileByName(name) {

    return buildzenFiles.find(
        file =>
            file.name.toLowerCase() ===
            name.toLowerCase()
    );

}


function generateFileId(name) {

    let id = name;

    let counter = 2;

    while (getFile(id)) {

        const dot =
            name.lastIndexOf(".");

        if (dot === -1) {

            id =
                `${name}-${counter}`;

        } else {

            id =
                `${name.slice(0, dot)}-${counter}` +
                `${name.slice(dot)}`;

        }

        counter++;

    }

    return id;

}


function getFileIcon(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension === "html" ||
        extension === "htm"
    ) {

        return "HTML";

    }


    if (extension === "css") {

        return "CSS";

    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        return "JS";

    }


    if (extension === "json") {

        return "JSON";

    }


    if (
        extension === "png" ||
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "gif" ||
        extension === "svg" ||
        extension === "webp"
    ) {

        return "IMG";

    }


    return "FILE";

}


/* =========================================================
   FILE TREE
   ========================================================= */

function renderFileTree() {

    fileTree.innerHTML = "";

    for (const file of buildzenFiles) {

        const item =
            document.createElement("div");

        item.className =
            "file-item";


        if (file.id === activeFileId) {

            item.classList.add("active");

        }


        const icon =
            document.createElement("span");

        icon.className =
            "file-icon";

        icon.textContent =
            getFileIcon(file.name);


        const name =
            document.createElement("span");

        name.className =
            "file-name";

        name.textContent =
            file.name;

        name.title =
            file.name;


        item.append(
            icon,
            name
        );


        item.addEventListener(
            "click",
            () => {

                openFile(file.id);

            }
        );


        fileTree.appendChild(item);

    }

}


function openFile(fileId) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }

    activeFileId =
        fileId;

    switchEditor(fileId);

    renderFileTree();

    saveProject();

}


function updateFileContent(
    fileId,
    content
) {

    const file =
        getFile(fileId);

    if (!file) {
        return;
    }

    file.content =
        content;

    updatePreview();

}


function formatDocument(name, content) {

    const extension =
        name.split(".").pop().toLowerCase();

    const source =
        typeof content === "string"
            ? content
            : "";

    if (extension === "html") {

        const lines =
            source
                .replace(/>\s*</g, ">\n<")
                .split(/\n/);

        let indentLevel = 0;
        const formatted = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                continue;
            }

            const isClosingTag =
                /^<\//.test(trimmed);

            const isSelfClosing =
                /\/>$/.test(trimmed) ||
                /<\w+[^>]*\/>$/.test(trimmed);

            if (isClosingTag) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                !isClosingTag &&
                !isSelfClosing &&
                !trimmed.startsWith("<!--") &&
                !trimmed.endsWith("/>") &&
                !trimmed.endsWith("-->")
            ) {
                const openingTags =
                    (trimmed.match(/<\w+\b/g) || []).length;
                const closingTags =
                    (trimmed.match(/<\/\w+/g) || []).length;

                if (openingTags > closingTags) {
                    indentLevel += 1;
                }
            }
        }

        return formatted.join("\n");
    }


    if (extension === "css") {

        const lines =
            source.split(/\n/);

        let indentLevel = 0;
        const formatted = [];

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
                continue;
            }

            const closing =
                trimmed.startsWith("}");

            if (closing) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                trimmed.includes("{") &&
                !trimmed.endsWith("}")
            ) {
                indentLevel += 1;
            }
        }

        return formatted.join("\n");
    }


    if (
        extension === "js" ||
        extension === "mjs"
    ) {

        const lines =
            source
                .split(/\n/)
                .map(line => line.trimEnd());

        let indentLevel = 0;
        const formatted = [];

        for (const rawLine of lines) {
            const trimmed = rawLine.trim();

            if (!trimmed) {
                continue;
            }

            const isClosing =
                /^(\}|\)|\])$/.test(trimmed);

            if (isClosing) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formatted.push(
                `${"  ".repeat(indentLevel)}${trimmed}`
            );

            if (
                /[\{(\[]$/.test(trimmed) &&
                !trimmed.endsWith("};") &&
                !trimmed.endsWith("})") &&
                !trimmed.endsWith("])")) {
                indentLevel += 1;
            }
        }

        return formatted.join("\n");
    }

    return source;

}


/* =========================================================
   CREATE FILE
   ========================================================= */

async function createFile() {

    const name =
        await bzPrompt(
            "Enter the new file name:",
            "",
            "New File"
        );


    if (
        name === null ||
        name === undefined ||
        typeof name !== "string"
    ) {
        return;
    }


    const trimmed =
        name.trim();


    if (!trimmed) {

        await bzAlert(
            "A file name is required.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            trimmed
        )
    ) {

        await bzAlert(
            "That file name contains invalid characters.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (getFileByName(trimmed)) {

        await bzAlert(
            "A file with that name already exists.",
            "File Exists",
            "warning"
        );

        return;

    }


    const file = {

        id:
            generateFileId(trimmed),

        name:
            trimmed,

        content:
            getDefaultContent(trimmed)

    };


    buildzenFiles.push(file);

    addEditor(file);

    saveProject();

    renderFileTree();

    openFile(file.id);

    updatePreview();

}


/* =========================================================
   RENAME FILE
   ========================================================= */

async function renameCurrentFile() {

    if (!activeFileId) {
        return;
    }


    const file =
        getFile(activeFileId);

    if (!file) {
        return;
    }


    const newName =
        await bzPrompt(
            "Enter the new file name:",
            file.name,
            "Rename File"
        );


    if (
        newName === null ||
        newName === undefined ||
        typeof newName !== "string"
    ) {
        return;
    }


    const trimmed =
        newName.trim();


    if (!trimmed) {

        await bzAlert(
            "A file name is required.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    if (
        /[<>:"/\\|?*\x00-\x1F]/.test(
            trimmed
        )
    ) {

        await bzAlert(
            "That file name contains invalid characters.",
            "Invalid File Name",
            "warning"
        );

        return;

    }


    const existing =
        getFileByName(trimmed);


    if (
        existing &&
        existing.id !== file.id
    ) {

        await bzAlert(
            "A file with that name already exists.",
            "File Exists",
            "warning"
        );

        return;

    }


    file.name =
        trimmed;

    saveProject();

    renderFileTree();

    switchEditor(file.id);

    updatePreview();

}


/* =========================================================
   DELETE FILE
   ========================================================= */

async function deleteCurrentFile() {

    if (!activeFileId) {
        return;
    }


    const file =
        getFile(activeFileId);

    if (!file) {
        return;
    }


    const protectedFiles = [
        "index.html",
        "style.css",
        "script.js"
    ];


    if (
        protectedFiles.includes(
            file.name.toLowerCase()
        )
    ) {

        await bzAlert(
            `${file.name} is a required project file and cannot be deleted.`,
            "Cannot Delete File",
            "warning"
        );

        return;

    }


    const confirmed =
        await bzConfirm(
            `Delete "${file.name}"? This cannot be undone.`,
            "Delete File",
            "danger"
        );


    if (!confirmed) {
        return;
    }


    const index =
        buildzenFiles.findIndex(
            item =>
                item.id === file.id
        );


    if (index === -1) {
        return;
    }


    removeEditor(file.id);


    buildzenFiles.splice(
        index,
        1
    );


    const nextFile =
        buildzenFiles[index] ||
        buildzenFiles[index - 1] ||
        buildzenFiles[0];


    activeFileId =
        nextFile?.id ||
        null;


    saveProject();

    renderFileTree();


    if (activeFileId) {

        switchEditor(
            activeFileId
        );

    }


    updatePreview();

}


/* =========================================================
   PREVIEW CONTROLLER
   ========================================================= */

const previewController =
    createPreviewController({

        preview,

        status,

        previewStatus,

        getFiles:
            () => buildzenFiles

    });

let activePreviewMode = "desktop";


function setPreviewMode(mode) {

    activePreviewMode = mode;

    if (previewViewport) {
        previewViewport.dataset.mode = mode;

        if (mode === "custom") {
            previewViewport.style.setProperty(
                "--preview-width",
                `${previewWidthInput.value}px`
            );
        } else {
            previewViewport.style.removeProperty("--preview-width");
        }
    }

    if (previewWidthInput && mode !== "custom") {
        const presetWidths = {
            tablet: 768,
            mobile: 390
        };

        previewWidthInput.value = String(
            presetWidths[mode] ||
            Math.max(320, Math.round(previewViewport?.clientWidth || 1280))
        );
    }

    previewDeviceButtons.forEach((button) => {

        const isActive =
            button.dataset.device === mode;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));

    });

}


previewDeviceButtons.forEach((button) => {

    button.addEventListener("click", () => {
        setPreviewMode(button.dataset.device);
    });

});


function applyCustomPreviewWidth() {

    if (!previewWidthInput || !previewViewport) return;

    const requestedWidth = Number(previewWidthInput.value);
    if (!Number.isFinite(requestedWidth) || !previewWidthInput.value) return;

    const width = Math.min(1920, Math.max(320, Math.round(requestedWidth)));
    previewWidthInput.value = String(width);
    setPreviewMode("custom");
}


previewWidthInput?.addEventListener("input", () => {
    if (previewWidthInput.value.length >= 3) {
        applyCustomPreviewWidth();
    }
});

previewWidthInput?.addEventListener("change", applyCustomPreviewWidth);

previewZoomSelect?.addEventListener("change", () => {
    if (preview) {
        preview.style.zoom = `${previewZoomSelect.value}%`;
    }
});


if (previewReloadBtn) {
    previewReloadBtn.addEventListener("click", () => {
        previewController.reloadPreview();
    });
}


if (previewOpenBtn) {
    previewOpenBtn.addEventListener("click", () => {
        previewController.openPreviewWindow();
    });
}


if (previewFullscreenBtn) {
    previewFullscreenBtn.addEventListener("click", async () => {

        try {

            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }

            if (previewViewport) {
                await previewViewport.requestFullscreen();
            }

        } catch (error) {
            console.warn("Fullscreen preview is unavailable:", error);
        }

    });
}


setPreviewMode(activePreviewMode);


async function updatePreview() {

    return previewController.updatePreview();

}


/* =========================================================
   CONSOLE
   ========================================================= */

let consoleEntries = [];

let activeConsoleFilter =
    "all";

let dirtyFiles = new Set();
let autoSaveTimer = null;


function setSaveStatus(text, state = "saved") {

    if (!saveStatus) {
        return;
    }

    saveStatus.textContent = text;
    saveStatus.dataset.state = state;

}


function formatConsoleValue(value) {

    if (value === null) {
        return "null";
    }


    if (value === undefined) {
        return "undefined";
    }


    if (
        typeof value === "object"
    ) {

        try {

            return JSON.stringify(
                value,
                null,
                2
            );

        } catch {

            return String(value);

        }

    }


    return String(value);

}


function addConsoleEntry(
    type,
    args,
    location = null
) {

    consoleEntries.push({

        type,

        args,

        location,

        time:
            new Date()

    });


    renderConsole();

}


function renderConsole() {

    consoleOutput.innerHTML =
        "";


    const filtered =
        activeConsoleFilter === "all"
            ? consoleEntries
            : consoleEntries.filter(
                entry =>
                    entry.type ===
                    activeConsoleFilter
            );


    for (
        const entry
        of filtered
    ) {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            `console-entry console-${entry.type}`;

        if (entry.location) {
            row.title =
                `${entry.location.file || "Unknown file"}${entry.location.line ? `:${entry.location.line}` : ""}`;
            row.style.cursor = "pointer";
            row.addEventListener("click", () => {
                if (!entry.location.file) {
                    return;
                }

                const file =
                    buildzenFiles.find(
                        candidate =>
                            candidate.name.toLowerCase() ===
                            entry.location.file.toLowerCase()
                    );

                if (!file) {
                    return;
                }

                openFile(file.id);

                const editor =
                    editors[file.id];

                if (!editor) {
                    return;
                }

                const lineNumber =
                    Math.max(1, Number(entry.location.line || 1));

                const line =
                    editor.state.doc.line(lineNumber);

                editor.dispatch({
                    selection: {
                        anchor: line.from,
                        head: line.from
                    }
                });

                editor.focus();
            });
        }


        const time =
            document.createElement(
                "span"
            );

        time.className =
            "console-time";

        time.textContent =
            entry.time.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );


        const message =
            document.createElement(
                "span"
            );

        message.className =
            "console-message";

        message.textContent =
            entry.args
                .map(
                    formatConsoleValue
                )
                .join(" ");


        row.append(
            time,
            message
        );


        consoleOutput.appendChild(
            row
        );

    }


    consoleCount.textContent =
        `(${consoleEntries.length})`;


    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;

}


function scheduleAutoSave(fileId) {

    if (fileId) {
        dirtyFiles.add(fileId);
    }

    setSaveStatus("Saving...", "saving");

    clearTimeout(autoSaveTimer);

    autoSaveTimer =
        setTimeout(() => {

            if (dirtyFiles.size === 0) {
                setSaveStatus("Saved", "saved");
                return;
            }

            dirtyFiles.forEach(id => {
                const file =
                    getFile(id);

                if (!file) {
                    return;
                }

                file.content =
                    getEditorContent(id);
            });

            dirtyFiles.clear();
            saveProject();
            setSaveStatus("Saved", "saved");

        }, 350);

}


function saveCurrentProject() {

    dirtyFiles.forEach(id => {
        const file =
            getFile(id);

        if (!file) {
            return;
        }

        file.content =
            getEditorContent(id);
    });

    dirtyFiles.clear();
    saveProject();
    setSaveStatus("Saved", "saved");

}


window.addEventListener(
    "message",
    event => {

        if (
            !event.data ||
            event.data.source !==
            "buildzen-preview"
        ) {

            return;

        }


        const location =
            event.data.location || null;

        addConsoleEntry(
            event.data.type ||
            "log",

            Array.isArray(
                event.data.args
            )
                ? event.data.args
                : [
                    event.data.args
                ],

            location
        );

    }
);


consoleFilters.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                consoleFilters.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                activeConsoleFilter =
                    button.dataset.filter ||
                    "all";


                renderConsole();

            }
        );

    }
);


clearConsoleBtn.addEventListener(
    "click",
    () => {

        consoleEntries = [];

        renderConsole();

    }
);


/* =========================================================
   EDITOR EVENTS
   ========================================================= */

window.addEventListener(
    "buildzen-edit",
    event => {

        const {
            fileId,
            content
        } = event.detail || {};


        if (!fileId) {
            return;
        }


        updateFileContent(
            fileId,
            content
        );

        scheduleAutoSave(fileId);

    }
);


window.addEventListener(
    "buildzen-refresh",
    () => {

        updatePreview();

    }
);


window.addEventListener(
    "buildzen-save",
    () => {

        if (!activeFileId) {
            return;
        }

        saveCurrentProject();

        console.log(
            `Saved ${activeFileId}.`
        );

    }
);

window.addEventListener(
    "beforeunload",
    event => {
        if (dirtyFiles.size > 0) {
            event.preventDefault();
            event.returnValue = "";
        }
    }
);

window.addEventListener(
    "buildzen-format-document",
    event => {
        const {
            fileId
        } = event.detail || {};

        if (!fileId) {
            return;
        }

        const file =
            getFile(fileId);

        if (!file) {
            return;
        }

        const formatted =
            formatDocument(file.name, file.content);

        if (formatted === file.content) {
            return;
        }

        setEditorContent(fileId, formatted);
        updateFileContent(fileId, formatted);
        scheduleAutoSave(fileId);
    }
);


/* =========================================================
   ASSET EVENTS
   ========================================================= */

window.addEventListener(
    "buildzen-assets-changed",
    () => {

        updatePreview();

    }
);


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

newFileBtn.addEventListener(
    "click",
    createFile
);


renameFileBtn.addEventListener(
    "click",
    renameCurrentFile
);


deleteFileBtn.addEventListener(
    "click",
    deleteCurrentFile
);


refreshBtn.addEventListener(
    "click",
    () => {

        updatePreview();

    }
);


if (docsBtn) {
    docsBtn.addEventListener(
        "click",
        () => {

            window.open(
                "./docs.html",
                "_blank",
                "noopener,noreferrer"
            );

        }
    );
}


function renderTemplatePicker() {

    templateGrid.innerHTML = PROJECT_TEMPLATES.map(template => `
        <button class="template-option" type="button" data-template="${template.id}"
            style="--template-accent: ${template.accent}; --template-ground: ${template.background}">
            <span class="template-thumbnail" aria-hidden="true">
                <span class="template-thumbnail-window"><i></i><i></i><i></i></span>
                <span class="template-thumbnail-art"></span>
                <span class="template-thumbnail-lines"></span>
            </span>
            <span class="template-option-copy">
                <span class="template-option-heading"><strong>${template.name}</strong><small>${template.category}</small></span>
                <span class="template-option-description">${template.description}</span>
            </span>
            <span class="template-option-arrow" aria-hidden="true">↗</span>
        </button>
    `).join("");
}


async function insertUIBlock(blockId, position = null) {

    const block = UI_BLOCKS.find(item => item.id === blockId);
    const file = getFile(activeFileId);
    const extension = file?.name.split(".").pop().toLowerCase();

    if (!block) return;

    if (!file || !["html", "htm"].includes(extension)) {
        await bzAlert(
            "Select an HTML file before inserting a layout block.",
            "HTML File Required",
            "warning"
        );
        return;
    }

    const view = getActiveEditor();
    if (!view) return;

    const source = view.state.doc.toString();
    let insertionPoint = Number.isInteger(position)
        ? position
        : view.state.selection.main.head;
    if (position === null && insertionPoint === 0) {
        const bodyEnd = source.toLowerCase().lastIndexOf("</body>");
        if (bodyEnd >= 0) insertionPoint = bodyEnd;
    } else if (Number.isInteger(position)) {
        const doctype = source.match(/<!doctype\b[^>]*>/i);
        const bodyOpen = source.match(/<body\b[^>]*>/i);
        const insideDoctype = doctype && insertionPoint >= doctype.index &&
            insertionPoint <= doctype.index + doctype[0].length;

        if (bodyOpen && (insideDoctype || insertionPoint === 0)) {
            insertionPoint = bodyOpen.index + bodyOpen[0].length;
        }
    }
    const prefix = insertionPoint > 0 && view.state.doc.sliceString(insertionPoint - 1, insertionPoint) !== "\n"
        ? "\n\n"
        : "";
    const insertion = `${prefix}${block.markup}\n`;

    view.dispatch({
        changes: { from: insertionPoint, insert: insertion },
        selection: { anchor: insertionPoint + insertion.length }
    });
    view.focus();

    updateFileContent(activeFileId, view.state.doc.toString());
    scheduleAutoSave(activeFileId);
}


blockPalette.addEventListener("click", event => {
    const item = event.target.closest("[data-block]");
    if (item) insertUIBlock(item.dataset.block);
});

blockPalette.addEventListener("dragstart", event => {
    const item = event.target.closest("[data-block]");
    if (!item || !event.dataTransfer) return;

    const block = UI_BLOCKS.find(entry => entry.id === item.dataset.block);
    if (!block) return;

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-buildzen-block", block.id);
    event.dataTransfer.setData("text/html", block.markup);
    item.classList.add("dragging");
});

blockPalette.addEventListener("dragend", event => {
    event.target.closest("[data-block]")?.classList.remove("dragging");
    editorContainer.classList.remove("block-drop-active");
});

editorContainer.addEventListener("dragover", event => {
    const types = Array.from(event.dataTransfer?.types || []);
    if (!types.includes("application/x-buildzen-block")) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    editorContainer.classList.add("block-drop-active");
});

editorContainer.addEventListener("dragleave", event => {
    if (!editorContainer.contains(event.relatedTarget)) {
        editorContainer.classList.remove("block-drop-active");
    }
});

editorContainer.addEventListener("drop", event => {
    const blockId = event.dataTransfer?.getData("application/x-buildzen-block");
    if (!blockId) return;

    event.preventDefault();
    editorContainer.classList.remove("block-drop-active");

    const view = getActiveEditor();
    const position = view?.posAtCoords({ x: event.clientX, y: event.clientY });
    insertUIBlock(blockId, position ?? null);
});


templatesBtn.addEventListener("click", () => {
    renderTemplatePicker();
    templateDialog.showModal();
});

closeTemplateDialogBtn.addEventListener("click", () => {
    templateDialog.close();
});

templateGrid.addEventListener("click", async event => {
    const option = event.target.closest("[data-template]");
    if (!option) return;

    const template = PROJECT_TEMPLATES.find(
        item => item.id === option.dataset.template
    );
    if (!template) return;

    templateDialog.close();

    const confirmed = await bzConfirm(
        `Start a new ${template.name.toLowerCase()} project? Your current files will be replaced.`,
        `Use ${template.name} Template`,
        "warning"
    );
    if (!confirmed) {
        templateDialog.showModal();
        return;
    }

    await applyProject(createTemplateProject(template.id));
    console.info(`${template.name} template loaded.`);
});


/* =========================================================
   RESET
   ========================================================= */

resetBtn.addEventListener(
    "click",
    async () => {

        const confirmed =
            await bzConfirm(
                "Reset the project to the default files? Your current project will be replaced.",
                "Reset Project",
                "danger"
            );


        if (!confirmed) {
            return;
        }


        await applyProject(createDefaultProject());


        console.log(
            "Project reset."
        );

    }
);


/* =========================================================
   STARTUP
   ========================================================= */

async function initializeApp() {

    setLoadingStatus(
        "HANDSHAKING..."
    );


    /*
     * Load the saved project.
     */

    const project =
        loadProject();


    setLoadingStatus(
        "TRANSFERRING DATA..."
    );


    buildzenFiles =
        project.files;


    window.buildzenFiles =
        buildzenFiles;


    activeFileId =
        project.activeFile ||
        buildzenFiles[0]?.id ||
        null;


    /*
     * Initialize CodeMirror.
     */

    setLoadingStatus(
        "INITIALIZING EDITOR..."
    );


    initializeEditors(
        buildzenFiles
    );


    renderFileTree();


    if (activeFileId) {

        switchEditor(
            activeFileId
        );

    }


    /*
     * Load IndexedDB assets.
     */

    setLoadingStatus(
        "LOADING ASSETS..."
    );


    try {

        await renderAssets();

    } catch (error) {

        console.error(
            "Failed to load assets:",
            error
        );

    }


    /*
     * Build the initial preview.
     */

    setLoadingStatus(
        "BUILDING PREVIEW..."
    );


    await updatePreview();


    /*
     * Everything is ready.
     */

    setLoadingStatus(
        "READY"
    );


    setTimeout(() => {

        finishLoading();

    }, 250);

}


initializeApp().catch(
    error => {

        console.error(
            "Failed to initialize Buildzen:",
            error
        );


        setLoadingStatus(
            "INITIALIZATION FAILED"
        );

    }
);