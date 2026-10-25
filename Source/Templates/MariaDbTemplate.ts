import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
} from "../Core/Types/TemplateTypes.js";
import type { IPortMapping } from "../Core/Types/ServerTypes.js";

export class MariaDbTemplate extends BaseTemplate {
  public readonly Id = "mariadb-db";
  public readonly Name = "MariaDB / MySQL Database";
  public readonly Description = "Fast and scalable relational MySQL/MariaDB database with persistent storage and custom databases.";
  public readonly Category: TemplateCategory = "Database";
  public readonly DefaultImage = "mariadb:11-alpine";
  public readonly VolumeMountPath = "/var/lib/mysql";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 3306,
      ContainerPort: 3306,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
    {
      Key: "MARIADB_DATABASE",
      Label: "Database Name",
      DefaultValue: "app_db",
      Required: true,
      Type: "text",
      Description: "Initial database name to be created automatically.",
    },
    {
      Key: "MARIADB_USER",
      Label: "Database User",
      DefaultValue: "dbuser",
      Required: true,
      Type: "text",
      Description: "Application database user.",
    },
    {
      Key: "MARIADB_PASSWORD",
      Label: "Database Password",
      DefaultValue: "",
      Required: true,
      Type: "password",
      Description: "Application database user password.",
    },
    {
      Key: "MARIADB_ROOT_PASSWORD",
      Label: "Root Password",
      DefaultValue: "",
      Required: true,
      Type: "password",
      Description: "Administrative root account password.",
    },
  ];
}
