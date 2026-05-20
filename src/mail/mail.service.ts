import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import * as handlebars from 'handlebars';
import { join } from 'path';
import * as fs from 'fs';
import {
  ApplicantOtpMailDto,
  ForgotPasswordResetDto,
  InfoDto,
  MAIL_SUBJECT,
  StaffPasswordResetDto,
} from './mail.types';

@Injectable()
export class MailService {
  constructor(private readonly mailer: MailerService) {}

  // Helper: Compile Handlebars template
  private async compileTemplate(
    templateName: string,
    context: any,
  ): Promise<string> {
    const templatePath = join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template(context);
  }

  async sendTestMail() {
    // const html = await this.compileTemplate('action', {
    //   name: 'Kehinde Ayeola',
    //   message: 'Test Mail',
    //   details: [
    //     { label: 'Name', value: 'Kehinde Ayeola' },
    //     { label: 'Email', value: 'kehinde@zoracom.com' },
    //     { label: 'Phone', value: '+2348123456789' },
    //   ],
    //   action: {
    //     button: 'Action',
    //     link: 'https://itisems.nemsa.gov.ng',
    //     instruction: 'Click here to proceed',
    //   },
    // });
    await this.mailer.sendMail({
      to: 'ayeolakenny@gmail.com',
      subject: 'Test Mail',
      template: 'payment',
    });
  }

  async sendInfoMail(dto: InfoDto) {
    const { to, cc, subject, ...context } = dto;
    const html = await this.compileTemplate('action', context);
    await this.mailer.sendMail({
      to,
      html,
      subject,
    });
  }

  async sendApplicantOtpMail(dto: ApplicantOtpMailDto) {
    const { email, name, otp, token } = dto;
    const otpLink = `${process.env.CLIENT_URL}/otp?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}`;
    await this.mailer.sendMail({
      to: email,
      subject: MAIL_SUBJECT.ACCOUNT_VERIFICATION,
      template: 'otp-verification',
      context: { name, otp, otpLink },
    });
  }

  async sendSetStaffPassword(dto: StaffPasswordResetDto) {
    const { email, name, password } = dto;
    await this.mailer.sendMail({
      to: email,
      subject: MAIL_SUBJECT.SET_PASSWORD,
      template: 'set-staff-password',
      context: { email, name, password },
    });
  }

  async sendPasswordReset(dto: ForgotPasswordResetDto) {
    const { email, name, token } = dto;
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await this.mailer.sendMail({
      to: email,
      subject: MAIL_SUBJECT.PASSWORD_RESET,
      template: 'password-reset',
      context: { name, resetLink },
    });
  }
}
