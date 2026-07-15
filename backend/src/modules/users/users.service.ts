import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      },
    });
  }

  updateProfile(
    userId: string,
    input: {
      displayName?: string;
      locale?: string;
      timezone?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName,
        locale: input.locale,
        timezone: input.timezone,
      },
    });
  }
}
