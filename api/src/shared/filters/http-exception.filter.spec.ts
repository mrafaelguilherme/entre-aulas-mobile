import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(url = '/teachers') {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url, method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  return { response, host };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  afterEach(() => jest.restoreAllMocks());

  it('keeps the HttpException shape: statusCode, timestamp, path and message', () => {
    const { response, host } = createHost('/posts/123');

    filter.catch(new NotFoundException('Post not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      timestamp: expect.any(String),
      path: '/posts/123',
      message: 'Post not found',
      error: 'Not Found',
    });
  });

  it('maps Mongo code 11000 to 409 with the message "Email is unavailable"', () => {
    const { response, host } = createHost();
    const duplicate = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
    });

    filter.catch(duplicate, host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Email is unavailable',
      }),
    );
  });

  it('logs unexpected errors with Logger and answers a generic 500', () => {
    const { response, host } = createHost();
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('database exploded'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain(
      'database exploded',
    );
    expect(errorLog).toHaveBeenCalledWith(
      'Unexpected error on POST /teachers',
      expect.stringContaining('database exploded'),
    );
  });
});
