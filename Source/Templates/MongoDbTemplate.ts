import { BaseTemplate } from "./BaseTemplate.js";
import type {
  TemplateCategory,
  ITemplateField,
} from "../Core/Types/TemplateTypes.js";
import type { IPortMapping } from "../Core/Types/ServerTypes.js";

export class MongoDbTemplate extends BaseTemplate {
  public readonly Id = "mongodb-db";
  public readonly Name = "MongoDB Document Store";
  public readonly Description = "High-performance NoSQL document-oriented database with persistent volume and root credentials.";
  public readonly Category: TemplateCategory = "Database";
  public readonly DefaultImage = "mongo:7";
  public readonly VolumeMountPath = "/data/db";

  public readonly DefaultPorts: IPortMapping[] = [
    {
      HostPort: 27017,
      ContainerPort: 27017,
      Protocol: "tcp",
    },
  ];

  public readonly Fields: ITemplateField[] = [
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
