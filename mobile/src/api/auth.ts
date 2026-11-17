import { SessionUser } from '../types';
import { api } from './client';

// As quatro chamadas da sessao. Cada funcao devolve so o que a tela precisa.

export async function signIn(email: string, password: string): Promise<string> {
  const { data } = await api.post<{ token: string }>('/auth/signin', { email, password });
  return data.token;
}

export async function getMe(): Promise<SessionUser> {
  const { data } = await api.get<SessionUser>('/me');
  return data;
}

export async function signOut(): Promise<void> {
  await api.post('/auth/signout');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put('/me/password', { currentPassword, newPassword });
}
