import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isAfter } from 'date-fns';
import { bad } from 'src/utils/error.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomTokenDto, VerifyCustomTokenDto } from './token.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(TokenService.name);

  private async generateToken(payload: any) {
    return await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
    });
  }

  private async verifyToken(token: string) {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      bad('Unable To Verify Token');
    }
  }

  async createCustomToken(dto: CreateCustomTokenDto) {
    const { email, expiry, subject, userId } = dto;

    const token = await this.generateToken({
      isCustom: true,
      email: email,
      sub: userId,
    });

    await this.prisma.token.create({
      data: {
        email,
        expiry,
        subject,
        token,
        userId,
      },
    });

    return token;
  }

  async verifyCustomToken(dto: VerifyCustomTokenDto) {
    const { token } = dto;

    const userToken = await this.prisma.token.findUnique({ where: { token } });

    if (!userToken) return false;

    const isExpired = isAfter(new Date(), userToken.expiry);

    if (isExpired) {
      await this.delete(userToken.id);
      return false;
    }

    await this.delete(userToken.id);

    return await this.verifyToken(token);
  }

  private async delete(id: string) {
    await this.prisma.token.delete({
      where: { id },
    });
  }

  // Delete all expired OTPs every 24hrs
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredOtps() {
    this.logger.verbose('Deleting expired Tokens');
    const tokens = await this.prisma.token.findMany();

    for (const token of tokens) {
      if (isAfter(new Date(), token.expiry)) {
        await this.delete(token.id);
      }
    }
  }
}
