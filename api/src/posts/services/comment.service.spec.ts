import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { IComment } from '../models/comment.interface';
import { IPost } from '../models/post.interface';
import { CommentRepository } from '../repositories/comment.repository';
import { CommentService } from './comment.service';
import { PostService } from './post.service';

const student: AuthenticatedUser = {
  id: 'bia-id',
  name: 'Beatriz Souza',
  email: 'bia@escola.com.br',
  role: 'student',
  status: 'active',
  mustChangePassword: false,
};
const otherStudent: AuthenticatedUser = { ...student, id: 'caio-id' };
const teacher: AuthenticatedUser = {
  ...student,
  id: 'ana-id',
  role: 'teacher',
};
const master: AuthenticatedUser = {
  ...student,
  id: 'master-id',
  role: 'master',
};

const comment: IComment = {
  id: 'comment-id',
  postId: 'post-id',
  content: 'Otima aula!',
  author: student.name,
  authorId: student.id,
};

describe('CommentService', () => {
  let service: CommentService;
  let comments: jest.Mocked<CommentRepository>;
  let posts: jest.Mocked<PostService>;

  beforeEach(() => {
    comments = {
      listByPost: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteByPost: jest.fn(),
    } as unknown as jest.Mocked<CommentRepository>;
    posts = { findById: jest.fn() } as unknown as jest.Mocked<PostService>;
    service = new CommentService(comments, posts);
  });

  it('refuses to comment on a missing post and creates nothing', async () => {
    posts.findById.mockRejectedValue(new NotFoundException('Post not found'));

    await expect(
      service.create('post-id', 'Oi', student),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(comments.create).not.toHaveBeenCalled();
  });

  it('fills author and authorId from the logged-in user', async () => {
    posts.findById.mockResolvedValue({ id: 'post-id' } as IPost);
    comments.create.mockResolvedValue(comment);

    await expect(
      service.create('post-id', 'Otima aula!', student),
    ).resolves.toEqual(comment);
    expect(comments.create).toHaveBeenCalledWith({
      postId: 'post-id',
      content: 'Otima aula!',
      author: 'Beatriz Souza',
      authorId: 'bia-id',
    });
  });

  it('a student deletes only their own comment; teacher and master delete any', async () => {
    comments.findById.mockResolvedValue(comment);
    comments.delete.mockResolvedValue(true);

    await expect(
      service.delete(comment.id, otherStudent),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.delete(comment.id, student)).resolves.toBeUndefined();
    await expect(service.delete(comment.id, teacher)).resolves.toBeUndefined();
    await expect(service.delete(comment.id, master)).resolves.toBeUndefined();
    expect(comments.delete).toHaveBeenCalledTimes(3);
  });

  it('deleting a missing comment answers 404', async () => {
    comments.findById.mockResolvedValue(null);

    await expect(service.delete('x', master)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
