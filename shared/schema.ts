import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const monitoringLogs = pgTable("monitoring_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // INFO, WARN, ERROR
  message: text("message").notNull(),
  data: jsonb("data"), // Any extra data from the script
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  userAgent: text("user_agent").notNull(),
  isBot: text("is_bot").notNull(), // "true" or "false"
  isBanned: text("is_banned").notNull().default("false"), // "true" or "false"
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const insertLogSchema = createInsertSchema(monitoringLogs).omit({ 
  id: true, 
  createdAt: true 
});

export const insertVisitorSchema = createInsertSchema(visitors).omit({
  id: true,
  lastSeen: true
});

export type Log = typeof monitoringLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
