import { Blocks, Trash2 } from "lucide-react";
import { useClearLogs } from "@/hooks/use-logs";
import { Button } from "@/components/ui/button";

export function Header() {
  const { mutate: clearLogs, isPending } = useClearLogs();

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
          <Blocks className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide uppercase text-foreground">BlockMonitor<span className="text-primary">.py</span></h1>
          <p className="text-[10px] text-muted-foreground font-mono">v1.0.0 • Connected to Mainnet</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => clearLogs()}
          disabled={isPending}
          className="text-xs h-8 border-border/50 bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          {isPending ? "Clearing..." : "Clear Logs"}
        </Button>
      </div>
    </header>
  );
}
