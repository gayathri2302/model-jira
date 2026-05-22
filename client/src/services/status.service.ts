import api from './api.client';
import type { StatusDto } from '@shared/types/api.types';

export async function getStatuses(projectId: string): Promise<StatusDto[]> {
  const res = await api.get<{ data: StatusDto[] }>(`/statuses/project/${projectId}`);
  return res.data.data;
}

export async function createStatus(data: {
  projectId: string;
  name: string;
  color: string;
  position: number;
  category: 'todo' | 'in_progress' | 'done';
}): Promise<StatusDto> {
  const res = await api.post<{ data: StatusDto }>('/statuses', data);
  return res.data.data;
}
