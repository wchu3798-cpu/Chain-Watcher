import { db } from "./db";
import { monitoringLogs, visitors, type InsertLog, type Log, type Visitor, type InsertVisitor } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getLogs(): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  clearLogs(): Promise<void>;
  
  // Visitor tracking
  getVisitors(): Promise<Visitor[]>;
  recordVisitor(visitor: InsertVisitor): Promise<Visitor>;
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

  async getVisitors(): Promise<Visitor[]> {
    return await db.select().from(visitors).orderBy(desc(visitors.lastSeen));
  }

  async recordVisitor(visitor: InsertVisitor): Promise<Visitor> {
    // Check if visitor exists
    const [existing] = await db.select()
      .from(visitors)
      .where(eq(visitors.ip, visitor.ip))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(visitors)
        .set({ 
          lastSeen: new Date(), 
          userAgent: visitor.userAgent,
          // Don't override isBanned if it's already true
        })
        .where(eq(visitors.id, existing.id))
        .returning();
      return updated;
    }

    const [newVisitor] = await db.insert(visitors).values(visitor).returning();
    return newVisitor;
  }

  async banVisitor(ip: string): Promise<void> {
    await db.update(visitors)
      .set({ isBanned: "true", isBot: "true" })
      .where(eq(visitors.ip, ip));
  }
}

export const storage = new DatabaseStorage();
