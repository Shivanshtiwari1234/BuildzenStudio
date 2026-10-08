import os
import stat
import tempfile
import unittest
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("SANDBOX_PREVIEW_DOMAIN", "preview.test")
test_state_dir = tempfile.TemporaryDirectory()
os.environ.setdefault("SANDBOX_STATE_DIR", test_state_dir.name)

from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request

with patch("docker.from_env") as docker_from_env:
    docker_from_env.return_value = object()
    import server


class SandboxInputTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.previous_state_dir = server.STATE_DIR
        server.STATE_DIR = Path(self.temp_dir.name)

    def tearDown(self):
        server.STATE_DIR = self.previous_state_dir
        self.temp_dir.cleanup()

    def test_accepts_only_the_static_fastapi_action(self):
        payload = server.StartRequest.model_validate({
            "command": "start-fastapi",
            "files": [{"name": "main.py", "content": "app = None"}],
        })
        self.assertEqual(payload.command, "start-fastapi")

        with self.assertRaises(ValidationError):
            server.StartRequest.model_validate({
                "command": "python main.py",
                "files": [{"name": "main.py", "content": "app = None"}],
            })

    def test_identity_rejects_ambiguous_and_control_values(self):
        def request_for(identity):
            headers = [] if identity is None else [(b"x-authenticated-user", identity.encode())]
            return Request({"type": "http", "headers": headers})

        self.assertEqual(len(server.owner_for(request_for("user@example.test"))), 64)
        for identity in (None, "user-a,user-b", "user\nforged"):
            with self.subTest(identity=identity):
                with self.assertRaises(HTTPException) as error:
                    server.owner_for(request_for(identity))
                self.assertEqual(error.exception.status_code, 401)

    def test_payload_schema_rejects_extra_and_coerced_fields(self):
        valid_file = {"name": "main.py", "content": "app = None"}
        with self.assertRaises(ValidationError):
            server.StartRequest.model_validate({
                "command": "start-fastapi",
                "files": [valid_file],
                "shell": "python main.py",
            })
        with self.assertRaises(ValidationError):
            server.ProjectFile.model_validate({"name": 42, "content": "app = None"})

    def test_rejects_parent_path_traversal(self):
        files = [
            server.ProjectFile(name="main.py", content="app = None"),
            server.ProjectFile(name="../outside.txt", content="not allowed"),
        ]
        with self.assertRaises(HTTPException) as error:
            server.validate_and_write_files("sandbox-test", files)
        self.assertEqual(error.exception.status_code, 400)
        self.assertFalse((Path(self.temp_dir.name).parent / "outside.txt").exists())

    def test_requires_a_top_level_main_module(self):
        with self.assertRaises(HTTPException) as error:
            server.validate_and_write_files(
                "sandbox-test",
                [server.ProjectFile(name="static/main.py", content="app = None")],
            )
        self.assertEqual(error.exception.status_code, 400)

    def test_stages_source_readable_by_unprivileged_runtime_uid(self):
        root = server.validate_and_write_files(
            "sandbox-test",
            [
                server.ProjectFile(name="main.py", content="app = None"),
                server.ProjectFile(name="static/index.html", content="<h1>Ready</h1>"),
            ],
        )
        self.assertEqual(stat.S_IMODE(root.stat().st_mode), 0o755)
        self.assertEqual(stat.S_IMODE((root / "static").stat().st_mode), 0o755)
        self.assertEqual(stat.S_IMODE((root / "static/index.html").stat().st_mode), 0o644)
        self.assertEqual((root / "main.py").read_text(encoding="utf-8"), "app = None")

    def test_partial_start_cleanup_removes_network_and_staged_files(self):
        sandbox_id = "partial-start"
        staged = Path(self.temp_dir.name) / sandbox_id
        staged.mkdir()

        class FakeNetwork:
            removed = False

            def remove(self):
                self.removed = True

        network = FakeNetwork()
        server.cleanup_partial_start(sandbox_id, network=network)
        self.assertTrue(network.removed)
        self.assertFalse(staged.exists())

    def test_partial_start_cleanup_removes_created_container(self):
        sandbox_id = "partial-container"
        staged = Path(self.temp_dir.name) / sandbox_id
        staged.mkdir()

        class FakeContainer:
            labels = {server.ID_LABEL: sandbox_id}

            def remove(self, force, v):
                self.removed = force and v

        container = FakeContainer()
        server.cleanup_partial_start(sandbox_id, container=container)
        self.assertTrue(container.removed)
        self.assertFalse(staged.exists())

    def test_health_probe_requires_healthy_json_response(self):
        class FakeResponse:
            def __init__(self, status_code, payload):
                self.status_code = status_code
                self.payload = payload

            def json(self):
                if isinstance(self.payload, Exception):
                    raise self.payload
                return self.payload

        self.assertTrue(server.health_response_is_ready(FakeResponse(200, {"status": "ok"})))
        self.assertFalse(server.health_response_is_ready(FakeResponse(404, {"status": "ok"})))
        self.assertFalse(server.health_response_is_ready(FakeResponse(200, {"detail": "missing"})))
        self.assertFalse(server.health_response_is_ready(FakeResponse(200, ValueError("bad json"))))

    def test_preview_capacity_fails_fast_when_all_slots_are_busy(self):
        async def check_capacity():
            previous_slots = server.preview_slots
            server.preview_slots = asyncio.Semaphore(0)
            try:
                with self.assertRaises(HTTPException) as error:
                    await server.acquire_preview_slot()
                self.assertEqual(error.exception.status_code, 503)
            finally:
                server.preview_slots = previous_slots

        asyncio.run(check_capacity())

    def test_proxy_removes_connection_nominated_headers(self):
        headers = {
            "Connection": "keep-alive, X-Private-Hop",
            "Keep-Alive": "timeout=5",
            "X-Private-Hop": "internal",
            "Content-Type": "text/html",
        }
        filtered = server.strip_hop_by_hop_headers(headers)
        self.assertEqual(filtered, {"Content-Type": "text/html"})

    def test_liveness_and_control_auth_contract(self):
        async def check_api():
            transport = server.httpx.ASGITransport(app=server.app)
            async with server.httpx.AsyncClient(
                transport=transport,
                base_url="http://sandbox.test",
            ) as session:
                health = await session.get("/healthz")
                self.assertEqual(health.status_code, 200)
                self.assertEqual(health.json(), {"status": "ok"})

                anonymous_status = await session.get("/api/sandboxes/me")
                self.assertEqual(anonymous_status.status_code, 401)

                missing_action = await session.post(
                    "/api/sandboxes",
                    headers={"X-Authenticated-User": "test-user"},
                    json={"command": "start-fastapi", "files": []},
                )
                self.assertEqual(missing_action.status_code, 403)

        asyncio.run(check_api())

    def test_stopped_expired_and_malformed_containers_are_cleanup_candidates(self):
        class FakeContainer:
            def __init__(self, status, labels):
                self.status = status
                self.labels = labels

        self.assertTrue(server.container_needs_cleanup(
            FakeContainer("exited", {server.EXPIRY_LABEL: "9999999999"}), 100,
        ))
        self.assertTrue(server.container_needs_cleanup(
            FakeContainer("running", {server.EXPIRY_LABEL: "invalid"}), 100,
        ))
        self.assertTrue(server.container_needs_cleanup(
            FakeContainer("running", {server.EXPIRY_LABEL: "99"}), 100,
        ))
        self.assertFalse(server.container_needs_cleanup(
            FakeContainer("running", {server.EXPIRY_LABEL: "101"}), 100,
        ))

    def test_stop_helper_only_removes_owned_sandbox(self):
        sandbox_id = "421c94b0-547e-4cd7-a27f-fdb2250390b2"

        class FakeContainer:
            labels = {server.OWNER_LABEL: "owner-hash"}

        container = FakeContainer()
        containers = SimpleNamespace(get=lambda name: container)
        docker_client = SimpleNamespace(containers=containers)
        with patch.object(server, "client", docker_client), \
                patch.object(server, "cleanup_container") as cleanup:
            with self.assertRaises(HTTPException) as error:
                server.stop_owned_sandbox(sandbox_id, "other-owner")
            self.assertEqual(error.exception.status_code, 404)
            cleanup.assert_not_called()

            server.stop_owned_sandbox(sandbox_id, "owner-hash")
            cleanup.assert_called_once_with(container)


if __name__ == "__main__":
    unittest.main()