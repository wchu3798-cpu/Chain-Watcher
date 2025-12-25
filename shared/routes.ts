import { z } from 'zod';
import { monitoringLogs } from './schema';

export const api = {
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.custom<typeof monitoringLogs.$inferSelect>()),
      },
    },
    clear: {
      method: 'DELETE' as const,
      path: '/api/logs',
      responses: {
        204: z.void(),
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
