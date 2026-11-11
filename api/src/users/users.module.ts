import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordService } from '../shared/security/password.service';
import { UserMongooseRepository } from './repositories/mongoose/user.mongoose.repository';
import { UserRepository } from './repositories/user.repository';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    { provide: UserRepository, useClass: UserMongooseRepository },
    PasswordService,
  ],
  exports: [UserRepository, PasswordService],
})
export class UsersModule {}
