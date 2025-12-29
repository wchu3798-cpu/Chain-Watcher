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
  
  // Middleware to block banned IPs
  app.use(async (req, res, next) => {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0");
    const visitorList = await storage.getVisitors();
    const isBanned = visitorList.some(v => v.ip === ip && v.isBanned === "true");
    
    if (isBanned && !req.path.startsWith("/api/honeypot")) {
      return res.status(403).send("Access Denied: Your IP has been flagged for suspicious activity.");
    }
    next();
  });

  // API Routes
  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  app.get("/api/visitors", async (req, res) => {
    const visitorList = await storage.getVisitors();
    res.json(visitorList);
  });

  app.post("/api/capture-email", async (req, res) => {
    const { email, referrer } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const captured = await storage.captureEmail({
      email,
      referrer: referrer || req.headers["referer"] || "direct",
    });
    res.json(captured);
  });

  app.get("/api/honeypot-secret-trap", async (req, res) => {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0");
    await storage.recordVisitor({
      ip,
      userAgent: req.headers["user-agent"] || "bot-trap",
      isBot: "true"
    });
    // This is the DatabaseStorage instance, we need to add banVisitor to interface if not there
    if ("banVisitor" in storage) {
      await (storage as any).banVisitor(ip);
    }
    res.status(403).send("Banned.");
  });

  app.post("/api/visitors/track", async (req, res) => {
    const userAgent = req.headers["user-agent"] || "unknown";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    
    // Simple bot detection
    const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|slurp|duckduckbot/i.test(userAgent);
    
    const visitor = await storage.recordVisitor({
      ip: String(ip),
      userAgent,
      isBot: isBot ? "true" : "false"
    });
    
    res.json(visitor);
  });

  app.delete(api.logs.clear.path, async (req, res) => {
    await storage.clearLogs();
    res.status(204).end();
  });

  // Start the Python script
  startMonitor();

  return httpServer;
}
