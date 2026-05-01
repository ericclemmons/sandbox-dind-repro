import { getSandbox, Sandbox } from "@cloudflare/sandbox";

type Env = {
  Sandbox: DurableObjectNamespace<Sandbox>;
};

const sandboxName = "dind-repro";

export { Sandbox };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const sandbox = getSandbox(env.Sandbox, sandboxName);

    if (url.pathname === "/") {
      return Response.json({
        routes: {
          dockerVersion: "/docker-version",
          dockerRun: "/docker-run",
          destroy: "/destroy",
          processes: "/processes",
          startDocker: "/start-docker",
        },
      });
    }

    if (url.pathname === "/processes") {
      const processes = await sandbox.listProcesses();
      return Response.json({ processes });
    }

    if (url.pathname === "/destroy") {
      await sandbox.destroy();
      return Response.json({ destroyed: true });
    }

    if (url.pathname === "/start-docker") {
      const probe = await sandbox.exec("docker version", { timeout: 10_000 });

      if (probe.success) {
        return Response.json({ alreadyRunning: true, probe });
      }

      const process = await sandbox.startProcess("/home/rootless/boot-docker-for-dind.sh", {
        processId: "dockerd-manual",
        autoCleanup: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [status, logs, processes] = await Promise.all([
        process.getStatus(),
        process.getLogs(),
        sandbox.listProcesses(),
      ]);

      return Response.json({
        process: {
          id: process.id,
          pid: process.pid,
          command: process.command,
          startTime: process.startTime,
          status,
        },
        logs,
        processes,
      });
    }

    if (url.pathname === "/docker-version") {
      const result = await sandbox.exec("docker version");
      return Response.json(result);
    }

    if (url.pathname === "/docker-run") {
      await sandbox.writeFile(
        "/workspace/Dockerfile",
        `FROM alpine:latest
RUN apk add --no-cache curl
CMD ["echo", "Hello from Docker!"]
`,
      );

      const build = await sandbox.exec("docker build --network=host -t sandbox-dind-smoke /workspace");

      if (!build.success) {
        return Response.json({ step: "build", ...build }, { status: 500 });
      }

      const run = await sandbox.exec("docker run --network=host --rm sandbox-dind-smoke");
      return Response.json({ build, run }, { status: run.success ? 200 : 500 });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
