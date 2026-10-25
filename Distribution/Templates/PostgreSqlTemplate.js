import { BaseTemplate } from "./BaseTemplate.js";
export class PostgreSqlTemplate extends BaseTemplate {
    Id = "postgresql-db";
    Name = "PostgreSQL Database";
    Description = "High-performance relational SQL database with persistent data volume and custom credentials.";
    Category = "Database";
    DefaultImage = "postgres:16-alpine";
    VolumeMountPath = "/var/lib/postgresql/data";
    DefaultPorts = [
        {
            HostPort: 5432,
            ContainerPort: 5432,
            Protocol: "tcp",
        },
    ];
    Fields = [
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
