import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IComment } from '../models/comment.interface';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class Comment implements Omit<IComment, 'id'> {
  // Indice: a leitura de um post busca os comentarios por este campo.
  @Prop({ required: true, index: true })
  postId: string;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ required: true, trim: true })
  author: string;

  @Prop({ required: true })
  authorId: string;

  createdAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
