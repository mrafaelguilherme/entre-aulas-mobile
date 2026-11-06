import { IPost } from '../models/post.interface';

export type CreatePostInput = Pick<
  IPost,
  'title' | 'content' | 'author' | 'createdAt'
>;
export type UpdatePostInput = Partial<Pick<IPost, 'title' | 'content'>>;

export abstract class PostRepository {
  abstract findAll(): Promise<IPost[]>;
  abstract findById(id: string): Promise<IPost | null>;
  abstract search(term: string): Promise<IPost[]>;
  abstract create(post: CreatePostInput): Promise<IPost>;
  abstract update(id: string, post: UpdatePostInput): Promise<IPost | null>;
  abstract delete(id: string): Promise<boolean>;
}
