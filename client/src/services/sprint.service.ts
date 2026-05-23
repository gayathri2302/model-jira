import api from './api.client';
import type { SprintDto } from '@shared/types/api.types';

export async function getSprints(projectId: string): Promise<SprintDto[]> {
  const res = await api.get<{ data: SprintDto[] }>(`/sprints/project/${projectId}`);
  return res.data.data;
}
export async function createSprint(data: { projectId: string; name: string; goal?: string | null }): Promise<SprintDto> {
  const res = await api.post<{ data: SprintDto }>('/sprints', data);
  return res.data.data;
}
export async function startSprint(id: string, data: { name: string; goal?: string | null; startDate: string; endDate: string }): Promise<SprintDto> {
  const res = await api.post<{ data: SprintDto }>(`/sprints/${id}/start`, data);
  return res.data.data;
}
export async function completeSprint(id: string, incompleteDestination: string): Promise<SprintDto> {
  const res = await api.post<{ data: SprintDto }>(`/sprints/${id}/complete`, { incompleteDestination });
  return res.data.data;
}
