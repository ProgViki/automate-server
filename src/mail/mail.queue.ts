import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MailJobType, QUEUES } from 'src/config/queue.constants';
import { InfoDto } from './mail.types';

export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(@InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue) {}

  async queueTestMail() {
    const job = await this.mailQueue.add(MailJobType.TEST, {});
    this.logger.log(`Test mail Job ${job.id} queued.`);
    return job;
  }

  async queueInfoMail(dto: InfoDto) {
    const job = await this.mailQueue.add(MailJobType.INFO, dto);
    this.logger.log(`Info mail Job ${job.id} queued.`);
    return job;
  }
}
