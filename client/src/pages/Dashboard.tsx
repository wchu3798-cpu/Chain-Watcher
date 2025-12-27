import { Header } from "@/components/Header";
import { LogEntry } from "@/components/LogEntry";
import { StatusCard } from "@/components/StatusCard";
import { AnomalyWindow } from "@/components/AnomalyWindow";
import { useLogs } from "@/hooks/use-logs";
import { Activity, Server, Clock, Database, Terminal, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: logs, isLoading, error } = useLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const { toast } = useToast();

  // Handle auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    try {
      await apiRequest("DELETE", "/api/logs");
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Logs cleared",
        description: "Dashboard history has been reset.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to clear logs.",
        variant: "destructive",
      });
    }
  };

  // Calculate simple stats from logs
  const errorCount = logs?.filter(l => l.level === "ERROR").length || 0;
  const warnCount = logs?.filter(l => l.level === "WARN").length || 0;
  const lastActive = logs?.[0]?.createdAt ? new Date(logs[0].createdAt).toLocaleTimeString() : "--";

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[2000px] mx-auto w-full overflow-hidden">
        {/* Sidebar Stats Area */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 flex-shrink-0">
            <StatusCard 
              label="System Status" 
              value="Monitoring" 
              status="active" 
            />
            <StatusCard 
              label="Threat Level" 
              value={errorCount > 0 ? "CRITICAL" : warnCount > 0 ? "ELEVATED" : "NORMAL"} 
              status={errorCount > 0 ? "warning" : "active"} 
            />
          </div>
          
          <div className="flex-1 min-h-0">
            <AnomalyWindow logs={logs || []} />
          </div>

          <div className="bg-card/50 border border-border rounded-xl p-6 relative overflow-hidden hidden lg:flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" /> Node Telemetry
            </h3>
            <div className="space-y-4 text-sm font-mono text-muted-foreground/80 flex-1">
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Network</span>
                <span className="text-emerald-400">Mainnet</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span>Latency</span>
                <span className="text-primary">42ms</span>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  animate={{ width: ["0%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
                <span>ACTIVE SCAN</span>
                <span>{logs?.[0]?.message.match(/\d+/)?.[0] || "---"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Log Viewer */}
        <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col shadow-2xl overflow-hidden h-full">
          <div className="h-12 border-b border-border flex items-center px-4 bg-muted/20 justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Terminal className="w-4 h-4" />
                <span>Live Console Output</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoscroll"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 rounded border-border bg-background text-primary focus:ring-primary/20"
                />
                <label htmlFor="autoscroll" className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold cursor-pointer select-none">
                  Auto-scroll
                </label>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearLogs}
                className="h-7 text-[10px] uppercase tracking-wider font-bold gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear Logs
              </Button>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                <span className="flex h-2 w-2 rounded-full bg-yellow-500"></span>
                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
              </div>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-0 scroll-smooth custom-scrollbar bg-[#0a0a0c]"
          >
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
                  {[...(logs || [])].reverse().map((log) => (
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
