import { Comment, Post, SessionUser, UserRole } from '../types';

// Estas regras so decidem o que a tela mostra ou desativa.
// A regra que vale de verdade esta na API, que confere tudo de novo.

const TEACHER_ROLES: UserRole[] = ['teacher', 'master'];

type Actor = Pick<SessionUser, 'id' | 'role'> | null;

export function isTeacher(user: Actor): boolean {
  return user !== null && TEACHER_ROLES.includes(user.role);
}

// Editar: so quem criou. Nem o master edita o post de outra pessoa.
export function canEditPost(user: Actor, post: Pick<Post, 'authorId'>): boolean {
  return user !== null && user.id === post.authorId;
}

// Excluir: quem criou ou o master.
export function canDeletePost(user: Actor, post: Pick<Post, 'authorId'>): boolean {
  return user !== null && (user.role === 'master' || user.id === post.authorId);
}

// Apagar comentario: o autor, qualquer professor ou o master.
export function canDeleteComment(user: Actor, comment: Pick<Comment, 'authorId'>): boolean {
  return user !== null && (isTeacher(user) || user.id === comment.authorId);
}

// Editar professor: o master, ou a propria pessoa no proprio cadastro.
export function canManageTeacher(user: Actor, teacherId: string): boolean {
  return user !== null && (user.role === 'master' || user.id === teacherId);
}

// Excluir professor: so o master, e nunca a si mesmo.
export function canDeleteTeacher(user: Actor, teacherId: string): boolean {
  return user !== null && user.role === 'master' && user.id !== teacherId;
}

// Redefinir a senha de outra pessoa: so o master, e nunca a propria.
export function canResetPassword(user: Actor, personId: string): boolean {
  return user !== null && user.role === 'master' && user.id !== personId;
}
