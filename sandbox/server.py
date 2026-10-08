import asyncio
import hashlib
import json
import os
import re
import shutil
import threading
import time
import uuid
from pathlib import Path, PurePosixPath
from typing import Literal

import docker
import httpx
from docker.errors import DockerException, NotFound
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, ValidationError


STATE_DIR = Path(os.environ.get("SANDBOX_STATE_DIR", "/var/lib/buildzen-sandboxes"))
PREVIEW_DOMAIN = os.environ.get("SANDBOX_PREVIEW_DOMAIN", "").strip().lower()
PREVIEW_SCHEME = os.environ.get("SANDBOX_PREVIEW_SCHEME", "https")
USER_HEADER = os.environ.get("SANDBOX_USER_HEADER", "X-Authenticated-User").lower()
IMAGE = os.environ.get("SANDBOX_IMAGE", "buildzen-python-api:1")
RUNTIME = "runsc"
SANDBOX_TTL_SECONDS = 3600
MAX_SANDBOXES = 32
MAX_FILES = 80
MAX_PROJECT_BYTES = 2 * 1024 * 1024
MAX_PROJECT_REQUEST_BYTES = 3 * 1024 * 1024
MAX_PREVIEW_REQUEST_BYTES = 1024 * 1024
MAX_RESPONSE_BYTES = 16 * 1024 * 1024
MANAGED_LABEL = "io.buildzen.managed"
OWNER_LABEL = "io.buildzen.owner"
ID_LABEL = "io.buildzen.id"
EXPIRY_LABEL = "io.buildzen.expires"
NETWORK_LABEL = "io.buildzen.network"
HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host",
}

if not re.fullmatch(r"[a-z0-9.-]+", PREVIEW_DOMAIN):
    raise RuntimeError("SANDBOX_PREVIEW_DOMAIN must be a configured wildcard preview domain")
if PREVIEW_SCHEME not in {"http", "https"}:
    raise RuntimeError("SANDBOX_PREVIEW_SCHEME must be http or https")

STATE_DIR.mkdir(parents=True, exist_ok=True)
client = docker.from_env()
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
launch_times = {}
sandbox_lock = asyncio.Lock()


class ProjectFile(BaseModel):
    name: str
    content: str


class StartRequest(BaseModel):
    command: Literal["start-fastapi"]
    files: list[ProjectFile] = Field(min_length=1, max_length=MAX_FILES)


def owner_for(request: Request) -> str:
    user = request.headers.get(USER_HEADER, "").strip()
    if (
        not user
        or len(user) > 256
        or "," in user
        or any(ord(character) < 32 or ord(character) == 127 for character in user)
    ):
        raise HTTPException(status_code=401, detail="Sign in to use the sandbox")
    return hashlib.sha256(user.encode("utf-8")).hexdigest()


def require_action(request: Request) -> None:
    if request.headers.get("x-buildzen-sandbox-action") != "1":
        raise HTTPException(status_code=403, detail="Invalid sandbox action")


async def read_limited_body(request: Request, limit: int) -> bytes:
    chunks = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise HTTPException(status_code=413, detail="Request body exceeds its size limit")
        chunks.append(chunk)
    return b"".join(chunks)


def preview_url(sandbox_id: str) -> str:
    return f"{PREVIEW_SCHEME}://{sandbox_id}.{PREVIEW_DOMAIN}/"


def get_managed_containers(all_containers=True):
    return client.containers.list(
        all=all_containers,
        filters={"label": f"{MANAGED_LABEL}=true"},
    )


def find_owner_container(owner: str):
    for container in get_managed_containers():
        labels = container.labels or {}
        if labels.get(OWNER_LABEL) == owner and container.status == "running":
            return container
    return None


def cleanup_container(container):
    labels = container.labels or {}
    network_name = labels.get(NETWORK_LABEL)
    sandbox_id = labels.get(ID_LABEL)
    try:
        container.remove(force=True, v=True)
    except NotFound:
        pass
    if network_name:
        try:
            client.networks.get(network_name).remove()
        except (NotFound, DockerException):
            pass
    if sandbox_id:
        shutil.rmtree(STATE_DIR / sandbox_id, ignore_errors=True)


def cleanup_expired():
    now = int(time.time())
    for container in get_managed_containers():
        expiry = int((container.labels or {}).get(EXPIRY_LABEL, "0"))
        if expiry <= now or container.status != "running":
            cleanup_container(container)


def cleanup_loop():
    while True:
        try:
            cleanup_expired()
        except DockerException:
            pass
        time.sleep(60)


@app.on_event("startup")
def start_cleanup_loop():
    threading.Thread(target=cleanup_loop, daemon=True).start()


def validate_and_write_files(sandbox_id: str, files: list[ProjectFile]) -> Path:
    root = STATE_DIR / sandbox_id
    total_bytes = 0
    seen_names = set()

    for project_file in files:
        raw_name = project_file.name
        if not raw_name or "\\" in raw_name or "\x00" in raw_name:
            raise HTTPException(status_code=400, detail="Invalid project file path")
        parts = raw_name.split("/")
        relative = PurePosixPath(raw_name)
        if relative.is_absolute() or any(part in {"", ".", ".."} for part in parts):
            raise HTTPException(status_code=400, detail="Invalid project file path")
        if raw_name in seen_names:
            raise HTTPException(status_code=400, detail="Duplicate project file path")
        seen_names.add(raw_name)
        total_bytes += len(project_file.content.encode("utf-8"))
        if total_bytes > MAX_PROJECT_BYTES:
            raise HTTPException(status_code=413, detail="Project exceeds the 2 MB sandbox limit")

    if "main.py" not in seen_names:
        raise HTTPException(status_code=400, detail="This command requires a top-level main.py")

    root.mkdir(mode=0o755, parents=True, exist_ok=False)
    try:
        for project_file in files:
            target = root.joinpath(*PurePosixPath(project_file.name).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(project_file.content, encoding="utf-8")
        (root / "data").mkdir(exist_ok=True)
    except Exception:
        shutil.rmtree(root, ignore_errors=True)
        raise
    return root


def start_container(owner: str, payload: StartRequest):
    try:
        runtimes = client.info().get("Runtimes", {})
        if RUNTIME not in runtimes:
            raise HTTPException(status_code=503, detail="The host must install and configure gVisor (runsc)")

        current = find_owner_container(owner)
        if current:
            raise HTTPException(status_code=409, detail="You already have a running API sandbox")

        containers = get_managed_containers(all_containers=False)
        if len(containers) >= MAX_SANDBOXES:
            raise HTTPException(status_code=429, detail="Sandbox capacity is full")

        now = time.time()
        recent = [stamp for stamp in launch_times.get(owner, []) if now - stamp < 60]
        if len(recent) >= 3:
            raise HTTPException(status_code=429, detail="Please wait before starting another sandbox")
        launch_times[owner] = [*recent, now]

        sandbox_id = str(uuid.uuid4())
        root = validate_and_write_files(sandbox_id, payload.files)
        network_name = f"bz-{sandbox_id[:12]}"
        labels = {
            MANAGED_LABEL: "true",
            OWNER_LABEL: owner,
            ID_LABEL: sandbox_id,
            EXPIRY_LABEL: str(int(now + SANDBOX_TTL_SECONDS)),
            NETWORK_LABEL: network_name,
        }

        network = client.networks.create(
            network_name,
            driver="bridge",
            internal=True,
            labels={MANAGED_LABEL: "true", ID_LABEL: sandbox_id},
        )
        container = client.containers.create(
            IMAGE,
            name=f"buildzen-{sandbox_id}",
            command=["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            runtime=RUNTIME,
            network=network.name,
            labels=labels,
            user="10001:10001",
            working_dir="/project",
            volumes={str(root): {"bind": "/project", "mode": "ro"}},
            read_only=True,
            tmpfs={
                "/tmp": "rw,noexec,nosuid,size=16m,uid=10001,gid=10001,mode=700",
                "/project/data": "rw,noexec,nosuid,size=16m,uid=10001,gid=10001,mode=700",
            },
            cap_drop=["ALL"],
            security_opt=["no-new-privileges:true"],
            mem_limit="256m",
            nano_cpus=500_000_000,
            pids_limit=64,
            log_config={
                "type": "local",
                "config": {"max-size": "5m", "max-file": "2"},
            },
            environment={
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
            },
        )
        container.start()
        container.reload()
        address = container.attrs["NetworkSettings"]["Networks"][network.name]["IPAddress"]
        if not address:
            raise RuntimeError("Sandbox container has no internal address")

        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            try:
                health = httpx.get(f"http://{address}:8000/api/health", timeout=0.5)
                if health.status_code < 500:
                    return {
                        "id": sandbox_id,
                        "previewUrl": preview_url(sandbox_id),
                        "expiresAt": int(now + SANDBOX_TTL_SECONDS),
                    }
            except httpx.HTTPError:
                time.sleep(0.25)
        raise RuntimeError("The API did not become ready within 20 seconds")
    except HTTPException:
        raise
    except Exception as error:
        try:
            container
        except UnboundLocalError:
            pass
        else:
            try:
                cleanup_container(container)
            except Exception:
                pass
        if "sandbox_id" in locals():
            try:
                client.networks.get(f"bz-{sandbox_id[:12]}").remove()
            except Exception:
                pass
            shutil.rmtree(STATE_DIR / sandbox_id, ignore_errors=True)
        raise HTTPException(status_code=502, detail=f"Sandbox could not start: {error}") from error


@app.get("/api/sandboxes/me")
def my_sandbox(request: Request):
    owner = owner_for(request)
    cleanup_expired()
    container = find_owner_container(owner)
    if not container:
        return {"sandbox": None}
    labels = container.labels or {}
    sandbox_id = labels[ID_LABEL]
    return {
        "sandbox": {
            "id": sandbox_id,
            "previewUrl": preview_url(sandbox_id),
            "expiresAt": int(labels[EXPIRY_LABEL]),
        }
    }


@app.post("/api/sandboxes")
async def create_sandbox(request: Request):
    require_action(request)
    owner = owner_for(request)
    body = await read_limited_body(request, MAX_PROJECT_REQUEST_BYTES)
    try:
        payload = StartRequest.model_validate(json.loads(body))
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(status_code=422, detail="Invalid sandbox request")
    async with sandbox_lock:
        cleanup_expired()
        return {"sandbox": await asyncio.to_thread(start_container, owner, payload)}


@app.delete("/api/sandboxes/{sandbox_id}")
def stop_sandbox(sandbox_id: str, request: Request):
    require_action(request)
    owner = owner_for(request)
    try:
        uuid.UUID(sandbox_id)
        container = client.containers.get(f"buildzen-{sandbox_id}")
    except (ValueError, NotFound):
        raise HTTPException(status_code=404, detail="Sandbox not found")
    if (container.labels or {}).get(OWNER_LABEL) != owner:
        raise HTTPException(status_code=404, detail="Sandbox not found")
    cleanup_container(container)
    return {"sandbox": None}


@app.api_route(
    "/{path:path}",
    methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_preview(path: str, request: Request):
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    suffix = f".{PREVIEW_DOMAIN}"
    if not host.endswith(suffix):
        raise HTTPException(status_code=404, detail="Not found")
    sandbox_id = host[:-len(suffix)]
    try:
        uuid.UUID(sandbox_id)
        container = client.containers.get(f"buildzen-{sandbox_id}")
    except (ValueError, NotFound):
        raise HTTPException(status_code=404, detail="Sandbox not found or expired")
    if container.status != "running":
        raise HTTPException(status_code=410, detail="Sandbox is stopped")

    body = await read_limited_body(request, MAX_PREVIEW_REQUEST_BYTES)
    container.reload()
    networks = container.attrs["NetworkSettings"]["Networks"]
    address = next(iter(networks.values())).get("IPAddress")
    if not address:
        raise HTTPException(status_code=502, detail="Sandbox is unreachable")

    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_HEADERS
        and key.lower() not in {
            "cookie", "authorization", "content-length", "forwarded",
            "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
        }
    }
    headers["host"] = host
    headers["x-forwarded-host"] = host
    headers["x-forwarded-proto"] = PREVIEW_SCHEME
    headers["accept-encoding"] = "identity"
    query = request.url.query
    upstream_url = f"http://{address}:8000/{path}"
    if query:
        upstream_url = f"{upstream_url}?{query}"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=2), follow_redirects=False) as session:
            async with session.stream(request.method, upstream_url, headers=headers, content=body) as upstream:
                chunks = []
                size = 0
                async for chunk in upstream.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_RESPONSE_BYTES:
                        raise HTTPException(status_code=502, detail="Sandbox response exceeds the 16 MB limit")
                    chunks.append(chunk)
                response_headers = {
                    key: value
                    for key, value in upstream.headers.items()
                    if key.lower() not in HOP_HEADERS and key.lower() not in {"content-length", "content-encoding"}
                }
                return Response(
                    content=b"".join(chunks),
                    status_code=upstream.status_code,
                    headers=response_headers,
                )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Sandbox is unavailable") from error