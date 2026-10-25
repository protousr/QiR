import { BaseTemplate } from "./BaseTemplate.js";
export class GenericPythonTemplate extends BaseTemplate {
    Id = "generic-python";
    Name = "Python Application / Bot";
    Description = "Python 3.12 container suitable for Python Discord bots (discord.py), FastAPI, or automation scripts.";
    Category = "Runtime";
    DefaultImage = "python:3.12-alpine";
    VolumeMountPath = "/app";
    DefaultPorts = [
        {
            HostPort: 8000,
            ContainerPort: 8000,
            Protocol: "tcp",
        },
    ];
    InitialFiles = {
        "requirements.txt": "",
        "main.py": `import http.server\nimport socketserver\nimport os\n\nPORT = int(os.environ.get("PORT", 8000))\n\nclass Handler(http.server.SimpleHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.send_header("Content-type", "application/json")\n        self.end_headers()\n        self.wfile.write(b'{"status": "online", "message": "QiR Python Container Running"}')\n\nwith socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:\n    print(f"[QiR] Python server listening on http://0.0.0.0:{PORT}")\n    httpd.serve_forever()\n`,
    };
    Fields = [
        {
            Key: "ENTRY_FILE",
            Label: "Entry Script",
            DefaultValue: "main.py",
            Required: true,
            Type: "text",
            Description: "Python entry script to run (e.g. main.py, bot.py).",
        },
        {
            Key: "AUTO_PIP_INSTALL",
            Label: "Auto Install requirements.txt",
            DefaultValue: "true",
            Required: false,
            Type: "select",
            Options: ["true", "false"],
            Description: "Automatically install Python packages from requirements.txt if present.",
        },
    ];
    BuildContainerConfig(input, volumeHostPath) {
        const config = super.BuildContainerConfig(input, volumeHostPath);
        const entryFile = input.EnvironmentVariables?.["ENTRY_FILE"] || "main.py";
        const autoPip = input.EnvironmentVariables?.["AUTO_PIP_INSTALL"] !== "false";
        let startupCommand;
        if (autoPip) {
            startupCommand = `cd /app && if [ -s requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi && if [ -f ${entryFile} ]; then python ${entryFile}; else echo "Waiting for python files in /app..."; tail -f /dev/null; fi`;
        }
        else {
            startupCommand = `cd /app && if [ -f ${entryFile} ]; then python ${entryFile}; else echo "Waiting for python files in /app..."; tail -f /dev/null; fi`;
        }
        config.Cmd = ["sh", "-c", startupCommand];
        return config;
    }
}
