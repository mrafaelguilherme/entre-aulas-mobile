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
import { AuthenticatedUser, TEACHER_ROLES } from '../models/user.interface';
import { AccountService } from '../services/account.service';
import {
  CreateAccount,
  createAccountSchema,
  ListAccounts,
  listAccountsSchema,
  UpdateAccount,
  updateAccountSchema,
} from './account.schemas';

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
@Roles(...TEACHER_ROLES)
export class TeacherController {
  constructor(private readonly accounts: AccountService) {}

  @Get()
  @ApiOperation({ summary: 'List teachers and the master, pending first' })
  list(@Query({ schema: listAccountsSchema }) query: ListAccounts) {
    return this.accounts.list(
      { roles: TEACHER_ROLES, status: query.status },
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a teacher by ID' })
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(id, TEACHER_ROLES);
  }

  @Post()
  @ApiOperation({
    summary: 'Teacher: invite a colleague (pending). Master: create (active)',
  })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body({ schema: createAccountSchema }) input: CreateAccount,
  ) {
    return this.accounts.createTeacher(actor, input);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update name or email: the master, or the own account',
  })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body({ schema: updateAccountSchema }) input: UpdateAccount,
  ) {
    return this.accounts.updateTeacher(actor, id, input);
  }

  @Delete(':id')
  @Roles('master')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a teacher (master only, never themselves)',
  })
  remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.accounts.removeTeacher(actor, id);
  }

  @Post(':id/approve')
  @Roles('master')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a pending invitation (master only)' })
  approve(@Param('id') id: string) {
    return this.accounts.approve(id);
  }

  @Post(':id/reject')
  @Roles('master')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Refuse a pending invitation (master only)' })
  reject(@Param('id') id: string): Promise<void> {
    return this.accounts.reject(id);
  }
}
