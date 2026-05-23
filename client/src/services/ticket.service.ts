import api from './api.client';
import type { TicketDto } from '@shared/types/api.types';

export async function getTicketsByProject(projectId: string): Promise<TicketDto[]> {
  const res = await api.get<{ data: TicketDto[] }>(`/tickets/project/${projectId}`);
  return res.data.data;
}

export async function getTicket(id: string): Promise<TicketDto> {
  const res = await api.get<{ data: TicketDto }>(`/tickets/${id}`);
  return res.data.data;
}

export async function createTicket(data: {
  projectId: string;
  title: string;
  description?: string | null;
  type?: string;
  priority?: string;
  statusId: string;
  epicId?: string | null;
  assigneeId?: string | null;
  storyPoints?: number | null;
  dueDate?: string | null;
}): Promise<TicketDto> {
  const res = await api.post<{ data: TicketDto }>('/tickets', data);
  return res.data.data;
}

export async function updateTicket(
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    type: string;
    priority: string;
    statusId: string;
    epicId: string | null;
    assigneeId: string | null;
    reporterId: string;
    storyPoints: number | null;
    dueDate: string | null;
  }>,
): Promise<TicketDto> {
  const res = await api.patch<{ data: TicketDto }>(`/tickets/${id}`, data);
  return res.data.data;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/tickets/${id}`);
}
