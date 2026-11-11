import { ArgumentMetadata, NotFoundException } from '@nestjs/common';
import { ObjectIdParamPipe } from './object-id-param.pipe';

const param = (data: string): ArgumentMetadata => ({ type: 'param', data });

describe('ObjectIdParamPipe', () => {
  const pipe = new ObjectIdParamPipe();

  it('passes a valid ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';

    expect(pipe.transform(id, param('id'))).toBe(id);
  });

  it('answers 404 for an id out of format', () => {
    expect(() => pipe.transform('nao-e-um-id', param('id'))).toThrow(
      NotFoundException,
    );
  });

  it('ignores other params and the body', () => {
    expect(pipe.transform('livre', param('term'))).toBe('livre');
    expect(pipe.transform('livre', { type: 'body' })).toBe('livre');
  });
});
