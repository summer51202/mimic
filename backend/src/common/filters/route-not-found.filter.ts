import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(NotFoundException)
export class RouteNotFoundFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = exception.getResponse();
    if (typeof body === 'object' && body !== null && 'message' in body &&
        typeof body.message === 'string' && body.message.startsWith('Cannot ')) {
      response.status(404).json({ message: 'RESOURCE_NOT_FOUND', statusCode: 404 });
      return;
    }
    response.status(404).json(typeof body === 'string' ? { message: body, statusCode: 404 } : body);
  }
}
