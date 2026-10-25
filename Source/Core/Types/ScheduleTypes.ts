export type ScheduleTaskType = "Backup" | "Restart" | "Command";

export interface ISchedule {
  Id: string;
  ServerId: string;
  Name: string;
  TaskType: ScheduleTaskType;
  IntervalMinutes: number;
  Command?: string;
  Enabled: boolean;
  LastRun?: string;
  NextRun: string;
  CreatedAt: string;
}

export interface ICreateScheduleInput {
  Name: string;
  TaskType: ScheduleTaskType;
  IntervalMinutes: number;
  Command?: string;
}
