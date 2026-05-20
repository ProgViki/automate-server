import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePassDto,
  IAuthUser,
  LoginDto,
  SetPassDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.types';
import { Auth, AuthUser } from './decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Auth()
  @Get('user')
  async getAuthUser(@AuthUser() user: IAuthUser) {
    return this.auth.authUser(user);
  }

  @Post('set-pass')
  async setPass(@Body() dto: SetPassDto) {
    return await this.auth.setPass(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.auth.forgotPassword(input);
  }

  @Post('reset-password')
  async resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input);
  }

  @Auth()
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePassDto,
    @AuthUser() user: IAuthUser,
  ) {
    return await this.auth.changePassword(dto, user);
  }
}
