import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { spawn, type ChildProcess } from "child_process";
import { z } from "zod";

let monitorProcess: ChildProcess | null = null;

function startMonitor() {
  if (monitorProcess) return;

  console.log("Starting Python monitor script...");
  monitorProcess = spawn("python3", ["server/monitor.py"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  monitorProcess.stdout?.on("data", async (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const logData = JSON.parse(line);
        console.log("Monitor:", logData.message);
        
        // Save to DB
        await storage.createLog({
          level: logData.level || "INFO",
          message: logData.message || "No message",
          data: logData.data || null,
        });
      } catch (e) {
        console.error("Failed to parse monitor output:", line);
      }
    }
  });

  monitorProcess.stderr?.on("data", (data) => {
    console.error("Monitor Error:", data.toString());
  });

  monitorProcess.on("exit", (code) => {
    console.log("Monitor process exited with code", code);
    monitorProcess = null;
    // Optional: Restart logic could go here
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // API Routes
  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  app.delete(api.logs.clear.path, async (req, res) => {
    await storage.clearLogs();
    res.status(204).end();
  });

  // Start the Python script
  startMonitor();

  return httpServer;
}
