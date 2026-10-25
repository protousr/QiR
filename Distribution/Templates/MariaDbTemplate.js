import { BaseTemplate } from "./BaseTemplate.js";
export class MariaDbTemplate extends BaseTemplate {
    Id = "mariadb-db";
    Name = "MariaDB / MySQL Database";
    Description = "Fast and scalable relational MySQL/MariaDB database with persistent storage and custom databases.";
    Category = "Database";
    DefaultImage = "mariadb:lts";
    VolumeMountPath = "/var/lib/mysql";
    DefaultPorts = [
        {
            HostPort: 3306,
            ContainerPort: 3306,
            Protocol: "tcp",
        },
    ];
    Fields = [
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
