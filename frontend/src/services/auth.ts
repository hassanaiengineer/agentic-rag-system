import { api } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function loginRequest(email: string, password: string): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/login', { email, password });
  return res.data;
}

export async function registerRequest(
  email: string,
  password: string,
  name: string
): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/auth/register', { email, password, name });
  return res.data;
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get<AuthUser>('/auth/me');
  return res.data;
}
