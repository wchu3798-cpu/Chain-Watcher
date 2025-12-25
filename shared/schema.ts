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

export const insertLogSchema = createInsertSchema(monitoringLogs).omit({ 
  id: true, 
  createdAt: true 
});

export type Log = typeof monitoringLogs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
