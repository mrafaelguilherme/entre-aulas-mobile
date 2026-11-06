import { IAuthenticatedRequest } from '../../shared/guards/auth.guard';
import { PostService } from '../services/post.service';
import { PostController } from './post.controller';

describe('PostController', () => {
  let controller: PostController;
  let postService: jest.Mocked<PostService>;

  beforeEach(() => {
    postService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<PostService>;
    controller = new PostController(postService);
  });

  it('should obtain the post author from the authenticated teacher', async () => {
    const input = {
      title: 'Introduction to Node.js',
      content: 'Educational content',
    };
    const request = {
      user: {
        sub: 'teacher-id',
        name: 'Professor Maria',
        email: 'maria@escola.com.br',
      },
    } as IAuthenticatedRequest;
    const createdPost = {
      id: 'post-id',
      ...input,
      author: request.user.name,
    };
    postService.create.mockResolvedValue(createdPost);

    await expect(controller.create(input, request)).resolves.toEqual(
      createdPost,
    );
    expect(postService.create).toHaveBeenCalledWith({
      ...input,
      author: 'Professor Maria',
    });
  });
});
