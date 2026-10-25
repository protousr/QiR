# QiR

QiR is a modular web server hosting panel built exclusively for managing Docker containers (such as Minecraft servers, Discord bots, and custom application runtimes).

## Cross-Platform Compatibility

QiR runs natively on both **Windows** and **Ubuntu Linux**:
- **Windows**: Automatically connects to the local named pipe `//./pipe/docker_engine`.
- **Ubuntu Linux**: Automatically connects to the Unix socket `/var/run/docker.sock`.

## Running Under a Subdomain with Caddy

Caddy acts as a reverse proxy with automated HTTPS (Let's Encrypt certificates) and native WebSocket support.

### 1. Caddyfile Configuration

Use the provided [`Caddyfile`](file:///X:/QiR/Caddyfile):

```caddy
panel.yourdomain.com {
    reverse_proxy 127.0.0.1:4000
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### 2. Reverse Proxy & WebSocket Handling
- **Trust Proxy**: Fastify is configured with `trustProxy: true` via [`EnvironmentConfig.ts`](file:///X:/QiR/Source/Config/EnvironmentConfig.ts).
- **WebSockets**: The dashboard dynamically derives the socket protocol (`wss://` over HTTPS or `ws://` over HTTP) and resolves the host from `window.location.host`. Caddy proxies WebSocket handshake requests out of the box.

## Ubuntu Setup with Systemd

1. Copy QiR to your server (e.g. `/opt/qir`).
2. Install dependencies:
   ```bash
   cd /opt/qir
   npm install
   npm run build
   ```
3. Use the included systemd service unit [`qir.service`](file:///X:/QiR/qir.service):
   ```bash
   sudo cp qir.service /etc/systemd/system/qir.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now qir
   ```

## Directory Structure

```text
X:\QiR\
├── package.json
├── tsconfig.json
├── Caddyfile
├── qir.service
├── .env
├── Data\
│   └── Volumes\
└── Source\
    ├── App.ts
    ├── Main.ts
    ├── Config\
    │   └── EnvironmentConfig.ts
    ├── Core\
    │   ├── Docker\
    │   │   ├── ContainerManager.ts
    │   │   ├── DockerClient.ts
    │   │   ├── LogStreamer.ts
    │   │   └── StatsCollector.ts
    │   ├── Services\
    │   │   ├── ServerService.ts
    │   │   ├── TemplateService.ts
    │   │   └── VolumeService.ts
    │   └── Types\
    │       ├── DockerTypes.ts
    │       ├── ServerTypes.ts
    │       └── TemplateTypes.ts
    ├── Templates\
    │   ├── BaseTemplate.ts
    │   ├── DiscordBotTemplate.ts
    │   ├── GenericNodeTemplate.ts
    │   ├── GenericPythonTemplate.ts
    │   └── MinecraftTemplate.ts
    ├── Web\
    │   ├── Controllers\
    │   │   ├── ServerController.ts
    │   │   ├── SystemController.ts
    │   │   └── TemplateController.ts
    │   ├── Middleware\
    │   │   ├── ErrorHandler.ts
    │   │   └── ValidationMiddleware.ts
    │   ├── Routes\
    │   │   ├── ServerRoutes.ts
    │   │   ├── SystemRoutes.ts
    │   │   └── TemplateRoutes.ts
    │   └── WebSockets\
    │       ├── ConsoleWebSocket.ts
    │       └── StatsWebSocket.ts
    └── Public\
        ├── App.js
        ├── Index.html
        └── Style.css
```
