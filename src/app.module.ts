import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { AuthController } from './auth/auth.controller';
import { UserController } from './user/user.controller';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ReportsModule } from './reports/reports.module';
import { MonitorService } from './monitor/monitor.service';
import { MonitorController } from './monitor/monitor.controller';
import { MonitorModule } from './monitor/monitor.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { TokenService } from './token/token.service';
import { TokenModule } from './token/token.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [AuthModule, UserModule, ReportsModule, MonitorModule, MailModule, PrismaModule, TokenModule, UploadsModule],
  controllers: [AppController, AuthController, UserController, MonitorController],
  providers: [AppService, AuthService, UserService, MonitorService, TokenService],
})
export class AppModule {}
