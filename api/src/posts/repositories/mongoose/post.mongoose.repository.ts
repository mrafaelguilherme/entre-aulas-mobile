import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
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

  async findAll(): Promise<IPost[]> {
    const posts = await this.postModel.find().sort({ createdAt: -1 }).exec();
    return posts.map((post) => this.map(post));
  }

  async findById(id: string): Promise<IPost | null> {
    if (!isValidObjectId(id)) return null;
    const post = await this.postModel.findById(id).exec();
    return post ? this.map(post) : null;
  }

  async search(term: string): Promise<IPost[]> {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escapedTerm, 'i');
    const posts = await this.postModel
      .find({ $or: [{ title: expression }, { content: expression }] })
      .sort({ createdAt: -1 })
      .exec();
    return posts.map((post) => this.map(post));
  }

  async create(input: CreatePostInput): Promise<IPost> {
    const post = await new this.postModel(input).save();
    return this.map(post);
  }

  async update(id: string, input: UpdatePostInput): Promise<IPost | null> {
    if (!isValidObjectId(id)) return null;
    const post = await this.postModel
      .findByIdAndUpdate(id, input, { new: true, runValidators: true })
      .exec();
    return post ? this.map(post) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await this.postModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  private map(post: PostDocument): IPost {
    return {
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      author: post.author,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
