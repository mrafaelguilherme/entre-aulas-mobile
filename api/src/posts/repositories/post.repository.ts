import { Paginated } from '../../shared/pagination/pagination';
import { IPost } from '../models/post.interface';

export type PostFieldsInput = Pick<IPost, 'title' | 'content'>;
export type CreatePostInput = Pick<
  IPost,
  'title' | 'content' | 'author' | 'authorId'
>;
export type UpdatePostInput = Partial<PostFieldsInput>;

export abstract class PostRepository {
  abstract list(page: number, limit: number): Promise<Paginated<IPost>>;
  abstract search(
    term: string,
    page: number,
    limit: number,
  ): Promise<Paginated<IPost>>;
  abstract findById(id: string): Promise<IPost | null>;
  abstract create(post: CreatePostInput): Promise<IPost>;
  abstract update(id: string, post: UpdatePostInput): Promise<IPost | null>;
  abstract delete(id: string): Promise<boolean>;
}
