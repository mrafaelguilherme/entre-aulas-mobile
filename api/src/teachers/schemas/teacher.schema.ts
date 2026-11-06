import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ITeacher } from '../models/teacher.interface';

export type TeacherDocument = HydratedDocument<Teacher>;

@Schema({ timestamps: true, versionKey: false })
export class Teacher implements Omit<ITeacher, 'id'> {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);
