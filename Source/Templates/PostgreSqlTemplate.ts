import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
} from "../Core/Types/TemplateTypes.js";
import type { IPortMapping } from "../Core/Types/ServerTypes.js";

export class PostgreSqlTemplate extends BaseTemplate {
  public readonly Id = "postgresql-db";
  public readonly Name = "PostgreSQL Database";
  public readonly Description = "High-performance relational SQL database with persistent data volume and custom credentials.";
  public readonly Category: TemplateCategory = "Database";
  public readonly DefaultImage = "postgres:16-alpine";
  public readonly VolumeMountPath = "/var/lib/postgresql/data";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 5432,
      ContainerPort: 5432,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
    {
      Key: "POSTGRES_DB",
      Label: "Database Name",
      DefaultValue: "qir_db",
      Required: true,
      Type: "text",
      Description: "Primary database name created on startup.",
    },
    {
      Key: "POSTGRES_USER",
      Label: "Database Username",
      DefaultValue: "postgres",
      Required: true,
      Type: "text",
      Description: "Superuser role username.",
    },
    {
      Key: "POSTGRES_PASSWORD",
      Label: "Database Password",
      DefaultValue: "",
      Required: true,
      Type: "password",
      Description: "Password for the database superuser.",
    },
  ];
}