import api from './api.client';
import type { WorkLogDto } from '@shared/types/api.types';

export async function getWorkLogs(ticketId: string): Promise<WorkLogDto[]> {
  const res = await api.get<{ data: WorkLogDto[] }>(`/work-logs/ticket/${ticketId}`);
  return res.data.data;
}
export async function getProjectWorkLogs(projectId: string): Promise<WorkLogDto[]> {
  const res = await api.get<{ data: WorkLogDto[] }>(`/work-logs/project/${projectId}`);
  return res.data.data;
}
export async function createWorkLog(data: { ticketId: string; minutesLogged: number; logDate: string; note?: string | null }): Promise<WorkLogDto> {
  const res = await api.post<{ data: WorkLogDto }>('/work-logs', data);
  return res.data.data;
}
export async function updateWorkLog(id: string, data: { minutesLogged: number; logDate: string; note?: string | null }): Promise<WorkLogDto> {
  const res = await api.patch<{ data: WorkLogDto }>(`/work-logs/${id}`, data);
  return res.data.data;
}
export async function deleteWorkLog(id: string): Promise<void> {
  await api.delete(`/work-logs/${id}`);
}
