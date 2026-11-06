import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostController } from './controllers/post.controller';
import { PostMongooseRepository } from './repositories/mongoose/post.mongoose.repository';
import { PostRepository } from './repositories/post.repository';
import { Post, PostSchema } from './schemas/post.schema';
import { PostService } from './services/post.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
  ],
  controllers: [PostController],
  providers: [
    {
      provide: PostRepository,
      useClass: PostMongooseRepository,
    },
    PostService,
  ],
})
export class PostModule {}
