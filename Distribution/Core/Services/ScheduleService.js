import crypto from "node:crypto";
import { DatabaseManager } from "../Database/DatabaseManager.js";
import { ServerService } from "./ServerService.js";
export class ScheduleService {
    static Instance;
    DatabaseManager;
    Timer;
    constructor() {
        this.DatabaseManager = DatabaseManager.GetInstance();
        this.StartWorker();
    }
    static GetInstance() {
        if (!ScheduleService.Instance) {
            ScheduleService.Instance = new ScheduleService();
        }
        return ScheduleService.Instance;
    }
    StartWorker() {
        if (this.Timer)
            return;
        this.Timer = setInterval(() => {
            this.ProcessDueSchedules().catch(() => { });
        }, 30000);
    }
    StopWorker() {
        if (this.Timer) {
            clearInterval(this.Timer);
            this.Timer = undefined;
        }
    }
    async ProcessDueSchedules() {
        const now = new Date();
        const schedules = this.DatabaseManager.GetAllEnabledSchedules();
        for (const schedule of schedules) {
            const nextRunDate = new Date(schedule.NextRun);
            if (nextRunDate <= now) {
                await this.ExecuteSchedule(schedule);
            }
        }
    }
    async ExecuteSchedule(schedule) {
        const serverService = ServerService.GetInstance();
        const nowIso = new Date().toISOString();
        const nextDate = new Date(Date.now() + Math.max(1, schedule.IntervalMinutes) * 60000);
        try {
            if (schedule.TaskType === "Backup") {
                await serverService.GetBackupService().CreateBackup(schedule.ServerId, `Automated Schedule: ${schedule.Name}`);
            }
            else if (schedule.TaskType === "Restart") {
                await serverService.RestartServer(schedule.ServerId);
            }
            else if (schedule.TaskType === "Command" && schedule.Command) {
                await serverService.SendCommand(schedule.ServerId, schedule.Command);
            }
            this.DatabaseManager.LogAudit({
                Id: crypto.randomUUID(),
                Timestamp: nowIso,
                Action: "SCHEDULE_EXECUTE",
                IpAddress: "scheduler",
                Details: `Executed schedule "${schedule.Name}" (${schedule.TaskType}) on server ${schedule.ServerId}`,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.DatabaseManager.LogAudit({
                Id: crypto.randomUUID(),
                Timestamp: nowIso,
                Action: "SCHEDULE_ERROR",
                IpAddress: "scheduler",
                Details: `Failed executing schedule "${schedule.Name}" on server ${schedule.ServerId}: ${msg}`,
            });
        }
        finally {
            this.DatabaseManager.UpdateScheduleNextRun(schedule.Id, nowIso, nextDate.toISOString());
        }
    }
    GetSchedulesForServer(serverId) {
        return this.DatabaseManager.GetSchedulesForServer(serverId);
    }
    CreateSchedule(serverId, input) {
        const interval = Math.max(1, input.IntervalMinutes);
        const nextDate = new Date(Date.now() + interval * 60000);
        const schedule = {
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
    DeleteSchedule(scheduleId) {
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
    ToggleSchedule(scheduleId, enabled) {
        this.DatabaseManager.ToggleSchedule(scheduleId, enabled);
    }
    async TriggerScheduleNow(scheduleId) {
        const existing = this.DatabaseManager.FindScheduleById(scheduleId);
        if (!existing) {
            throw new Error("Schedule not found");
        }
        await this.ExecuteSchedule(existing);
    }
}
