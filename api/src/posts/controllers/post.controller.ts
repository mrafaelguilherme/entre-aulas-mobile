import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post as HttpPost,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  Pagination,
  paginationSchema,
} from '../../shared/pagination/pagination';
import {
  AuthenticatedUser,
  TEACHER_ROLES,
} from '../../users/models/user.interface';
import { PostService } from '../services/post.service';

// strictObject: author, authorId, createdAt ou campo extra devolvem 400.
const postFieldsSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
});

const updatePostSchema = postFieldsSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be provided',
  });

const searchPostSchema = paginationSchema.extend({
  term: z.string().trim().min(1).max(100),
});

type PostFields = z.infer<typeof postFieldsSchema>;
type UpdatePost = z.infer<typeof updatePostSchema>;
type SearchPost = z.infer<typeof searchPostSchema>;

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List posts, newest first (paginated)' })
  @ApiResponse({ status: 200, description: 'Posts returned successfully' })
  list(@Query({ schema: paginationSchema }) query: Pagination) {
    return this.postService.list(query.page, query.limit);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search posts by title or content (paginated)' })
  search(@Query({ schema: searchPostSchema }) query: SearchPost) {
    return this.postService.search(query.term, query.page, query.limit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Read a post by ID' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @HttpPost()
  @Roles(...TEACHER_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post (teacher or master)' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body({ schema: postFieldsSchema }) input: PostFields,
  ) {
    return this.postService.create(input, actor);
  }

  @Put(':id')
  @Roles(...TEACHER_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (only its author)' })
  @ApiResponse({ status: 403, description: 'Not the author' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body({ schema: updatePostSchema }) input: UpdatePost,
  ) {
    return this.postService.update(id, input, actor);
  }

  @Delete(':id')
  @Roles(...TEACHER_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post (its author or the master)' })
  delete(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.postService.delete(id, actor);
  }
}
