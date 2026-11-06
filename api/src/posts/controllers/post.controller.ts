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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import {
  AuthGuard,
  IAuthenticatedRequest,
} from '../../shared/guards/auth.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { PostService } from '../services/post.service';

const postFieldsSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

const createPostSchema = postFieldsSchema.extend({
  createdAt: z.coerce.date().optional(),
});

const updatePostSchema = postFieldsSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field must be provided',
  });

const searchPostSchema = z.object({
  term: z.string().trim().min(1),
});

type CreatePost = {
  title: string;
  content: string;
  createdAt?: Date;
};
type UpdatePost = Partial<Omit<CreatePost, 'createdAt'>>;
type SearchPost = { term: string };

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @ApiOperation({ summary: 'List all posts' })
  @ApiResponse({ status: 200, description: 'Posts returned successfully' })
  findAll() {
    return this.postService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts by title or content' })
  @ApiQuery({ name: 'term', example: 'node' })
  search(@Query(new ZodValidationPipe(searchPostSchema)) query: SearchPost) {
    return this.postService.search(query.term);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a post by ID' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  findById(@Param('id') id: string) {
    return this.postService.findById(id);
  }

  @HttpPost()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a post (teacher only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', example: 'Introduction to Node.js' },
        content: {
          type: 'string',
          example: 'Node.js is a JavaScript runtime...',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Optional publication date; defaults to now',
          example: '2026-03-02T12:00:00.000Z',
        },
      },
    },
  })
  create(
    @Body(new ZodValidationPipe(createPostSchema)) input: CreatePost,
    @Req() request: IAuthenticatedRequest,
  ) {
    return this.postService.create({
      ...input,
      author: request.user.name,
    });
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (teacher only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePostSchema)) input: UpdatePost,
  ) {
    return this.postService.update(id, input);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a post (teacher only)' })
  delete(@Param('id') id: string): Promise<void> {
    return this.postService.delete(id);
  }
}
