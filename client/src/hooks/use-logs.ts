import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
    // Auto-refresh every 2 seconds for real-time feel
    refetchInterval: 2000,
  });
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
