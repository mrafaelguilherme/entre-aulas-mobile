import { NotFoundException } from '@nestjs/common';
import { IPost } from '../models/post.interface';
import { PostRepository } from '../repositories/post.repository';
import { PostService } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let repository: jest.Mocked<PostRepository>;

  const post: IPost = {
    id: '507f1f77bcf86cd799439011',
    title: 'Node.js class',
    content: 'Introduction to Node.js',
    author: 'Professor Maria',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PostRepository>;
    service = new PostService(repository);
  });

  it('should list all posts', async () => {
    repository.findAll.mockResolvedValue([post]);

    await expect(service.findAll()).resolves.toEqual([post]);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });

  it('should find a post by ID', async () => {
    repository.findById.mockResolvedValue(post);

    await expect(service.findById(post.id)).resolves.toEqual(post);
    expect(repository.findById).toHaveBeenCalledWith(post.id);
  });

  it('should throw when a post does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById('invalid-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should search posts with a trimmed term', async () => {
    repository.search.mockResolvedValue([post]);

    await expect(service.search('  Node  ')).resolves.toEqual([post]);
    expect(repository.search).toHaveBeenCalledWith('Node');
  });

  it('should create a post', async () => {
    const input = {
      title: post.title,
      content: post.content,
      author: post.author,
    };
    repository.create.mockResolvedValue(post);

    await expect(service.create(input)).resolves.toEqual(post);
    expect(repository.create).toHaveBeenCalledWith(input);
  });

  it('should update a post', async () => {
    const input = { title: 'Updated title' };
    const updatedPost = { ...post, ...input };
    repository.update.mockResolvedValue(updatedPost);

    await expect(service.update(post.id, input)).resolves.toEqual(updatedPost);
    expect(repository.update).toHaveBeenCalledWith(post.id, input);
  });

  it('should throw when updating a missing post', async () => {
    repository.update.mockResolvedValue(null);

    await expect(
      service.update('invalid-id', { title: 'Updated title' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should permanently delete a post', async () => {
    repository.delete.mockResolvedValue(true);

    await expect(service.delete(post.id)).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(post.id);
  });

  it('should throw when deleting a missing post', async () => {
    repository.delete.mockResolvedValue(false);

    await expect(service.delete('invalid-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
