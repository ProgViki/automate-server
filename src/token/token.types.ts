import { IsDate, IsEmail, IsString } from 'class-validator';

export const TOKEN_SUBJECT = {
  SET_PASSWORD: 'Set Account Password',
};

export class CreateCustomTokenDto {
  @IsEmail()
  email: string;

  @IsString()
  userId: string;

  @IsDate()
  expiry: Date;

  @IsString()
  subject: string;
}

export class VerifyCustomTokenDto {
  @IsString()
  token: string;
}
