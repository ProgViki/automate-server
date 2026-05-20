import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(body: any) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }
      const existingPhone = await this.prisma.user.findUnique({
      where: {
        phoneNumber: body.phoneNumber,
      },
    });

    if (existingPhone) {
      throw new ConflictException(
        'Phone number already exists',
      );
    }

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phoneNumber: body.phoneNumber,
        gender: body.gender,
        password: hashed,
        role: 'ADMIN',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        gender: true,
         role: true,
        createdAt: true,
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Registration successful',
      access_token: token,
      user,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        role: user.role,
      },
    };
  }
}