import { AlertTriangle, ShieldAlert, Zap, Skull, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Log } from "@shared/schema";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface AnomalyWindowProps {
  logs: Log[];
}

export function AnomalyWindow({ logs }: AnomalyWindowProps) {
  const anomalies = [...logs]
    .filter(l => l.level === "WARN" || l.level === "ERROR" || (l.data as any)?.score > 50)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col shadow-2xl overflow-hidden h-full">
      <div className="h-12 border-b border-border flex items-center px-4 bg-destructive/10 justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-destructive">
          <ShieldAlert className="w-4 h-4" />
          <span>Threat Detection Window</span>
        </div>
        <Badge variant="destructive" className="animate-pulse">
          {anomalies.length} ACTIVE
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 bg-[#0a0a0c]">
        <div className="p-4 space-y-4">
          <AnimatePresence initial={false}>
            {anomalies.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/30 text-center">
                <Shield className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-xs font-mono">NO THREATS DETECTED</p>
              </div>
            ) : (
              anomalies.map((log) => {
                const data = log.data as any;
                const isCritical = log.level === "ERROR" || data?.confidence === "CRITICAL";
                
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-lg border ${
                      isCritical 
                        ? "bg-red-500/10 border-red-500/50" 
                        : "bg-amber-500/10 border-amber-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <Skull className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className={`text-xs font-bold uppercase tracking-tighter ${
                          isCritical ? "text-red-500" : "text-amber-500"
                        }`}>
                          {data?.confidence || "ANOMALY"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "--"}
                      </span>
                    </div>

                    <p className="text-xs text-foreground font-medium mb-2 leading-relaxed">
                      {log.message}
                    </p>

                    {data?.reasoning && (
                      <div className="space-y-1">
                        {data.reasoning.map((reason: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Zap className="w-2 h-2 text-primary" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {data?.hash && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex justify-between items-center">
                        <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[150px]">
                          {data.hash}
                        </span>
                        <Badge variant="outline" className="text-[8px] h-4">
                          Score: {Math.round(data.score || 0)}
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
