import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordService } from '../shared/security/password.service';
import { TeacherController } from './controllers/teacher.controller';
import { UserMongooseRepository } from './repositories/mongoose/user.mongoose.repository';
import { UserRepository } from './repositories/user.repository';
import { User, UserSchema } from './schemas/user.schema';
import { AccountService } from './services/account.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [TeacherController],
  providers: [
    { provide: UserRepository, useClass: UserMongooseRepository },
    PasswordService,
    AccountService,
  ],
  exports: [UserRepository, PasswordService],
})
export class UsersModule {}
