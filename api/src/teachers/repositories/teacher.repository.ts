import { ITeacher } from '../models/teacher.interface';

export type CreateTeacherInput = Pick<ITeacher, 'name' | 'email' | 'password'>;

export abstract class TeacherRepository {
  abstract findByEmail(email: string): Promise<ITeacher | null>;
  abstract create(teacher: CreateTeacherInput): Promise<ITeacher>;
}
