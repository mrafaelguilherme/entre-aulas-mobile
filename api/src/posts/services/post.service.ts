import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Paginated } from '../../shared/pagination/pagination';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { IPost } from '../models/post.interface';
import { CommentRepository } from '../repositories/comment.repository';
import {
  PostFieldsInput,
  PostRepository,
  UpdatePostInput,
} from '../repositories/post.repository';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly commentRepository: CommentRepository,
  ) {}

  list(page: number, limit: number): Promise<Paginated<IPost>> {
    return this.postRepository.list(page, limit);
  }

  search(term: string, page: number, limit: number): Promise<Paginated<IPost>> {
    return this.postRepository.search(term.trim(), page, limit);
  }

  async findById(id: string): Promise<IPost> {
    const post = await this.postRepository.findById(id);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  // Autor e dono vem de quem esta logado, nunca do corpo da requisicao.
  create(input: PostFieldsInput, actor: AuthenticatedUser): Promise<IPost> {
    return this.postRepository.create({
      ...input,
      author: actor.name,
      authorId: actor.id,
    });
  }

  // So quem criou edita. A comparacao e por ID, nunca por nome.
  async update(
    id: string,
    input: UpdatePostInput,
    actor: AuthenticatedUser,
  ): Promise<IPost> {
    const post = await this.findById(id);

    if (post.authorId !== actor.id) {
      throw new ForbiddenException('Only the author can update this post');
    }

    const updated = await this.postRepository.update(id, input);

    if (!updated) {
      throw new NotFoundException('Post not found');
    }

    return updated;
  }

  // Quem criou ou o master excluem. Os comentarios do post vao junto.
  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    const post = await this.findById(id);

    if (post.authorId !== actor.id && actor.role !== 'master') {
      throw new ForbiddenException(
        'Only the author or the master can delete this post',
      );
    }

    await this.postRepository.delete(id);
    await this.commentRepository.deleteByPost(id);
  }
}
