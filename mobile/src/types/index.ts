// Espelho do que a API devolve. Se a API mudar, este arquivo muda junto.

export type UserRole = 'master' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'deleted';

// Quem esta logado: a resposta de GET /me.
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
}

// Uma pessoa nas listas de professores, alunos e contas excluidas.
export interface Person {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  invitedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  // Nome de quem criou, para mostrar. A posse usa authorId.
  author: string;
  authorId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  author: string;
  authorId: string;
  createdAt?: string;
}

// Toda lista da API vem neste formato.
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface PostInput {
  title: string;
  content: string;
}

export interface PersonInput {
  name: string;
  email: string;
  password?: string;
}
