import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma/prisma.service';
import { OtpModule } from '../otp/otp.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [OtpModule, TokenModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
})
export class UserModule {}
