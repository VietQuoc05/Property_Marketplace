import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthProvider, ListingStatus, Prisma, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      omit: {
        password: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },

      omit: {
        password: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        phone,
      },
    });
  }

  async findBySocialAccount(provider: AuthProvider, providerAccountId: string) {
    return this.prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async createSocialAccount(
    userId: string,
    provider: AuthProvider,
    providerAccountId: string,
  ) {
    return this.prisma.socialAccount.create({
      data: {
        userId,
        provider,
        providerAccountId,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const data: Record<string, unknown> = {};

    if (updateUserDto.bio !== undefined) {
      data.bio = updateUserDto.bio;
    }

    if (updateUserDto.avatarUrl !== undefined) {
      data.avatarUrl = updateUserDto.avatarUrl;
    }

    if (updateUserDto.cityId !== undefined) {
      data.cityId = updateUserDto.cityId;
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      omit: {
        password: true,
      },
    });
  }

  async setPhone(id: string, phone: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.phone) {
      throw new BadRequestException(
        'Phone number is already set and cannot be changed',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new BadRequestException(
        'This phone number is already in use',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: { phone },
      omit: {
        password: true,
      },
    });
  }

  async getUserListings(userId: string, status?: ListingStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: Prisma.ListingWhereInput = {
      createdById: userId,
    };

    if (status) {
      where.status = status;
    } else {
      where.status = ListingStatus.PUBLISHED;
    }

    return this.prisma.listing.findMany({
      where,
      include: {
        city: true,
        district: true,
        ward: true,
        images: { orderBy: { createdAt: 'asc' } },
        moderation: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
