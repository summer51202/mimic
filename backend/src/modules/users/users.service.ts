import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as mimicId from './mimic-id';

const MAX_MIMIC_ID_ATTEMPTS = 5;

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

  async createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }) {
    for (let attempt = 0; attempt < MAX_MIMIC_ID_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.user.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
            mimicId: mimicId.generateMimicId(),
          },
        });
      } catch (error) {
        if (
          !isMimicIdUniqueConflict(error) ||
          attempt === MAX_MIMIC_ID_ATTEMPTS - 1
        ) {
          throw error;
        }
      }
    }

    throw new Error('Mimic ID generation attempts exhausted.');
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

function isMimicIdUniqueConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.some((field) => field === 'mimic_id' || field === 'mimicId');
  }

  return target === 'mimic_id' || target === 'mimicId';
}
