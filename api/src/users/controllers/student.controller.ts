import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  AuthenticatedUser,
  TEACHER_ROLES,
  UserRole,
} from '../models/user.interface';
import { AccountService } from '../services/account.service';
import {
  CreateAccount,
  createAccountSchema,
  ListAccounts,
  listAccountsSchema,
  UpdateAccount,
  updateAccountSchema,
} from './account.schemas';

// Toda consulta filtra pelo perfil aluno. Um professor nao alcanca
// o master nem outro professor por esta rota, nem com o ID certo.
const STUDENT_ONLY: UserRole[] = ['student'];

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
@Roles(...TEACHER_ROLES)
export class StudentController {
  constructor(private readonly accounts: AccountService) {}

  @Get()
  @ApiOperation({ summary: 'List students' })
  list(@Query({ schema: listAccountsSchema }) query: ListAccounts) {
    return this.accounts.list(
      { roles: STUDENT_ONLY, status: query.status },
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a student by ID' })
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(id, STUDENT_ONLY);
  }

  @Post()
  @ApiOperation({ summary: 'Create a student (active, must change password)' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body({ schema: createAccountSchema }) input: CreateAccount,
  ) {
    return this.accounts.create(input, 'student', 'active', actor.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update name or email of a student' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateAccountSchema }) input: UpdateAccount,
  ) {
    return this.accounts.update(id, STUDENT_ONLY, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a student' })
  remove(@Param('id') id: string): Promise<void> {
    return this.accounts.softDelete(id, STUDENT_ONLY);
  }
}
