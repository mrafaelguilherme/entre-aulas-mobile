export interface IComment {
  id: string;
  postId: string;
  content: string;
  author: string;
  authorId: string;
  createdAt?: Date;
}
