# Docker-in-Docker guide repro: `docker:dind-rootless` Sandbox has no Docker socket locally

## Summary

I created a minimal Worker + Sandbox repro following the Docker-in-Docker guide:

https://developers.cloudflare.com/sandbox/guides/docker-in-docker/#create-a-docker-enabled-image

The Sandbox container starts and `sandbox.exec(...)` works, but Docker is not available inside the Sandbox. `docker version` cannot connect to `/var/run/docker.sock`. Listing Sandbox background processes shows no startup process from the Dockerfile `CMD`. Manually starting the documented boot script produces Docker/rootful mount errors and still does not create a usable Docker socket.

## Repro

Repository:

```text
<repo-url>
```

Run locally:

```bash
pnpm install
pnpm dev
```

In another terminal:

```bash
curl -sS http://localhost:8789/docker-version
curl -sS http://localhost:8789/processes
curl -sS http://localhost:8789/start-docker
curl -sS http://localhost:8789/docker-version
```

## Expected Behavior

Because the Dockerfile matches the guide, the Sandbox container `CMD` should start Docker and keep it running:

```dockerfile
ENTRYPOINT ["/sandbox"]
CMD ["/home/rootless/boot-docker-for-dind.sh"]
```

Then `sandbox.exec("docker version")` should show both Docker client and server info.

## Actual Behavior

`/docker-version`:

```json
{
  "success": false,
  "exitCode": 1,
  "stdout": "Client:\n Version:           29.4.1\n API version:       1.54\n Go version:        go1.26.2\n Git commit:        055a478\n Built:             Mon Apr 20 16:31:59 2026\n OS/Arch:           linux/amd64\n Context:           default",
  "stderr": "failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: dial unix /var/run/docker.sock: connect: no such file or directory"
}
```

`/processes` before manual startup:

```json
{"processes":[]}
```

`/start-docker` manually starts `/home/rootless/boot-docker-for-dind.sh`, but logs include:

```text
Device "nf_tables" does not exist.
modprobe: can't change directory to '/lib/modules': No such file or directory
Device "ip_tables" does not exist.
modprobe: can't change directory to '/lib/modules': No such file or directory
Device "ip6_tables" does not exist.
modprobe: can't change directory to '/lib/modules': No such file or directory
mount: permission denied (are you root?)
Could not mount /sys/kernel/security.
AppArmor detection and --privileged mode might break.
mount: permission denied (are you root?)
```

After manual startup, `/docker-version` still fails with missing `/var/run/docker.sock`.

## Environment

- macOS / local Wrangler dev
- `@cloudflare/sandbox@0.9.2`
- `wrangler@4.86.0`
- Docker image copies `cloudflare/sandbox:0.9.2-musl` into `docker:dind-rootless`

## Question

Is the Docker-in-Docker guide expected to work in local Wrangler dev, or only after deploying to Cloudflare Containers? If it should work locally, is there an additional container capability/security setting required for `docker:dind-rootless` to create the Docker socket?
