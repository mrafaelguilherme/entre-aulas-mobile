import { Comment, Paginated } from '../types';
import { api, PAGE_SIZE } from './client';

// Comentarios vivem dentro de um post: a lista e a criacao usam a rota do post.

export async function listComments(postId: string, page = 1): Promise<Paginated<Comment>> {
  const { data } = await api.get<Paginated<Comment>>(`/posts/${postId}/comments`, {
    params: { page, limit: PAGE_SIZE },
  });
  return data;
}

export async function createComment(postId: string, content: string): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, { content });
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  await api.delete(`/comments/${id}`);
}
