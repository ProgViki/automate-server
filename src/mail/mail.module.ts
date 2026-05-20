import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/config/queue.constants';
import { MailQueueService } from './mail.queue';
import { MailProcessor } from './mail.processor';
import { CustomHandlebarsAdapter } from './handlebars.adapter';

@Global()
@Module({
  providers: [MailService, MailQueueService, MailProcessor],
  exports: [MailService, MailQueueService],
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: +process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      },
      defaults: {
        from: process.env.EMAIL_USER,
      },
      template: {
        dir: join(__dirname, './templates'),
        adapter: new CustomHandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    BullModule.registerQueue({ name: QUEUES.MAIL }),
  ],
})
export class MailModule {}
