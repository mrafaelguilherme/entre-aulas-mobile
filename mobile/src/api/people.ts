import { Paginated, Person, PersonInput } from '../types';
import { api, PAGE_SIZE } from './client';

// Pessoas: professores, alunos e contas excluidas. Tres grupos de chamadas,
// um para cada conjunto de rotas da API.

type ProfileInput = { name?: string; email?: string };

export const teachersApi = {
  async list(page = 1, status?: 'pending' | 'active'): Promise<Paginated<Person>> {
    const { data } = await api.get<Paginated<Person>>('/teachers', {
      params: { page, limit: PAGE_SIZE, status },
    });
    return data;
  },
  async get(id: string): Promise<Person> {
    const { data } = await api.get<Person>(`/teachers/${id}`);
    return data;
  },
  // Professor comum gera um convite pendente; o master cria direto.
  async create(input: PersonInput): Promise<Person> {
    const { data } = await api.post<Person>('/teachers', input);
    return data;
  },
  async update(id: string, input: ProfileInput): Promise<Person> {
    const { data } = await api.put<Person>(`/teachers/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/teachers/${id}`);
  },
  async approve(id: string): Promise<Person> {
    const { data } = await api.post<Person>(`/teachers/${id}/approve`);
    return data;
  },
  async reject(id: string): Promise<void> {
    await api.post(`/teachers/${id}/reject`);
  },
};

export const studentsApi = {
  async list(page = 1): Promise<Paginated<Person>> {
    const { data } = await api.get<Paginated<Person>>('/students', {
      params: { page, limit: PAGE_SIZE },
    });
    return data;
  },
  async get(id: string): Promise<Person> {
    const { data } = await api.get<Person>(`/students/${id}`);
    return data;
  },
  async create(input: PersonInput): Promise<Person> {
    const { data } = await api.post<Person>('/students', input);
    return data;
  },
  async update(id: string, input: ProfileInput): Promise<Person> {
    const { data } = await api.put<Person>(`/students/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },
};

// So o master usa estas rotas.
export const usersApi = {
  async listDeleted(page = 1): Promise<Paginated<Person>> {
    const { data } = await api.get<Paginated<Person>>('/users/deleted', {
      params: { page, limit: PAGE_SIZE },
    });
    return data;
  },
  async restore(id: string): Promise<Person> {
    const { data } = await api.post<Person>(`/users/${id}/restore`);
    return data;
  },
  async resetPassword(id: string, password: string): Promise<void> {
    await api.post(`/users/${id}/reset-password`, { password });
  },
};
