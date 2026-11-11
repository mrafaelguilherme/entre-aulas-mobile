import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { AllowPendingPassword } from '../../shared/decorators/allow-pending-password.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { emailSchema } from '../../shared/validation/fields';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { AuthService } from '../services/auth.service';

// No login a senha nao passa pela regra de tamanho: qualquer erro vira 401.
const signinSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

type Signin = z.infer<typeof signinSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and receive a JWT' })
  @ApiResponse({ status: 200, description: 'Token issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  signin(@Body({ schema: signinSchema }) input: Signin) {
    return this.authService.signin(input);
  }

  @Post('signout')
  @AllowPendingPassword()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sign out: every token of the account stops working',
  })
  signout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.authService.signout(user);
  }
}
