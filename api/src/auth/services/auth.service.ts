import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../shared/security/password.service';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { UserRepository } from '../../users/repositories/user.repository';

export type SigninInput = { email: string; password: string };
export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async signin(input: SigninInput): Promise<{ token: string }> {
    const user = await this.users.findForLogin(input.email);

    if (!user) {
      // Gasta o mesmo tempo de um hash real, para nao revelar se o e-mail existe.
      await this.passwords.verifyDummy(input.password);
      this.logger.warn('Failed login: unknown or inactive account');
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwords.verify(
      user.password,
      input.password,
    );

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.logger.warn(`Failed login: account ${user.id} is locked`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!passwordMatches) {
      await this.users.registerLoginFailure(user.id);
      this.logger.warn(`Failed login: wrong password for account ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.users.resetLoginFailures(user.id);
    const token = await this.jwtService.signAsync({
      sub: user.id,
      ver: user.tokenVersion,
    });

    return { token };
  }

  // Subir a versao invalida todos os tokens da conta, em todos os aparelhos.
  signout(user: AuthenticatedUser): Promise<void> {
    return this.users.incrementTokenVersion(user.id);
  }

  async changePassword(
    user: AuthenticatedUser,
    input: ChangePasswordInput,
  ): Promise<void> {
    const stored = await this.users.findWithPassword(user.id);
    const matches = stored
      ? await this.passwords.verify(stored.password, input.currentPassword)
      : false;

    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hash = await this.passwords.hash(input.newPassword);
    await this.users.setPassword(user.id, hash, false);
  }
}
