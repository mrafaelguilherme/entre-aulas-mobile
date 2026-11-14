import { Comment, Post, SessionUser } from '../../types';
import {
  canDeleteComment,
  canDeletePost,
  canDeleteTeacher,
  canEditPost,
  canManageTeacher,
  canResetPassword,
  isTeacher,
} from '../index';

const master: SessionUser = {
  id: 'm1',
  name: 'Master',
  email: 'master@escola.com.br',
  role: 'master',
  status: 'active',
  mustChangePassword: false,
};
const ana: SessionUser = { ...master, id: 't1', name: 'Ana', role: 'teacher' };
const carlos: SessionUser = { ...master, id: 't2', name: 'Carlos', role: 'teacher' };
const beatriz: SessionUser = { ...master, id: 's1', name: 'Beatriz', role: 'student' };

const anaPost: Post = { id: 'p1', title: 'T', content: 'C', author: 'Ana', authorId: 't1' };
const beatrizComment: Comment = {
  id: 'c1',
  postId: 'p1',
  content: 'Oi',
  author: 'Beatriz',
  authorId: 's1',
};
const anaComment: Comment = { ...beatrizComment, id: 'c2', author: 'Ana', authorId: 't1' };

describe('posts', () => {
  it('canEditPost is true only for the author', () => {
    expect(canEditPost(ana, anaPost)).toBe(true);
    expect(canEditPost(carlos, anaPost)).toBe(false);
    expect(canEditPost(null, anaPost)).toBe(false);
  });

  it('canEditPost is false for the master on another teacher post', () => {
    expect(canEditPost(master, anaPost)).toBe(false);
  });

  it('canDeletePost is true for the author and for the master', () => {
    expect(canDeletePost(ana, anaPost)).toBe(true);
    expect(canDeletePost(master, anaPost)).toBe(true);
    expect(canDeletePost(carlos, anaPost)).toBe(false);
    expect(canDeletePost(beatriz, anaPost)).toBe(false);
  });
});

describe('comments', () => {
  it('canDeleteComment is true for own comment and for teacher and master', () => {
    expect(canDeleteComment(beatriz, beatrizComment)).toBe(true);
    expect(canDeleteComment(carlos, beatrizComment)).toBe(true);
    expect(canDeleteComment(master, beatrizComment)).toBe(true);
  });

  it('a student cannot delete someone else comment', () => {
    expect(canDeleteComment(beatriz, anaComment)).toBe(false);
    expect(canDeleteComment(null, anaComment)).toBe(false);
  });
});

describe('people', () => {
  it('isTeacher is true for teacher and master only', () => {
    expect(isTeacher(ana)).toBe(true);
    expect(isTeacher(master)).toBe(true);
    expect(isTeacher(beatriz)).toBe(false);
    expect(isTeacher(null)).toBe(false);
  });

  it('canManageTeacher: the master, or the own record', () => {
    expect(canManageTeacher(master, 't1')).toBe(true);
    expect(canManageTeacher(ana, 't1')).toBe(true);
    expect(canManageTeacher(ana, 't2')).toBe(false);
  });

  it('canDeleteTeacher: only the master, never themselves', () => {
    expect(canDeleteTeacher(master, 't1')).toBe(true);
    expect(canDeleteTeacher(master, 'm1')).toBe(false);
    expect(canDeleteTeacher(ana, 't2')).toBe(false);
  });

  it('canResetPassword: only the master, on another account', () => {
    expect(canResetPassword(master, 's1')).toBe(true);
    expect(canResetPassword(master, 'm1')).toBe(false);
    expect(canResetPassword(ana, 's1')).toBe(false);
  });
});
