import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ITeacherResponse } from '../models/teacher.interface';
import {
  CreateTeacherInput,
  TeacherRepository,
} from '../repositories/teacher.repository';

export type SigninInput = Pick<CreateTeacherInput, 'email' | 'password'>;

@Injectable()
export class TeacherService {
  constructor(
    private readonly teacherRepository: TeacherRepository,
    private readonly jwtService: JwtService,
  ) {}

  async create(input: CreateTeacherInput): Promise<ITeacherResponse> {
    const normalizedEmail = input.email.toLowerCase();
    const existingTeacher =
      await this.teacherRepository.findByEmail(normalizedEmail);

    if (existingTeacher) {
      throw new ConflictException('Email is already registered');
    }

    const password = await hash(input.password, 8);
    const teacher = await this.teacherRepository.create({
      ...input,
      email: normalizedEmail,
      password,
    });

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      createdAt: teacher.createdAt,
    };
  }

  async signin(input: SigninInput): Promise<{ token: string }> {
    const teacher = await this.teacherRepository.findByEmail(
      input.email.toLowerCase(),
    );

    if (!teacher || !(await compare(input.password, teacher.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: teacher.id,
      name: teacher.name,
      email: teacher.email,
    });

    return { token };
  }
}
