import { db } from "./db";
import { monitoringLogs, type InsertLog, type Log } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getLogs(): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  clearLogs(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLogs(): Promise<Log[]> {
    return await db.select()
      .from(monitoringLogs)
      .orderBy(desc(monitoringLogs.createdAt))
      .limit(500);
  }

  async createLog(log: InsertLog): Promise<Log> {
    const [newLog] = await db.insert(monitoringLogs).values(log).returning();
    return newLog;
  }

  async clearLogs(): Promise<void> {
    await db.delete(monitoringLogs);
  }
}

export const storage = new DatabaseStorage();
