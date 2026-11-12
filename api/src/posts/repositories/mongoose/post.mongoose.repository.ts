import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Paginated } from '../../../shared/pagination/pagination';
import { IPost } from '../../models/post.interface';
import { Post, PostDocument } from '../../schemas/post.schema';
import {
  CreatePostInput,
  PostRepository,
  UpdatePostInput,
} from '../post.repository';

@Injectable()
export class PostMongooseRepository implements PostRepository {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  list(page: number, limit: number): Promise<Paginated<IPost>> {
    return this.paginate({}, page, limit);
  }

  search(term: string, page: number, limit: number): Promise<Paginated<IPost>> {
    // Escapa os simbolos da expressao regular: "c++" vira texto, nao padrao.
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escapedTerm, 'i');
    return this.paginate(
      { $or: [{ title: expression }, { content: expression }] },
      page,
      limit,
    );
  }

  async findById(id: string): Promise<IPost | null> {
    const post = await this.postModel.findById(id).exec();
    return post ? this.map(post) : null;
  }

  async create(input: CreatePostInput): Promise<IPost> {
    const post = await new this.postModel(input).save();
    return this.map(post);
  }

  async update(id: string, input: UpdatePostInput): Promise<IPost | null> {
    const post = await this.postModel
      .findByIdAndUpdate(id, input, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
    return post ? this.map(post) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.postModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  private async paginate(
    query: QueryFilter<PostDocument>,
    page: number,
    limit: number,
  ): Promise<Paginated<IPost>> {
    const [posts, total] = await Promise.all([
      this.postModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments(query).exec(),
    ]);
    return { items: posts.map((post) => this.map(post)), page, limit, total };
  }

  private map(post: PostDocument): IPost {
    return {
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      author: post.author,
      authorId: post.authorId,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
