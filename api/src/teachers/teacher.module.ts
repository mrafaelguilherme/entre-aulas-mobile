import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherMongooseRepository } from './repositories/mongoose/teacher.mongoose.repository';
import { TeacherRepository } from './repositories/teacher.repository';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { TeacherService } from './services/teacher.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Teacher.name, schema: TeacherSchema }]),
  ],
  controllers: [TeacherController],
  providers: [
    {
      provide: TeacherRepository,
      useClass: TeacherMongooseRepository,
    },
    TeacherService,
  ],
})
export class TeacherModule {}
