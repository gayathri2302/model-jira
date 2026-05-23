import api from './api.client';
import type { AttachmentDto } from '@shared/types/api.types';

export async function getAttachments(ticketId: string): Promise<AttachmentDto[]> {
  const res = await api.get<{ data: AttachmentDto[] }>(`/attachments/ticket/${ticketId}`);
  return res.data.data;
}

export async function uploadAttachment(ticketId: string, file: File): Promise<AttachmentDto> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ data: AttachmentDto }>(`/attachments/ticket/${ticketId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`);
}
