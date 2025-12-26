import { motion } from "framer-motion";
import { format } from "date-fns";
import { Info, AlertTriangle, AlertCircle } from "lucide-react";
import type { Log } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LogEntryProps {
  log: Log;
}

export function LogEntry({ log }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "WARN":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "INFO":
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "ERROR":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "WARN":
        return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "INFO":
      default:
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className={cn(
        "group relative border-b border-border/40 p-3 hover:bg-white/[0.02] transition-colors cursor-pointer",
        isExpanded && "bg-white/[0.04]"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-4 font-mono text-sm">
        {/* Timestamp */}
        <div className="shrink-0 w-24 text-muted-foreground/60 text-xs pt-0.5">
          {log.createdAt ? format(new Date(log.createdAt as string), "HH:mm:ss.SSS") : "--"}
        </div>

        {/* Level Badge */}
        <div className={cn(
          "shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 w-20 justify-center",
          getLevelColor(log.level)
        )}>
          {log.level}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 break-words text-gray-300">
          {log.message}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && log.data && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="ml-28 mt-2 overflow-hidden"
        >
          <pre className="text-xs bg-black/40 rounded p-3 border border-border/50 text-muted-foreground overflow-x-auto">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </motion.div>
      )}
    </motion.div>
  );
}
