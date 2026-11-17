import { Paginated, Post, PostInput } from '../types';
import { api, PAGE_SIZE } from './client';

// As chamadas de posts. Autor e dono vem do servidor; o app so manda titulo e conteudo.

export async function listPosts(page = 1): Promise<Paginated<Post>> {
  const { data } = await api.get<Paginated<Post>>('/posts', {
    params: { page, limit: PAGE_SIZE },
  });
  return data;
}

export async function searchPosts(term: string, page = 1): Promise<Paginated<Post>> {
  const { data } = await api.get<Paginated<Post>>('/posts/search', {
    params: { term, page, limit: PAGE_SIZE },
  });
  return data;
}

export async function getPost(id: string): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${id}`);
  return data;
}

export async function createPost(input: PostInput): Promise<Post> {
  const { data } = await api.post<Post>('/posts', input);
  return data;
}

export async function updatePost(id: string, input: PostInput): Promise<Post> {
  const { data } = await api.put<Post>(`/posts/${id}`, input);
  return data;
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/posts/${id}`);
}
