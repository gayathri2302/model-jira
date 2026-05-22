import api from './api.client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@shared/types/api.types';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<{ success: true; data: AuthResponse }>('/auth/login', data);
  return res.data.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<{ success: true; data: AuthResponse }>('/auth/register', data);
  return res.data.data;
}
