import { IsEmail, IsString, MinLength } from 'class-validator';
import { ToLowerCase } from 'src/utils/transform.utils';

export class LoginDto {
  @IsEmail()
  @ToLowerCase()
  email: string;

  @IsString()
  password: string;
}

export type AuthPayload = {
  sub: string;
  roles: string[];
  otpId?: string;
  isOtp?: boolean;
};

export type IAuthUser = AuthPayload;

export class SetPassDto {
  @IsString()
  token: string;

  @IsEmail()
  @ToLowerCase()
  email: string;

  @IsString()
  password: string;
}

export class ChangePassDto {
  @IsString()
  oldPassword: string;

  @IsString()
  newPassword: string;
}
export class ForgotPasswordDto {
  @IsEmail()
  @ToLowerCase()
  readonly email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6, {
    message: 'Password is too short. Minimum 6 characters required.',
  })
  newPassword: string;

  @IsString()
  confirmPassword: string;
}
