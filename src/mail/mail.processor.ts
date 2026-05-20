import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { Job } from 'bullmq';
import { MailJobType, QUEUES } from 'src/config/queue.constants';
import { InfoDto } from './mail.types';

@Processor(QUEUES.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job) {
    this.logger.verbose(`Processing job ${job.id}`);

    try {
      switch (job.name) {
        case MailJobType.TEST:
          return await this.sendTestMail();
        case MailJobType.INFO:
          return await this.sendInfoMail(job.data);
        default:
          throw new Error(`Unknown job type ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}`, error);
      throw error;
    }
  }

  private async sendTestMail() {
    this.logger.log('Sending test mail');
    await this.mail.sendTestMail();
    return { success: true };
  }

  private async sendInfoMail(dto: InfoDto) {
    this.logger.log('Sending info mail');
    await this.mail.sendInfoMail(dto);
    return { success: true };
  }
}
