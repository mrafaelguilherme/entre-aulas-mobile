import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  IUser,
  USER_ROLES,
  USER_STATUSES,
  UserRole,
  UserStatus,
} from '../models/user.interface';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, versionKey: false })
export class User implements Omit<IUser, 'id'> {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // select: false deixa a senha fora de toda consulta, a menos que seja pedida.
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: [...USER_ROLES] })
  role: UserRole;

  @Prop({ required: true, enum: [...USER_STATUSES], default: 'active' })
  status: UserStatus;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({ type: String, default: null })
  invitedBy: string | null;

  @Prop({ default: 0 })
  failedLoginCount: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ status: -1, createdAt: -1 });
