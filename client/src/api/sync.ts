import { apiFetch } from '@/api/client';

export interface SyncRunResult {
  exitCode: number;
}

export function triggerSync(): Promise<SyncRunResult> {
  return apiFetch<SyncRunResult>('/sync/run', { method: 'POST' });
}
