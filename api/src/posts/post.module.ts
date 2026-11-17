import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentController } from './controllers/comment.controller';
import { PostController } from './controllers/post.controller';
import { CommentRepository } from './repositories/comment.repository';
import { CommentMongooseRepository } from './repositories/mongoose/comment.mongoose.repository';
import { PostMongooseRepository } from './repositories/mongoose/post.mongoose.repository';
import { PostRepository } from './repositories/post.repository';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Post, PostSchema } from './schemas/post.schema';
import { CommentService } from './services/comment.service';
import { PostService } from './services/post.service';

// Comentarios moram no modulo de posts: so existem dentro de um post.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  controllers: [PostController, CommentController],
  providers: [
    { provide: PostRepository, useClass: PostMongooseRepository },
    { provide: CommentRepository, useClass: CommentMongooseRepository },
    PostService,
    CommentService,
  ],
})
export class PostModule {}
