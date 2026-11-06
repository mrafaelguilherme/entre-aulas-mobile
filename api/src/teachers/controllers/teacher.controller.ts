import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { TeacherService } from '../services/teacher.service';

const createTeacherSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const signinSchema = createTeacherSchema.pick({ email: true, password: true });

type CreateTeacher = {
  name: string;
  email: string;
  password: string;
};
type Signin = Pick<CreateTeacher, 'email' | 'password'>;

@ApiTags('teachers')
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post()
  @ApiOperation({ summary: 'Register a teacher' })
  @ApiResponse({ status: 201, description: 'Teacher registered successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', example: 'Professor Maria' },
        email: { type: 'string', example: 'maria@escola.com.br' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  create(
    @Body(new ZodValidationPipe(createTeacherSchema)) input: CreateTeacher,
  ) {
    return this.teacherService.create(input);
  }

  @Post('signin')
  @ApiOperation({ summary: 'Authenticate a teacher and return a JWT' })
  @ApiResponse({
    status: 200,
    description: 'Teacher authenticated successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'maria@escola.com.br' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  signin(@Body(new ZodValidationPipe(signinSchema)) input: Signin) {
    return this.teacherService.signin(input);
  }
}
