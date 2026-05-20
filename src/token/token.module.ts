import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRY },
    }),
  ],
  providers: [TokenService, PrismaService],
  exports: [TokenService],
})
export class TokenModule {}
