import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRequiredJwtSecret } from './jwt-secrets';

export interface RequestUser {
  userId: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: RequestUser }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    const token = authorization.slice('Bearer '.length);
    const accessSecret = getRequiredJwtSecret('JWT_ACCESS_SECRET');

    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        token,
        {
          secret: accessSecret,
        },
      );
      request.user = {
        userId: payload.sub,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}
