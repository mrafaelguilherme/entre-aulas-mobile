import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { IPost } from '../models/post.interface';
import { PostRepository } from '../repositories/post.repository';
import { PostService } from './post.service';

const teacher: AuthenticatedUser = {
  id: 'ana-id',
  name: 'Professora Ana',
  email: 'ana@escola.com.br',
  role: 'teacher',
  status: 'active',
  mustChangePassword: false,
};
const other: AuthenticatedUser = {
  ...teacher,
  id: 'carlos-id',
  name: 'Professor Carlos',
};
const master: AuthenticatedUser = {
  ...teacher,
  id: 'master-id',
  name: 'Master',
  role: 'master',
};

const post: IPost = {
  id: '507f1f77bcf86cd799439011',
  title: 'Node.js class',
  content: 'Introduction to Node.js',
  author: teacher.name,
  authorId: teacher.id,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};
const page = { items: [post], page: 1, limit: 20, total: 1 };

describe('PostService', () => {
  let service: PostService;
  let repository: jest.Mocked<PostRepository>;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      search: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PostRepository>;
    service = new PostService(repository);
  });

  it('lists posts with pagination', async () => {
    repository.list.mockResolvedValue(page);

    await expect(service.list(2, 10)).resolves.toEqual(page);
    expect(repository.list).toHaveBeenCalledWith(2, 10);
  });

  it('searches with a trimmed term', async () => {
    repository.search.mockResolvedValue(page);

    await expect(service.search('  Node  ', 1, 20)).resolves.toEqual(page);
    expect(repository.search).toHaveBeenCalledWith('Node', 1, 20);
  });

  it('finds a post by ID and throws 404 when it does not exist', async () => {
    repository.findById.mockResolvedValueOnce(post).mockResolvedValueOnce(null);

    await expect(service.findById(post.id)).resolves.toEqual(post);
    await expect(service.findById(post.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a post with author and authorId taken from the logged-in user', async () => {
    repository.create.mockResolvedValue(post);
    const input = { title: post.title, content: post.content };

    await expect(service.create(input, teacher)).resolves.toEqual(post);
    expect(repository.create).toHaveBeenCalledWith({
      ...input,
      author: 'Professora Ana',
      authorId: 'ana-id',
    });
  });

  it('lets the creator update the post', async () => {
    repository.findById.mockResolvedValue(post);
    repository.update.mockResolvedValue({ ...post, title: 'Updated' });

    await expect(
      service.update(post.id, { title: 'Updated' }, teacher),
    ).resolves.toMatchObject({ title: 'Updated' });
    expect(repository.update).toHaveBeenCalledWith(post.id, {
      title: 'Updated',
    });
  });

  it('refuses the update of another teacher post with 403, even for the master', async () => {
    repository.findById.mockResolvedValue(post);

    for (const actor of [other, master]) {
      await expect(
        service.update(post.id, { title: 'Hacked' }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('lets the creator and the master delete, and refuses another teacher', async () => {
    repository.findById.mockResolvedValue(post);
    repository.delete.mockResolvedValue(true);

    await expect(service.delete(post.id, other)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.delete(post.id, teacher)).resolves.toBeUndefined();
    await expect(service.delete(post.id, master)).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledTimes(2);
  });

  it('throws 404 when updating or deleting a missing post', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update(post.id, { title: 'X' }, teacher),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete(post.id, teacher)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
