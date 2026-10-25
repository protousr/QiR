import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
  IContainerBuildConfig,
} from "../Core/Types/TemplateTypes.js";
import type { ICreateServerInput, IPortMapping } from "../Core/Types/ServerTypes.js";

export class GenericPythonTemplate extends BaseTemplate {
  public readonly Id = "generic-python";
  public readonly Name = "Python Application / Bot";
  public readonly Description = "Python 3.12 container suitable for Python Discord bots (discord.py), FastAPI, or automation scripts.";
  public readonly Category: TemplateCategory = "Runtime";
  public readonly DefaultImage = "python:3.12-alpine";
  public readonly VolumeMountPath = "/app";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 8000,
      ContainerPort: 8000,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
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

  public override BuildContainerConfig(
    input: ICreateServerInput,
    volumeHostPath: string
  ): IContainerBuildConfig {
    const config = super.BuildContainerConfig(input, volumeHostPath);
    const entryFile = input.EnvironmentVariables?.["ENTRY_FILE"] || "main.py";
    const autoPip = input.EnvironmentVariables?.["AUTO_PIP_INSTALL"] !== "false";

    let startupCommand: string;
    if (autoPip) {
      startupCommand = `cd /app && if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi && if [ -f ${entryFile} ]; then python ${entryFile}; else echo "Waiting for python files in /app..."; tail -f /dev/null; fi`;
    } else {
      startupCommand = `cd /app && if [ -f ${entryFile} ]; then python ${entryFile}; else echo "Waiting for python files in /app..."; tail -f /dev/null; fi`;
    }

    config.Cmd = ["sh", "-c", startupCommand];

    return config;
  }
}
