import {
  ArgumentMetadata,
  Injectable,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

// Confere todo parametro de rota chamado "id" antes de chegar ao banco.
// Um id fora do formato nunca existiria, entao a resposta e 404.
@Injectable()
export class ObjectIdParamPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (
      metadata.type === 'param' &&
      metadata.data === 'id' &&
      !OBJECT_ID.test(value)
    ) {
      throw new NotFoundException('Resource not found');
    }

    return value;
  }
}
