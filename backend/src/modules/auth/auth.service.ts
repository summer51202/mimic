import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';

interface TokenUser {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  timezone: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }) {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.usersService.createUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      locale: user.locale,
      timezone: user.timezone,
    });
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      locale: user.locale,
      timezone: user.timezone,
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refreshToken,
        {
          secret:
            process.env.JWT_REFRESH_SECRET ?? 'mimic-local-refresh-secret',
        },
      );
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
      }

      return this.buildAuthResponse({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        locale: user.locale,
        timezone: user.timezone,
      });
    } catch {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }
  }

  buildAuthResponse(user: TokenUser) {
    return {
      user: this.mapUser(user),
      access_token: this.signAccessToken(user),
      refresh_token: this.signRefreshToken(user),
    };
  }

  mapUser(user: TokenUser) {
    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      locale: user.locale,
      timezone: user.timezone,
    };
  }

  private signAccessToken(user: TokenUser) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'mimic-local-access-secret',
        expiresIn: '15m',
      },
    );
  }

  private signRefreshToken(user: TokenUser) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret:
          process.env.JWT_REFRESH_SECRET ?? 'mimic-local-refresh-secret',
        expiresIn: '30d',
      },
    );
  }
}
