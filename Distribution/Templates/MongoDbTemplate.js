import { BaseTemplate } from "./BaseTemplate.js";
export class MongoDbTemplate extends BaseTemplate {
    Id = "mongodb-db";
    Name = "MongoDB Document Store";
    Description = "High-performance NoSQL document-oriented database with persistent volume and root credentials.";
    Category = "Database";
    DefaultImage = "mongo:7";
    VolumeMountPath = "/data/db";
    DefaultPorts = [
        {
            HostPort: 27017,
            ContainerPort: 27017,
            Protocol: "tcp",
        },
    ];
    Fields = [
        {
            Key: "MONGO_INITDB_ROOT_USERNAME",
            Label: "Root Admin Username",
            DefaultValue: "root",
            Required: true,
            Type: "text",
            Description: "Root administrator username for database access.",
        },
        {
            Key: "MONGO_INITDB_ROOT_PASSWORD",
            Label: "Root Admin Password",
            DefaultValue: "",
            Required: true,
            Type: "password",
            Description: "Root administrator password.",
        },
        {
            Key: "MONGO_INITDB_DATABASE",
            Label: "Initial Database",
            DefaultValue: "qir_mongo",
            Required: false,
            Type: "text",
            Description: "Optional default database name to initialize.",
        },
    ];
}
