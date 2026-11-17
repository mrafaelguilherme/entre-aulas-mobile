import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { AuthService } from './services/auth.service';
import { MasterBootstrapService } from './services/master-bootstrap.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, MasterBootstrapService],
})
export class AuthModule {}
