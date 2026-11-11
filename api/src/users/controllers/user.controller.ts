import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  Pagination,
  paginationSchema,
} from '../../shared/pagination/pagination';
import { AuthenticatedUser } from '../models/user.interface';
import { AccountService } from '../services/account.service';
import { ResetPassword, resetPasswordSchema } from './account.schemas';

// Acoes sobre qualquer conta, so para o master.
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles('master')
export class UserController {
  constructor(private readonly accounts: AccountService) {}

  @Get('deleted')
  @ApiOperation({ summary: 'List soft-deleted accounts (master only)' })
  listDeleted(@Query({ schema: paginationSchema }) query: Pagination) {
    return this.accounts.list({ status: 'deleted' }, query.page, query.limit);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted account (master only)' })
  restore(@Param('id') id: string) {
    return this.accounts.restore(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a provisional password (master only)' })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body({ schema: resetPasswordSchema }) input: ResetPassword,
  ): Promise<void> {
    return this.accounts.resetPassword(actor, id, input.password);
  }
}
