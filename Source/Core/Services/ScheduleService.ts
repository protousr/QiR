import crypto from "node:crypto";
import { DatabaseManager } from "../Database/DatabaseManager.js";
import { ServerService } from "./ServerService.js";
import type { ISchedule, ICreateScheduleInput } from "../Types/ScheduleTypes.js";

export class ScheduleService {
  private static Instance: ScheduleService;
  private readonly DatabaseManager: DatabaseManager;
  private Timer?: NodeJS.Timeout;

  private constructor() {
    this.DatabaseManager = DatabaseManager.GetInstance();
    this.StartWorker();
  }

  public static GetInstance(): ScheduleService {
    if (!ScheduleService.Instance) {
      ScheduleService.Instance = new ScheduleService();
    }
    return ScheduleService.Instance;
  }

  private StartWorker(): void {
    if (this.Timer) return;
    this.Timer = setInterval(() => {
      this.ProcessDueSchedules().catch(() => {});
    }, 30000);
  }

  public StopWorker(): void {
    if (this.Timer) {
      clearInterval(this.Timer);
      this.Timer = undefined;
    }
  }

  private async ProcessDueSchedules(): Promise<void> {
    const now = new Date();
    const schedules = this.DatabaseManager.GetAllEnabledSchedules();
    for (const schedule of schedules) {
      const nextRunDate = new Date(schedule.NextRun);
      if (nextRunDate <= now) {
        await this.ExecuteSchedule(schedule);
      }
    }
  }

  public async ExecuteSchedule(schedule: ISchedule): Promise<void> {
    const serverService = ServerService.GetInstance();
    const nowIso = new Date().toISOString();
    const nextDate = new Date(Date.now() + Math.max(1, schedule.IntervalMinutes) * 60000);

    try {
      if (schedule.TaskType === "Backup") {
        await serverService.GetBackupService().CreateBackup(
          schedule.ServerId,
          `Automated Schedule: ${schedule.Name}`
        );
      } else if (schedule.TaskType === "Restart") {
        await serverService.RestartServer(schedule.ServerId);
      } else if (schedule.TaskType === "Command" && schedule.Command) {
        await serverService.SendCommand(schedule.ServerId, schedule.Command);
      }

      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: nowIso,
        Action: "SCHEDULE_EXECUTE",
        IpAddress: "scheduler",
        Details: `Executed schedule "${schedule.Name}" (${schedule.TaskType}) on server ${schedule.ServerId}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: nowIso,
        Action: "SCHEDULE_ERROR",
        IpAddress: "scheduler",
        Details: `Failed executing schedule "${schedule.Name}" on server ${schedule.ServerId}: ${msg}`,
      });
    } finally {
      this.DatabaseManager.UpdateScheduleNextRun(
        schedule.Id,
        nowIso,
        nextDate.toISOString()
      );
    }
  }

  public GetSchedulesForServer(serverId: string): ISchedule[] {
    return this.DatabaseManager.GetSchedulesForServer(serverId);
  }

  public CreateSchedule(serverId: string, input: ICreateScheduleInput): ISchedule {
    const interval = Math.max(1, input.IntervalMinutes);
    const nextDate = new Date(Date.now() + interval * 60000);
    const schedule: ISchedule = {
      Id: crypto.randomUUID(),
      ServerId: serverId,
      Name: input.Name.trim() || "Recurring Task",
      TaskType: input.TaskType,
      IntervalMinutes: interval,
      Command: input.Command ? input.Command.trim() : undefined,
      Enabled: true,
      NextRun: nextDate.toISOString(),
      CreatedAt: new Date().toISOString(),
    };

    this.DatabaseManager.CreateSchedule(schedule);
    this.DatabaseManager.LogAudit({
      Id: crypto.randomUUID(),
      Timestamp: new Date().toISOString(),
      Action: "SCHEDULE_CREATE",
      IpAddress: "system",
      Details: `Created schedule "${schedule.Name}" for server ${serverId}`,
    });

    return schedule;
  }

  public DeleteSchedule(scheduleId: string): void {
    const existing = this.DatabaseManager.FindScheduleById(scheduleId);
    if (existing) {
      this.DatabaseManager.DeleteSchedule(scheduleId);
      this.DatabaseManager.LogAudit({
        Id: crypto.randomUUID(),
        Timestamp: new Date().toISOString(),
        Action: "SCHEDULE_DELETE",
        IpAddress: "system",
        Details: `Deleted schedule "${existing.Name}" (${scheduleId})`,
      });
    }
  }

  public ToggleSchedule(scheduleId: string, enabled: boolean): void {
    this.DatabaseManager.ToggleSchedule(scheduleId, enabled);
  }

  public async TriggerScheduleNow(scheduleId: string): Promise<void> {
    const existing = this.DatabaseManager.FindScheduleById(scheduleId);
    if (!existing) {
      throw new Error("Schedule not found");
    }
    await this.ExecuteSchedule(existing);
  }
}
