import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AllowPendingPassword } from '../../shared/decorators/allow-pending-password.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { passwordSchema } from '../../shared/validation/fields';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { AuthService } from '../services/auth.service';

const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

type ChangePassword = z.infer<typeof changePasswordSchema>;

// Rotas da propria pessoa. Liberadas mesmo com troca de senha pendente.
@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@AllowPendingPassword()
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Profile of the logged-in user' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change the own password; old tokens stop working' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body({ schema: changePasswordSchema }) input: ChangePassword,
  ): Promise<void> {
    return this.authService.changePassword(user, input);
  }
}
