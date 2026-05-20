import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { ToLowerCase } from 'src/utils/transform.utils';
// import * as handlebars from 'handlebars';
// import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

// function registerHelpers() {
//   handlebars.registerHelper('isEven', (n: number) => n % 2 === 0);
// }

// export class CustomHandlebarsAdapter extends HandlebarsAdapter {
//   constructor() {
//     super();
//     registerHelpers();
//   }
// }

export const MAIL_SUBJECT = {
  SET_PASSWORD: 'Set Account Password',
  ACCOUNT_VERIFICATION: 'Account Verification',
  PASSWORD_RESET: 'Password Reset',
};

export class ApplicantOtpMailDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @Length(6)
  otp: string;

  @IsString()
  token: string;
}

export class StaffPasswordResetDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  password: string;
}

export class ForgotPasswordResetDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  token: string;
}

class InfoDetails {
  @IsString()
  label: string;

  @ValidateIf((o) => typeof o.value === 'string')
  @IsString()
  @ValidateIf((o) => typeof o.value === 'number')
  @IsNumber()
  value: string | number;
}

class InfoAction {
  @IsString()
  button: string;

  @IsString()
  link: string;

  @IsString()
  instruction: string;
}

export class InfoDto {
  @ToLowerCase()
  @IsEmail()
  to: string;

  @IsArray()
  @IsOptional()
  @ToLowerCase()
  cc?: string[];

  @IsString()
  subject: string;

  @IsString()
  name: string;

  @IsString()
  message: string;

  @IsArray()
  details: InfoDetails[];

  action: InfoAction;
}
