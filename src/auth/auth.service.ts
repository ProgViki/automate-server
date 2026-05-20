
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthPayload,
  ForgotPasswordDto,
  IAuthUser,
  LoginDto,
  ResetPasswordDto,
  SetPassDto,
  ChangePassDto,
} from './auth.types';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { bad, mustHave } from 'src/utils/error.util';
import { TokenService } from '../token/token.service';
import { addMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail/mail.service';


@Injectable()
export class AuthService {
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly token: TokenService,
    private readonly mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const { password } = dto;
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { auth: true },
    });
    mustHave(user, 'Invalid Credentials', 401);

    const passHash = user.auth?.passHash;
    if (!passHash) bad('Invalid Credentials', 401);

    if (!user.verified) bad('Verify your account', 401);
    if (!user.isActive) bad('Account is inactive', 401);

    const matched = await verify(passHash, password);
    if (!matched) bad('Invalid Credentials', 401);

    if (!user.roles) bad('No roles assigned', 401);

    const payload: AuthPayload = { sub: user.id, roles: user.roles };
    const token = await this.jwt.signAsync(payload);

    return { token };
  }

  async authUser(user: IAuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { applicant: true, staff: true },
    });
  }

  async setPass(dto: SetPassDto) {
    const { email, password, token } = dto;

    const verifyToken = await this.token.verifyCustomToken({ token });
    if (!verifyToken || verifyToken.email !== email) bad('Invalid Token');

    const user = await this.prisma.user.findUnique({
      where: { id: verifyToken.sub },
    });
    if (!user) bad('Invalid Token');

    if (user.hasPassword) bad('Password already set');

    await this.prisma.user.update({
      where: { id: verifyToken.sub },
      data: {
        hasPassword: true,
        verified: true,
        auth: { create: { passHash: await hash(password) } },
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    // Find user by email and include applicant and staff relations
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { applicant: true, staff: true }, // Include applicant and staff
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine the user's name
    // const name = user.applicant?.name || user.staff?.name || 'User';
    let firstName = 'User';
    let lastName = '';

    if (user.applicant) {
      firstName = user.applicant.firstName;
      lastName = user.applicant.lastName;
    } else if (user.staff) {
      const nameParts = user.staff.name.split(' '); // Split full name into parts
      firstName = nameParts[0]; // First part
      lastName = nameParts.slice(1).join(' '); // Remaining parts as last name
    }

    await this.prisma.token.deleteMany({
      where: { userId: user.id, subject: 'PASSWORD_RESET' },
    });

    // Generate reset token and expiry time
    const resetToken = uuidv4();
    const expiry = addMinutes(new Date(), 40);

    // Store reset token in the database
    await this.prisma.token.create({
      data: {
        subject: 'PASSWORD_RESET',
        token: resetToken,
        email: user.email,
        expiry,
        userId: user.id,
      },
    });

    // Send reset email
    await this.mail.sendPasswordReset({
      email: user.email,
      name: `${firstName} ${lastName}`.trim(),
      token: resetToken, // Only send token, resetLink is generated in sendPasswordReset()
    });

    return { message: 'Password reset link sent to your email' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const storedToken = await this.prisma.token.findUnique({
      where: { token, subject: 'PASSWORD_RESET' },
    });

    if (!storedToken || storedToken.expiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: { auth: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const hashedPassword = await hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { auth: { update: { passHash: hashedPassword } } },
    });

    await this.prisma.token.delete({ where: { id: storedToken.id } });

    return { message: 'Password reset successful!' };
  }

  async changePassword(dto: ChangePassDto, user: IAuthUser) {
    const { oldPassword, newPassword } = dto;

    const auth = await this.prisma.auth.findFirst({
      where: { userId: user.sub },
    });
    mustHave(auth, 'Wrong Old Password', 401);

    const matched = await verify(auth.passHash, oldPassword);
    if (!matched) bad('Wrong Old Password', 401);

    await this.prisma.auth.update({
      where: { userId: user.sub },
      data: { passHash: await hash(newPassword) },
    });
  }
}
