import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ListingInterest } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ListingInterestResponseDto } from './dto/response.dto';
import { InterestedUserResponseDto } from './dto/response.dto';
import { ListingInterestOnMyListingResponseDto } from './dto/response.dto';

const listingInterestInclude =
  Prisma.validator<Prisma.ListingInterestInclude>()({
    listing: {
      select: {
        id: true,
        title: true,
      },
    },
  });

const listingInterestUserInclude =
  Prisma.validator<Prisma.ListingInterestInclude>()({
    user: {
      select: {
        id: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
      },
    },
  });

@Injectable()
export class ListingInterestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async addInterest(
    listingId: string,
    userId: string,
  ): Promise<ListingInterest> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        createdById: true,
        title: true,
        images: {
          select: { imageUrl: true },
          take: 1,
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdById === userId) {
      throw new BadRequestException(
        'You cannot show interest in your own listing',
      );
    }

    try {
      const interest = await this.prisma.listingInterest.create({
        data: {
          listingId,
          userId,
        },
      });

      const updatedListing = await this.prisma.listing.update({
        where: { id: listingId },
        data: { interestScore: { increment: 1 } },
        select: { interestScore: true },
      });

      const interestedUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, phone: true, avatarUrl: true },
      });

      const firstImage = listing.images?.[0]?.imageUrl || null;

      const notification = await this.prisma.notification.create({
        data: {
          userId: listing.createdById,
          type: 'LISTING_INTEREST',
          title: 'Người dùng quan tâm tin đăng',
          content: `${interestedUser?.fullName || 'Người dùng'} quan tâm đến tin đăng của bạn.`,
          data: {
            listingId: listing.id,
            listingTitle: listing.title,
            listingImage: firstImage,
            interestedUserId: userId,
            interestedUserName: interestedUser?.fullName,
            interestedUserAvatar: interestedUser?.avatarUrl,
          },
        },
      });

      const unreadCount = await this.prisma.notification.count({
        where: { userId: listing.createdById, isRead: false },
      });

      this.realtimeService.emitNewNotification(
        listing.createdById,
        notification,
        unreadCount,
      );

      this.realtimeService.emitInterestUpdated(listing.createdById, {
        listingId,
        interestScore: updatedListing.interestScore,
        action: 'ADD',
        user: {
          id: interestedUser?.id || userId,
          fullName: interestedUser?.fullName || 'Người dùng Homers',
          phone: interestedUser?.phone || null,
          avatarUrl: interestedUser?.avatarUrl || null,
          createdAt: interest.createdAt.toISOString(),
        },
      });

      return interest;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'You have already shown interest in this listing',
          );
        }
      }
      throw error;
    }
  }

  async removeInterest(listingId: string, userId: string): Promise<void> {
    const interest = await this.prisma.listingInterest.findUnique({
      where: {
        listingId_userId: {
          listingId,
          userId,
        },
      },
    });

    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    await this.prisma.listingInterest.delete({
      where: {
        listingId_userId: {
          listingId,
          userId,
        },
      },
    });

    const updatedListing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { interestScore: { decrement: 1 } },
      select: { interestScore: true },
    });

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { createdById: true },
    });

    if (listing) {
      this.realtimeService.emitInterestUpdated(listing.createdById, {
        listingId,
        interestScore: updatedListing.interestScore,
        action: 'REMOVE',
        user: { id: userId },
      });
    }
  }

  async findMyInterestedListings(
    userId: string,
  ): Promise<any[]> {
    const interests = await this.prisma.listingInterest.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            city: true,
            district: true,
            ward: true,
            images: { orderBy: { createdAt: 'asc' } },
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map((interest) => interest.listing);
  }

  async findListingInterests(
    listingId: string,
    requesterId: string,
  ): Promise<InterestedUserResponseDto[]> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, createdById: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdById !== requesterId) {
      throw new ForbiddenException('You are not the owner of this listing');
    }

    const interests = await this.prisma.listingInterest.findMany({
      where: { listingId },
      include: listingInterestUserInclude,
      orderBy: { createdAt: 'desc' },
    });

    return interests.map((interest) => ({
      id: interest.user.id,
      fullName: interest.user.fullName,
      phone: interest.user.phone,
      avatarUrl: interest.user.avatarUrl,
      createdAt: interest.createdAt.toISOString(),
    }));
  }

  async findAllInterestsOnMyListings(
    userId: string,
  ): Promise<ListingInterestOnMyListingResponseDto[]> {
    const listings = await this.prisma.listing.findMany({
      where: { createdById: userId },
      select: { id: true },
    });

    const listingIds = listings.map((listing) => listing.id);

    if (listingIds.length === 0) {
      return [];
    }

    const interests = await this.prisma.listingInterest.findMany({
      where: { listingId: { in: listingIds } },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map((interest) => ({
      id: interest.id,
      listingId: interest.listing.id,
      listingTitle: interest.listing.title,
      userId: interest.user.id,
      fullName: interest.user.fullName,
      phone: interest.user.phone,
      createdAt: interest.createdAt.toISOString(),
    }));
  }
}
