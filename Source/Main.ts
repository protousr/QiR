import { BuildApp } from "./App.js";
import { ConfigInstance } from "./Config/EnvironmentConfig.js";
import { ServerService } from "./Core/Services/ServerService.js";
import { DockerClient } from "./Core/Docker/DockerClient.js";

async function Start(): Promise<void> {
  const dockerClient = DockerClient.GetInstance();
  const isDockerConnected = await dockerClient.Ping();

  if (!isDockerConnected) {
    process.stderr.write(
      `[QiR Warning] Docker daemon is not accessible at ${ConfigInstance.DockerSocketPath}.\nEnsure Docker Desktop or daemon is running.\n`
    );
  }

  const serverService = ServerService.GetInstance();
  await serverService.Initialize();

  const app = await BuildApp();

  await app.listen({
    port: ConfigInstance.Port,
    host: ConfigInstance.Host,
  });

  process.stdout.write(`\n==================================================\n`);
  process.stdout.write(`  QiR Container Hosting Panel Running\n`);
  process.stdout.write(`  URL: http://${ConfigInstance.Host}:${ConfigInstance.Port}\n`);
  process.stdout.write(`  Docker Socket: ${ConfigInstance.DockerSocketPath}\n`);
  process.stdout.write(`  Docker Status: ${isDockerConnected ? "Connected" : "Disconnected"}\n`);
  process.stdout.write(`==================================================\n\n`);

  const Signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of Signals) {
    process.on(signal, async () => {
      process.stdout.write(`\nReceived ${signal}, shutting down gracefully...\n`);
      await app.close();
      process.exit(0);
    });
  }
}

Start().catch((error: unknown) => {
  process.stderr.write(`Fatal error during startup: ${String(error)}\n`);
  process.exit(1);
});
