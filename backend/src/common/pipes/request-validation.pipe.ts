import { ArgumentMetadata, BadRequestException, PipeTransform, ValidationPipe } from '@nestjs/common';

export class RequestValidationPipe implements PipeTransform {
  private readonly legacy = new ValidationPipe({ whitelist: true, transform: true });
  private readonly strict = new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
    exceptionFactory: () => new BadRequestException('SPACE_INPUT_INVALID'),
  });

  transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    const type = metadata.metatype;
    const strict = type !== undefined && 'strictSpaceRequest' in type && type.strictSpaceRequest === true;
    return (strict ? this.strict : this.legacy).transform(value, metadata);
  }
}
