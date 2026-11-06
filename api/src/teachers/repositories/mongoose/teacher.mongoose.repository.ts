import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITeacher } from '../../models/teacher.interface';
import { Teacher, TeacherDocument } from '../../schemas/teacher.schema';
import { CreateTeacherInput, TeacherRepository } from '../teacher.repository';

@Injectable()
export class TeacherMongooseRepository implements TeacherRepository {
  constructor(
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
  ) {}

  async findByEmail(email: string): Promise<ITeacher | null> {
    const teacher = await this.teacherModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
    return teacher ? this.map(teacher) : null;
  }

  async create(input: CreateTeacherInput): Promise<ITeacher> {
    const teacher = await new this.teacherModel(input).save();
    return this.map(teacher);
  }

  private map(teacher: TeacherDocument): ITeacher {
    return {
      id: teacher._id.toString(),
      name: teacher.name,
      email: teacher.email,
      password: teacher.password,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }
}
