import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({ title: z.string().trim().min(1) }),
  );

  it('should return validated data', () => {
    expect(pipe.transform({ title: '  Class  ' })).toEqual({ title: 'Class' });
  });

  it('should throw for invalid data', () => {
    expect(() => pipe.transform({ title: '' })).toThrow(BadRequestException);
  });
});
