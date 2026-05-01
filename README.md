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

Local Wrangler currently fails in this project before Docker is usable inside Sandbox, with no `/var/run/docker.sock` and rootlesskit errors when the startup script is invoked manually.
