import api from './api.client';
import type { ProjectDto } from '@shared/types/api.types';

export async function getProjects(): Promise<ProjectDto[]> {
  const res = await api.get<{ data: ProjectDto[] }>('/projects');
  return res.data.data;
}

export async function getProject(id: string): Promise<ProjectDto> {
  const res = await api.get<{ data: ProjectDto }>(`/projects/${id}`);
  return res.data.data;
}

export async function createProject(data: {
  key: string;
  name: string;
  description?: string | null;
}): Promise<ProjectDto> {
  const res = await api.post<{ data: ProjectDto }>('/projects', data);
  return res.data.data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}
