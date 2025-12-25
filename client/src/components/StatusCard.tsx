import { Activity, Radio } from "lucide-react";
import { motion } from "framer-motion";

interface StatusCardProps {
  label: string;
  value: string;
  status: "active" | "inactive" | "warning";
}

export function StatusCard({ label, value, status }: StatusCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-border/80 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start z-10">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{label}</span>
        {status === "active" && (
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
        )}
      </div>

      <div className="z-10 mt-auto">
        <div className="text-2xl font-mono font-bold text-foreground tracking-tight">
          {value}
        </div>
      </div>
    </div>
  );
}
