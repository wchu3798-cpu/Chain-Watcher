import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Log } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Shield } from "lucide-react";

interface VisualizerProps {
  logs: Log[];
}

export function Visualizer({ logs }: VisualizerProps) {
  // Prepare data for the charts
  const chartData = [...logs]
    .slice(0, 50)
    .reverse()
    .map((log) => {
      const data = log.data as any;
      return {
        time: new Date(log.createdAt || 0).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        score: data?.score || 0,
        gas: data?.gas_used || 0,
        value: data?.value_eth || 0,
      };
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <Card className="bg-card/50 border-border overflow-hidden flex flex-col h-full">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Shield className="w-3 h-3 text-primary" /> Threat Score Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                  borderRadius: "8px"
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorScore)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border overflow-hidden flex flex-col h-full">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-400" /> Transaction Value (ETH)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                  borderRadius: "8px"
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
