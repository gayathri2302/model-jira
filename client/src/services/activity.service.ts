import api from './api.client';
import type { ActivityDto } from '@shared/types/api.types';

export async function getActivity(ticketId: string): Promise<ActivityDto[]> {
  const res = await api.get<{ data: ActivityDto[] }>(`/activity/ticket/${ticketId}`);
  return res.data.data;
}
