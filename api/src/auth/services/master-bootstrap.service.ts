import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '../../shared/security/password.service';
import { UserRepository } from '../../users/repositories/user.repository';

// Cria o master na primeira subida da API, a partir do .env.
// Como o cadastro de professor e fechado, alguem precisa existir primeiro.
@Injectable()
export class MasterBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasterBootstrapService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (await this.users.masterExists()) {
      return;
    }

    await this.users.create({
      name: 'Master',
      email: this.config.getOrThrow<string>('MASTER_EMAIL'),
      password: await this.passwords.hash(
        this.config.getOrThrow<string>('MASTER_PASSWORD'),
      ),
      role: 'master',
      status: 'active',
      mustChangePassword: false,
      invitedBy: null,
    });
    this.logger.log('Master account created from MASTER_EMAIL');
  }
}
