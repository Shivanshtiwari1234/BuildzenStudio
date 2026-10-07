export function createPythonApiProject() {
    return {
        files: [
            {
                id: "index.html",
                name: "static/index.html",
                content: `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f3f1e9">
    <title>Fieldnotes | Python API starter</title>
    <link rel="stylesheet" href="./static/style.css">
    <script src="./static/app.js" defer></script>
</head>
<body>
    <header class="topbar">
        <a class="wordmark" href="#top">fieldnotes<span>.</span></a>
        <span class="connection"><i id="health-dot"></i><span id="health-label">Connecting to API</span></span>
    </header>
    <main id="top">
        <section class="intro">
            <p class="eyebrow">A SMALL FULL-STACK START</p>
            <h1>Ideas, in<br><em>good company.</em></h1>
            <p class="lede">A real page connected to a Python API. Add a note, see it arrive, then make the project your own.</p>
        </section>
        <section class="workspace" aria-labelledby="notes-title">
            <div class="section-heading">
                <div><p class="eyebrow">YOUR WORKSPACE</p><h2 id="notes-title">Notes</h2></div>
                <span id="note-count" class="count">0 notes</span>
            </div>
            <form id="note-form" class="note-form">
                <label class="visually-hidden" for="note-text">Write a note</label>
                <input id="note-text" name="text" maxlength="240" placeholder="Write something worth keeping..." required>
                <button type="submit">Add note <span aria-hidden="true">+</span></button>
            </form>
            <p id="feedback" class="feedback" role="status" aria-live="polite">Checking the API...</p>
            <ul id="notes-list" class="notes-list" aria-label="Saved notes"></ul>
        </section>
        <footer><span>Python API starter</span><span>FastAPI · one process · one origin</span></footer>
    </main>
</body>
</html>`
            },
            {
                id: "style.css",
                name: "static/style.css",
                content: `:root {
    color-scheme: light;
    font-family: "Avenir Next", Avenir, "Segoe UI", sans-serif;
    color: #202720;
    background: #f3f1e9;
    font-synthesis: none;
}

* { box-sizing: border-box; }
body { min-width: 320px; min-height: 100vh; margin: 0; }
.topbar { height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 max(24px, calc((100vw - 1000px) / 2)); border-bottom: 1px solid #2027201c; }
.wordmark { color: inherit; font-family: Georgia, serif; font-size: 22px; text-decoration: none; }
.wordmark span { color: #d65b3d; }
.connection { display: flex; align-items: center; gap: 8px; color: #5f695f; font-size: 12px; }
.connection i { width: 8px; height: 8px; border-radius: 50%; background: #c48b34; }
.connection[data-state="online"] i { background: #3b8b60; }
.connection[data-state="offline"] i { background: #c9503d; }
main { width: min(100% - 48px, 760px); margin: 0 auto; }
.intro { padding: 74px 0 58px; }
.eyebrow { margin: 0 0 14px; color: #6a7569; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(54px, 9vw, 88px); font-weight: 400; line-height: .98; }
h1 em { color: #d65b3d; font-weight: 400; }
.lede { max-width: 420px; margin: 24px 0 0; color: #60695f; font-size: 15px; line-height: 1.7; }
.workspace { padding: 26px 0 52px; border-top: 1px solid #2027201c; }
.section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
.section-heading .eyebrow { margin-bottom: 7px; }
h2 { margin: 0; font-family: Georgia, serif; font-size: 30px; font-weight: 400; }
.count { color: #778075; font-size: 12px; }
.note-form { display: flex; gap: 8px; }
.note-form input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 1px solid #20272030; border-radius: 3px; background: #fbfaf6; color: inherit; font: inherit; }
.note-form input:focus-visible, .note-form button:focus-visible { outline: 2px solid #d65b3d; outline-offset: 2px; }
.note-form button { height: 48px; padding: 0 16px; border: 0; border-radius: 3px; background: #26372e; color: white; font: inherit; cursor: pointer; }
.note-form button span { margin-left: 9px; font-size: 18px; }
.note-form button:disabled { opacity: .55; cursor: wait; }
.feedback { min-height: 20px; margin: 12px 0; color: #687167; font-size: 12px; }
.feedback[data-state="error"] { color: #a73f30; }
.notes-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.notes-list li { padding: 14px 15px; border: 1px solid #20272018; border-radius: 3px; background: #fbfaf6; overflow-wrap: anywhere; }
.empty { padding: 22px 0; color: #778075; font-family: Georgia, serif; font-size: 17px; }
footer { display: flex; justify-content: space-between; gap: 12px; padding: 18px 0 24px; border-top: 1px solid #2027201c; color: #778075; font-size: 11px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 520px) { .topbar { padding-inline: 20px; } main { width: min(100% - 40px, 760px); } .intro { padding-top: 56px; } .note-form { flex-direction: column; } .note-form button { align-self: flex-start; } footer { flex-direction: column; } }
`
            },
            {
                id: "app.js",
                name: "static/app.js",
                content: `const healthDot = document.querySelector("#health-dot");
const healthLabel = document.querySelector("#health-label");
const connection = document.querySelector(".connection");
const noteForm = document.querySelector("#note-form");
const noteInput = document.querySelector("#note-text");
const noteList = document.querySelector("#notes-list");
const noteCount = document.querySelector("#note-count");
const feedback = document.querySelector("#feedback");
const submitButton = noteForm.querySelector("button");

function showFeedback(message, state = "") {
    feedback.textContent = message;
    feedback.dataset.state = state;
}

function renderNotes(notes) {
    noteList.replaceChildren();
    noteCount.textContent = \`\${notes.length} \${notes.length === 1 ? "note" : "notes"}\`;

    if (notes.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent = "Your first note starts here.";
        noteList.append(empty);
        return;
    }

    for (const note of notes) {
        const item = document.createElement("li");
        item.textContent = note.text;
        noteList.append(item);
    }
}

async function loadNotes() {
    const response = await fetch("/api/notes");
    if (!response.ok) throw new Error("The notes endpoint returned an error.");
    const data = await response.json();
    renderNotes(data.notes);
}

async function connect() {
    try {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error("API health check failed.");
        const health = await response.json();
        healthDot.dataset.state = "online";
        connection.dataset.state = "online";
        healthLabel.textContent = health.message;
        await loadNotes();
        showFeedback("Connected. Notes live in the API process memory.");
    } catch {
        connection.dataset.state = "offline";
        healthLabel.textContent = "API not connected";
        showFeedback("Start the Python API with the commands in README.md to enable notes.", "error");
        renderNotes([]);
    }
}

noteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const text = noteInput.value.trim();
    if (!text) return;

    submitButton.disabled = true;
    showFeedback("Adding note...");

    try {
        const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        if (!response.ok) {
            const detail = await response.json().catch(() => null);
            throw new Error(detail?.detail || "The note could not be added.");
        }

        noteInput.value = "";
        await loadNotes();
        showFeedback("Note added.");
    } catch (error) {
        showFeedback(error.message || "The API is unavailable.", "error");
    } finally {
        submitButton.disabled = false;
    }
});

connect();`
            },
            {
                id: "main.py",
                name: "main.py",
                content: `from pathlib import Path
import sqlite3
from uuid import uuid4

from fastapi import FastAPI, status
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator


app = FastAPI(title="Fieldnotes API", version="0.1.0")
database_path = Path(__file__).parent / "data" / "fieldnotes.db"
database_path.parent.mkdir(parents=True, exist_ok=True)

with sqlite3.connect(database_path) as connection:
    connection.execute(
        "CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, text TEXT NOT NULL)"
    )


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=240)

    @field_validator("text")
    @classmethod
    def trim_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("Note text cannot be blank.")
        return text


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Python API connected"}


@app.get("/api/notes")
def list_notes() -> dict[str, list[dict[str, str]]]:
    with sqlite3.connect(database_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT id, text FROM notes ORDER BY rowid DESC"
        ).fetchall()
    return {"notes": [dict(row) for row in rows]}


@app.post("/api/notes", status_code=status.HTTP_201_CREATED)
def create_note(note: NoteCreate) -> dict[str, str]:
    saved_note = {"id": str(uuid4()), "text": note.text}
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO notes (id, text) VALUES (?, ?)",
            (saved_note["id"], saved_note["text"]),
        )
    return saved_note


static_dir = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
`
            },
            {
                id: "requirements.txt",
                name: "requirements.txt",
                content: `fastapi>=0.115,<1.0
uvicorn[standard]>=0.34,<1.0
`
            },
            {
                id: "README.md",
                name: "README.md",
                content: `# Fieldnotes: Python API starter

A small full-stack website with a static frontend and a FastAPI backend served from the same origin. Notes are stored in a local SQLite database at \`data/fieldnotes.db\` and survive API restarts.

## Requirements

- Python 3.10 or newer

## Run locally

Create and activate a virtual environment from this project directory:

\`\`\`sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
\`\`\`

On Windows PowerShell, activate with \`.venv\\Scripts\\Activate.ps1\` instead. Open http://127.0.0.1:8000. Interactive API documentation is available at http://127.0.0.1:8000/docs.

## API

- \`GET /api/health\` checks the service.
- \`GET /api/notes\` lists notes stored in SQLite.
- \`POST /api/notes\` accepts JSON such as \`{\"text\": \"Start here\"}\`.

The frontend is in \`static/\`; the API is in \`main.py\`. The database is created on first run. Add authentication and backups before using this in production.
`
            },
            {
                id: ".gitignore",
                name: ".gitignore",
                content: `.venv/\n__pycache__/\n*.py[cod]\n.env\ndata/*.db\n`
            }
        ],
        activeFile: "index.html"
    };
}
