import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState } from "react";

export function useLogs() {
  const [hideClean, setHideClean] = useState(true);

  const query = useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
    // Auto-refresh every 2 seconds for real-time feel
    refetchInterval: 2000,
  });

  const filteredLogs = hideClean 
    ? query.data?.filter(log => log.level !== "INFO" || !log.message.toLowerCase().includes("clean interaction"))
    : query.data;

  return {
    ...query,
    data: filteredLogs,
    hideClean,
    setHideClean
  };
}

export function useClearLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.logs.clear.path, {
        method: api.logs.clear.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clear logs");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.logs.list.path] }),
  });
}
