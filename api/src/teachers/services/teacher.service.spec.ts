import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ITeacher } from '../models/teacher.interface';
import { TeacherRepository } from '../repositories/teacher.repository';
import { TeacherService } from './teacher.service';

describe('TeacherService', () => {
  let service: TeacherService;
  let repository: jest.Mocked<TeacherRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const input = {
    name: 'Professor Maria',
    email: 'MARIA@ESCOLA.COM.BR',
    password: 'password123',
  };

  beforeEach(() => {
    repository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TeacherRepository>;
    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    service = new TeacherService(repository, jwtService);
  });

  it('should create a teacher with a bcrypt hash', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockImplementation(async (teacher) => ({
      id: 'teacher-id',
      createdAt: new Date('2026-01-01'),
      ...teacher,
    }));

    const result = await service.create(input);
    const savedTeacher = repository.create.mock.calls[0][0];

    expect(repository.findByEmail).toHaveBeenCalledWith('maria@escola.com.br');
    expect(savedTeacher.password).not.toBe(input.password);
    await expect(compare(input.password, savedTeacher.password)).resolves.toBe(
      true,
    );
    expect(result).not.toHaveProperty('password');
    expect(result.email).toBe('maria@escola.com.br');
  });

  it('should not create a teacher with a registered email', async () => {
    repository.findByEmail.mockResolvedValue({} as ITeacher);

    await expect(service.create(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should sign in and return a JWT', async () => {
    const encryptedPassword = await hash(input.password, 8);
    repository.findByEmail.mockResolvedValue({
      id: 'teacher-id',
      name: input.name,
      email: 'maria@escola.com.br',
      password: encryptedPassword,
    });
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.signin({
      email: input.email,
      password: input.password,
    });

    expect(result).toEqual({ token: 'jwt-token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'teacher-id',
      name: input.name,
      email: 'maria@escola.com.br',
    });
  });

  it('should reject an unknown email', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(
      service.signin({ email: input.email, password: input.password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject an invalid password', async () => {
    const encryptedPassword = await hash(input.password, 8);
    repository.findByEmail.mockResolvedValue({
      id: 'teacher-id',
      name: input.name,
      email: 'maria@escola.com.br',
      password: encryptedPassword,
    });

    await expect(
      service.signin({ email: input.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
