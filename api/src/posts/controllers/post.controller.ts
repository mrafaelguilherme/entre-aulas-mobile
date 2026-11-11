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
  AuthenticatedUser,
  TEACHER_ROLES,
} from '../../users/models/user.interface';
import { PostService } from '../services/post.service';

const postFieldsSchema = z.strictObject({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

const updatePostSchema = postFieldsSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be provided',
  });

const searchPostSchema = z.strictObject({
  term: z.string().trim().min(1),
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
  @ApiOperation({ summary: 'List all posts' })
  @ApiResponse({ status: 200, description: 'Posts returned successfully' })
  findAll() {
    return this.postService.findAll();
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search posts by title or content' })
  search(@Query({ schema: searchPostSchema }) query: SearchPost) {
    return this.postService.search(query.term);
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
    return this.postService.create({ ...input, author: actor.name });
  }

  @Put(':id')
  @Roles(...TEACHER_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (teacher or master)' })
  update(
    @Param('id') id: string,
    @Body({ schema: updatePostSchema }) input: UpdatePost,
  ) {
    return this.postService.update(id, input);
  }

  @Delete(':id')
  @Roles(...TEACHER_ROLES)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a post (teacher or master)' })
  delete(@Param('id') id: string): Promise<void> {
    return this.postService.delete(id);
  }
}
