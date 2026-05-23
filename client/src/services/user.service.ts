import api from './api.client';
import type { UserDto } from '@shared/types/api.types';

export async function getUsers(): Promise<UserDto[]> {
  const res = await api.get<{ data: UserDto[] }>('/users');
  return res.data.data;
}
