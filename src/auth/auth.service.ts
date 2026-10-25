import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { AuthProvider, User } from '@prisma/client';

import { UserService } from '../user/user.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface SocialProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userService.findByPhone(dto.phone);

    if (existing) {
      throw new BadRequestException('Phone number already exists');
    }

    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.userService.create({
      phone: dto.phone,
      password,
      fullName: dto.fullName,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByPhone(dto.phone);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matched = await bcrypt.compare(dto.password, user.password);

    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async socialLogin(profile: SocialProfile) {
    const socialAccount = await this.userService.findBySocialAccount(
      profile.provider,
      profile.providerAccountId,
    );

    let user: User | null = null;

    if (socialAccount) {
      user = socialAccount.user;
    } else {
      if (profile.email) {
        user = await this.userService.findByEmail(profile.email);
      }

      if (!user) {
        user = await this.userService.create({
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
        });
      }

      await this.userService.createSocialAccount(
        user.id,
        profile.provider,
        profile.providerAccountId,
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    const needsOnboarding = !user.phone || !user.cityId;

    return {
      accessToken,
      needsOnboarding,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        cityId: user.cityId,
      },
    };
  }

  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }
}
