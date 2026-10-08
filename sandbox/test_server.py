import os
import stat
import tempfile
import unittest
from pathlib import Path
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


if __name__ == "__main__":
    unittest.main()