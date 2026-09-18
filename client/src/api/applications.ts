import { apiFetch } from '@/api/client';
import type {
  Application,
  ApplicationStats,
  UpdateApplicationPayload,
} from '@/types/application';

export function listApplications(): Promise<Application[]> {
  return apiFetch<Application[]>('/applications');
}

export function getStats(): Promise<ApplicationStats> {
  return apiFetch<ApplicationStats>('/applications/stats');
}

export function updateApplication(
  id: number,
  payload: UpdateApplicationPayload,
): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteApplication(id: number): Promise<Application> {
  return apiFetch<Application>(`/applications/${id}`, { method: 'DELETE' });
}
