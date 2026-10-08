# Buildzen sandbox service

This service runs the Python API starter in a per-project container. Buildzen exposes one fixed action, `start-fastapi`; it does not accept shell commands, install project `requirements.txt` files, or expose the Docker API to browsers.

## Security boundary

Project Python is untrusted code. The service requires the Docker daemon to have the gVisor `runsc` runtime configured and fails closed when it is absent. Each project gets its own internal-only Docker network, a read-only project mount and root filesystem, an unprivileged UID, no Linux capabilities, no-new-privileges, bounded container logs, and limits of 256 MB RAM, 0.5 CPU, and 64 processes. There is no outbound network access. SQLite data is temporary and stored in a size-limited tmpfs. Configure the host firewall to prevent sandbox bridge networks from reaching host services; the host networking rules are part of the deployment boundary.

The control service has access to the Docker socket, which is effectively host-administrator access. Run it on a dedicated Linux host or VM with no unrelated workloads or secrets. Do not publish port 8787 directly. The service listens on loopback and trusts the authenticated-user header only because a trusted reverse proxy must authenticate control requests and overwrite that header. A spoofable header or exposed Docker socket invalidates the security boundary.

Preview URLs use a separate wildcard origin from Buildzen, for example `*.preview.example.com`. This keeps project JavaScript outside the studio origin. The wildcard DNS record and TLS certificate must point to the reverse proxy. Preview pages are public to anyone who knows the random URL and expire after one hour.

## Host setup

1. Install Docker Engine and gVisor, then configure Docker's `runsc` runtime and restart the daemon. Confirm `docker info` lists `runsc` under `Runtimes`.
2. Build the fixed Python runtime image:

   ```sh
   docker build -t buildzen-python-api:1 \
     -f sandbox/python-runtime/Dockerfile sandbox/python-runtime
   ```

3. Create a dedicated host state directory. Set its absolute path in `SANDBOX_HOST_STATE_DIR`, set `DOCKER_SOCKET_GID` to the Docker socket's group ID, set `SANDBOX_SERVICE_UID` to the service user's UID, and set `SANDBOX_PREVIEW_DOMAIN` to the wildcard preview domain without a scheme. The state directory must be writable by the service UID.
4. Start the control service:

   ```sh
   docker compose --env-file sandbox/.env -f sandbox/docker-compose.yml up -d --build
   ```

5. Configure the reverse proxy so authenticated Buildzen requests under `/api/sandboxes` reach `127.0.0.1:8787`. The proxy must authenticate the user and set `X-Authenticated-User` itself, discarding any incoming value. Route `*.${SANDBOX_PREVIEW_DOMAIN}` to the same loopback service without studio authentication, preserve the incoming `Host`, and terminate TLS for the wildcard domain. Do not expose port 8787 or `/var/run/docker.sock` publicly.

The studio and sandbox API should share the authenticated origin so the browser can call `/api/sandboxes`. Preview traffic must use the separate wildcard origin. Configure upload/body limits at the reverse proxy to at least 3 MB for sandbox control requests.

For an Nginx deployment using an auth-request endpoint, the relevant routing shape is:

```nginx
server {
   server_name studio.example.com;
   client_max_body_size 3m;

   location ^~ /api/sandboxes {
      auth_request /oauth2/auth;
      auth_request_set $sandbox_user $upstream_http_x_auth_request_user;
      proxy_set_header X-Authenticated-User $sandbox_user;
      proxy_set_header Host $host;
      proxy_pass http://127.0.0.1:8787;
   }
}

server {
   server_name *.preview.example.com;

   location / {
      proxy_set_header Host $host;
      proxy_pass http://127.0.0.1:8787;
   }
}
```

Replace the example names and auth endpoint with the deployment's actual values, and configure TLS with a wildcard certificate for the preview domain. Integrate the first location into the existing Buildzen server block rather than replacing its static-file routes.

## Fixed API actions

- `GET /healthz` provides an unauthenticated, non-sensitive liveness check for the control service.
- `GET /api/sandboxes/me` returns the signed-in user's active sandbox.
- `POST /api/sandboxes` accepts only `{"command":"start-fastapi","files":[...]}`.
- `DELETE /api/sandboxes/{id}` stops only a sandbox owned by the signed-in user.
- A preview host of `{sandbox-id}.${SANDBOX_PREVIEW_DOMAIN}` proxies requests to that sandbox's port 8000.

The starter must include a top-level `main.py`. `requirements.txt` is not installed; the runtime contains only Python, FastAPI, and Uvicorn. The service allows one active sandbox per user, at most 32 overall, three starts per minute per user, 2 MB of project source, and a one-hour lifetime. WebSockets and persistent database storage are not supported.

Run the input and path-validation tests with the sandbox service dependencies installed:

```sh
python -m unittest discover -s sandbox -p 'test_*.py'
```