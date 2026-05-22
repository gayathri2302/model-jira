import api from './api.client';
import type { CommentDto } from '@shared/types/api.types';

export async function getComments(ticketId: string): Promise<CommentDto[]> {
  const res = await api.get<{ data: CommentDto[] }>(`/comments/ticket/${ticketId}`);
  return res.data.data;
}

export async function createComment(ticketId: string, body: string): Promise<CommentDto> {
  const res = await api.post<{ data: CommentDto }>('/comments', { ticketId, body });
  return res.data.data;
}

export async function updateComment(id: string, body: string): Promise<void> {
  await api.patch(`/comments/${id}`, { body });
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}
