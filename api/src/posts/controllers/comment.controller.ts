import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import {
  Pagination,
  paginationSchema,
} from '../../shared/pagination/pagination';
import { AuthenticatedUser } from '../../users/models/user.interface';
import { CommentService } from '../services/comment.service';

const commentSchema = z.strictObject({
  content: z.string().trim().min(1).max(1000),
});

type CommentInput = z.infer<typeof commentSchema>;

@ApiTags('comments')
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Public()
  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'List the comments of a post, oldest first' })
  list(
    @Param('id') postId: string,
    @Query({ schema: paginationSchema }) query: Pagination,
  ) {
    return this.commentService.listByPost(postId, query.page, query.limit);
  }

  // Sem @Roles: qualquer pessoa logada comenta.
  @Post('posts/:id/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comment on a post (any logged-in user)' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') postId: string,
    @Body({ schema: commentSchema }) input: CommentInput,
  ) {
    return this.commentService.create(postId, input.content, actor);
  }

  @Delete('comments/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author, teacher or master)' })
  remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commentService.delete(id, actor);
  }
}
