import { z } from "zod";

export const CreateServerSchema = z.object({
  Name: z.string().min(2).max(50),
  TemplateId: z.string().min(1),
  Ports: z
    .array(
      z.object({
        HostPort: z.number().int().min(1).max(65535),
        ContainerPort: z.number().int().min(1).max(65535),
        Protocol: z.enum(["tcp", "udp"]),
      })
    )
    .optional(),
  EnvironmentVariables: z.record(z.string(), z.string()).optional(),
  Limits: z
    .object({
      MemoryBytes: z.number().optional(),
      CpuShares: z.number().optional(),
      NanoCpus: z.number().optional(),
    })
    .optional(),
  AutoRestart: z.boolean().optional(),
  RestartPolicy: z.enum(["unless-stopped", "always", "on-failure", "no"]).optional(),
  AlertWebhookUrl: z.string().optional(),
});

export const SendCommandSchema = z.object({
  Command: z.string().min(1),
});
