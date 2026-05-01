# Sandbox Docker-in-Docker Repro

Minimal repro for Cloudflare Sandbox Docker-in-Docker based on:

https://developers.cloudflare.com/sandbox/guides/docker-in-docker/#create-a-docker-enabled-image

The Dockerfile intentionally matches the guide's structure, using `docker:dind-rootless`, the musl Sandbox binary, and the documented `CMD` startup script. The only version change is `cloudflare/sandbox:0.9.2-musl` to match `@cloudflare/sandbox@0.9.2`.

## Deploy

```bash
cd tmp/sandbox-dind-repro
pnpm install
pnpm deploy
```

## Local Dev With Docker-in-Docker

Local Wrangler does not currently start Worker containers with the privileges Docker-in-Docker needs. For local repro testing, `pnpm dev` starts a Docker API proxy, waits for its Unix socket, points Wrangler at it with `DOCKER_HOST`, and starts Wrangler on port `8787`:

```bash
pnpm dev
```

The proxy listens at `.wrangler/docker-privileged.sock`, forwards requests to `DOCKER_SOCKET`, the active Docker context socket, or `/var/run/docker.sock`, and injects `HostConfig.Privileged=true` into `POST /containers/create` requests.

## Test

Replace `<worker-url>` with the deployed Worker URL.

```bash
curl -sS <worker-url>/docker-version
curl -sS <worker-url>/processes
curl -sS <worker-url>/start-docker
curl -sS <worker-url>/docker-run
curl -sS <worker-url>/destroy
```

Expected behavior:

- `/docker-version` returns a successful Docker client/server response.
- `/processes` shows whether the Docker startup `CMD` is running.
- `/start-docker` manually starts `/home/rootless/boot-docker-for-dind.sh` and returns process logs.
- `/docker-run` builds with `--network=host` and runs the image with `--network=host`, returning `Hello from Docker!`.
- `/destroy` destroys the named Sandbox so the next request starts a fresh container.

Without the local proxy workaround, Wrangler starts Sandbox containers without enough privilege for Docker-in-Docker, so Docker never becomes usable inside Sandbox.
