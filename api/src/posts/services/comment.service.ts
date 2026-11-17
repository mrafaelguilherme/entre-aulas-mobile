import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Paginated } from '../../shared/pagination/pagination';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { IComment } from '../models/comment.interface';
import { CommentRepository } from '../repositories/comment.repository';
import { PostService } from './post.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly comments: CommentRepository,
    private readonly posts: PostService,
  ) {}

  async listByPost(
    postId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<IComment>> {
    await this.posts.findById(postId); // 404 se o post nao existe
    return this.comments.listByPost(postId, page, limit);
  }

  async create(
    postId: string,
    content: string,
    actor: AuthenticatedUser,
  ): Promise<IComment> {
    await this.posts.findById(postId);
    return this.comments.create({
      postId,
      content,
      author: actor.name,
      authorId: actor.id,
    });
  }

  // Aluno apaga so o proprio comentario. Professor e master moderam qualquer um.
  async delete(id: string, actor: AuthenticatedUser): Promise<void> {
    const comment = await this.comments.findById(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (actor.role === 'student' && comment.authorId !== actor.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.comments.delete(id);
  }
}
