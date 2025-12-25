import { Header } from "@/components/Header";
import { LogEntry } from "@/components/LogEntry";
import { StatusCard } from "@/components/StatusCard";
import { useLogs } from "@/hooks/use-logs";
import { Activity, Server, Clock, Database, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { data: logs, isLoading, error } = useLogs();

  // Calculate simple stats from logs
  const errorCount = logs?.filter(l => l.level === "ERROR").length || 0;
  const warnCount = logs?.filter(l => l.level === "WARN").length || 0;
  const lastActive = logs?.[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleTimeString() : "--";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1800px] mx-auto w-full">
        {/* Sidebar Stats Area */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <StatusCard 
              label="System Status" 
              value="Monitoring" 
              status="active" 
            />
            <StatusCard 
              label="Last Event" 
              value={lastActive} 
              status="inactive" 
            />
            <StatusCard 
              label="Errors (24h)" 
              value={errorCount.toString()} 
              status={errorCount > 0 ? "warning" : "inactive"} 
            />
            <StatusCard 
              label="Total Events" 
              value={logs?.length.toString() || "0"} 
              status="inactive" 
            />
          </div>
          
          <div className="bg-card/50 border border-border rounded-xl p-6 flex-1 min-h-[200px] relative overflow-hidden hidden lg:flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" /> Node Telemetry
            </h3>
            <div className="space-y-4 text-sm font-mono text-muted-foreground/80 flex-1">
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Mem Usage</span>
                <span className="text-primary">124 MB</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>CPU Load</span>
                <span className="text-primary">2.4%</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Uptime</span>
                <span className="text-primary">4d 12h</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Network</span>
                <span className="text-emerald-400">Connected</span>
              </div>
            </div>
            
            <div className="mt-auto pt-6">
              <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  animate={{ width: ["0%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>SYNCING</span>
                <span>BLOCK 18293402</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Log Viewer */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col shadow-2xl overflow-hidden h-[calc(100vh-8rem)]">
          <div className="h-12 border-b border-border flex items-center px-4 bg-muted/20 justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Terminal className="w-4 h-4" />
              <span>Live Console Output</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
              <span className="flex h-2 w-2 rounded-full bg-yellow-500"></span>
              <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0 scroll-smooth custom-scrollbar bg-[#0a0a0c]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-4">
                <Activity className="w-8 h-8 animate-pulse text-primary" />
                <p className="font-mono text-sm">Connecting to log stream...</p>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center text-destructive flex-col gap-4">
                <div className="p-4 bg-destructive/10 rounded-full">
                  <Server className="w-8 h-8" />
                </div>
                <p className="font-mono text-sm">Connection failed. Retrying...</p>
              </div>
            ) : logs?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-4 opacity-50">
                <Database className="w-12 h-12" />
                <p className="font-mono text-sm">No logs recorded yet</p>
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                <AnimatePresence initial={false}>
                  {logs?.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))}
                </AnimatePresence>
                {/* Spacer at bottom */}
                <div className="h-8" /> 
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
