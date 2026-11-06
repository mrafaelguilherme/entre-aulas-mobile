import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreatePostInput,
  PostRepository,
  UpdatePostInput,
} from '../repositories/post.repository';

@Injectable()
export class PostService {
  constructor(private readonly postRepository: PostRepository) {}

  findAll() {
    return this.postRepository.findAll();
  }

  search(term: string) {
    return this.postRepository.search(term.trim());
  }

  async findById(id: string) {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  create(input: CreatePostInput) {
    return this.postRepository.create(input);
  }

  async update(id: string, input: UpdatePostInput) {
    const post = await this.postRepository.update(id, input);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.postRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('Post not found');
    }
  }
}
