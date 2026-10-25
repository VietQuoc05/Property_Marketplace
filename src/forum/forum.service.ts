import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NeedType, NeedSaleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';

interface FindAllForumPostsQuery {
  cityId?: string;
  districtId?: string;
  wardId?: string;
  needType?: NeedType;
  needSaleType?: NeedSaleType;
}

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateForumPostDto) {
    return this.prisma.forumPost.create({
      data: {
        title: dto.title.trim(),
        detail: dto.detail.trim(),
        userId,
        needType: dto.needType || null,
        needSaleType: dto.needSaleType || null,
        cityId: dto.cityId || null,
        districtId: dto.districtId || null,
        wardId: dto.wardId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
        city: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(query?: FindAllForumPostsQuery) {
    const where: any = {};
    if (query?.cityId) where.cityId = query.cityId;
    if (query?.districtId) where.districtId = query.districtId;
    if (query?.wardId) where.wardId = query.wardId;
    if (query?.needType) where.needType = query.needType;
    if (query?.needSaleType) where.needSaleType = query.needSaleType;

    return this.prisma.forumPost.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
        city: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phone: true,
          },
        },
        city: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }

    return post;
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài đăng này');
    }

    await this.prisma.forumPost.delete({
      where: { id },
    });

    return { success: true, message: 'Đã xóa bài đăng thành công' };
  }
}
