import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Paginated } from '../../../shared/pagination/pagination';
import { IComment } from '../../models/comment.interface';
import { Comment, CommentDocument } from '../../schemas/comment.schema';
import { CommentRepository, CreateCommentInput } from '../comment.repository';

@Injectable()
export class CommentMongooseRepository implements CommentRepository {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
  ) {}

  async listByPost(
    postId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<IComment>> {
    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ postId })
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.commentModel.countDocuments({ postId }).exec(),
    ]);
    return {
      items: comments.map((comment) => this.map(comment)),
      page,
      limit,
      total,
    };
  }

  async findById(id: string): Promise<IComment | null> {
    const comment = await this.commentModel.findById(id).exec();
    return comment ? this.map(comment) : null;
  }

  async create(input: CreateCommentInput): Promise<IComment> {
    const comment = await new this.commentModel(input).save();
    return this.map(comment);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.commentModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async deleteByPost(postId: string): Promise<void> {
    await this.commentModel.deleteMany({ postId }).exec();
  }

  private map(comment: CommentDocument): IComment {
    return {
      id: comment._id.toString(),
      postId: comment.postId,
      content: comment.content,
      author: comment.author,
      authorId: comment.authorId,
      createdAt: comment.createdAt,
    };
  }
}
