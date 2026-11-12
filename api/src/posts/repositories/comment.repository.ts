import { Paginated } from '../../shared/pagination/pagination';
import { IComment } from '../models/comment.interface';

export type CreateCommentInput = Pick<
  IComment,
  'postId' | 'content' | 'author' | 'authorId'
>;

export abstract class CommentRepository {
  // Do mais antigo para o mais novo, como uma conversa.
  abstract listByPost(
    postId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<IComment>>;
  abstract findById(id: string): Promise<IComment | null>;
  abstract create(input: CreateCommentInput): Promise<IComment>;
  abstract delete(id: string): Promise<boolean>;
  abstract deleteByPost(postId: string): Promise<void>;
}
