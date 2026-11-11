import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Paginated } from '../../../../shared/pagination/pagination';
import { IUser, UserRole } from '../../models/user.interface';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  CreateUserInput,
  UpdateProfileInput,
  UserListFilter,
  UserRepository,
} from '../user.repository';

const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class UserMongooseRepository implements UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string, roles?: UserRole[]): Promise<IUser | null> {
    if (!OBJECT_ID.test(id)) return null;
    const user = await this.userModel
      .findOne({ _id: id, ...this.notDeleted(), ...this.withRoles(roles) })
      .exec();
    return user ? this.map(user) : null;
  }

  async findForLogin(email: string): Promise<IUser | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase(), status: 'active' })
      .select('+password')
      .exec();
    return user ? this.map(user) : null;
  }

  async findWithPassword(id: string): Promise<IUser | null> {
    const user = await this.userModel
      .findOne({ _id: id, status: 'active' })
      .select('+password')
      .exec();
    return user ? this.map(user) : null;
  }

  async create(input: CreateUserInput): Promise<IUser> {
    const user = await new this.userModel(input).save();
    return this.map(user);
  }

  async list(
    filter: UserListFilter,
    page: number,
    limit: number,
  ): Promise<Paginated<IUser>> {
    const query: QueryFilter<UserDocument> = {
      ...this.withRoles(filter.roles),
      status: filter.status ?? { $ne: 'deleted' },
    };
    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ status: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);
    return { items: users.map((user) => this.map(user)), page, limit, total };
  }

  async updateProfile(
    id: string,
    roles: UserRole[],
    input: UpdateProfileInput,
  ): Promise<IUser | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, ...this.notDeleted(), ...this.withRoles(roles) },
        { $set: input },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    return user ? this.map(user) : null;
  }

  async setPassword(
    id: string,
    hash: string,
    mustChange: boolean,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          $set: {
            password: hash,
            mustChangePassword: mustChange,
            failedLoginCount: 0,
            lockedUntil: null,
          },
          $inc: { tokenVersion: 1 },
        },
      )
      .exec();
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: id }, { $inc: { tokenVersion: 1 } })
      .exec();
  }

  async approve(id: string): Promise<IUser | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, status: 'pending' },
        { $set: { status: 'active' } },
        { returnDocument: 'after' },
      )
      .exec();
    return user ? this.map(user) : null;
  }

  async removePending(id: string): Promise<boolean> {
    const result = await this.userModel
      .deleteOne({ _id: id, status: 'pending' })
      .exec();
    return result.deletedCount === 1;
  }

  async softDelete(id: string, roles: UserRole[]): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        { _id: id, ...this.notDeleted(), ...this.withRoles(roles) },
        { $set: { status: 'deleted' }, $inc: { tokenVersion: 1 } },
      )
      .exec();
    return result.matchedCount === 1;
  }

  async restore(id: string): Promise<IUser | null> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, status: 'deleted' },
        { $set: { status: 'active' } },
        { returnDocument: 'after' },
      )
      .exec();
    return user ? this.map(user) : null;
  }

  async masterExists(): Promise<boolean> {
    const master = await this.userModel.exists({ role: 'master' }).exec();
    return master !== null;
  }

  async registerLoginFailure(id: string): Promise<void> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id },
        { $inc: { failedLoginCount: 1 } },
        { returnDocument: 'after' },
      )
      .exec();

    if (user && user.failedLoginCount >= LOCK_AFTER_FAILURES) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      await this.userModel
        .updateOne({ _id: id }, { $set: { failedLoginCount: 0, lockedUntil } })
        .exec();
    }
  }

  async resetLoginFailures(id: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        { $set: { failedLoginCount: 0, lockedUntil: null } },
      )
      .exec();
  }

  private notDeleted(): QueryFilter<UserDocument> {
    return { status: { $ne: 'deleted' } };
  }

  private withRoles(roles?: UserRole[]): QueryFilter<UserDocument> {
    return roles ? { role: { $in: roles } } : {};
  }

  private map(user: UserDocument): IUser {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      tokenVersion: user.tokenVersion,
      invitedBy: user.invitedBy ?? null,
      failedLoginCount: user.failedLoginCount,
      lockedUntil: user.lockedUntil ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // A senha so entra quando a consulta pediu por ela.
      ...(user.password !== undefined && { password: user.password }),
    };
  }
}
