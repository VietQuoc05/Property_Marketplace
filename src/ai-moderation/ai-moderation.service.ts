import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationService } from '../notification/notification.service';
import { MODERATION_QUEUE, MODERATE_LISTING_JOB } from './ai-moderation.constants';
import { ModerateListingJobData } from './ai-moderation.interface';
import { ListingStatus, NotificationType } from '@prisma/client';

@Injectable()
export class AiModerationService {
  private readonly logger = new Logger(AiModerationService.name);

  constructor(
    @InjectQueue(MODERATION_QUEUE)
    private readonly moderationQueue: Queue<ModerateListingJobData>,
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Adds a listing to the moderation queue
   */
  async enqueueModeration(listingId: string) {
    this.logger.log(`Enqueueing moderation job for listing: ${listingId}`);
    return this.moderationQueue.add(
      MODERATE_LISTING_JOB,
      { listingId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  /**
   * Retrieves the moderation status and history of a listing
   */
  async getModerationResult(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        status: true,
        title: true,
        moderation: true,
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found`);
    }

    return {
      listingId: listing.id,
      status: listing.status,
      title: listing.title,
      moderation: listing.moderation,
    };
  }

  /**
   * Manually approve a listing (e.g. by Admin or review)
   */
  async manualApprove(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        city: true,
        district: true,
        ward: true,
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.PUBLISHED },
    });

    await this.prisma.listingModeration.upsert({
      where: { listingId },
      create: {
        listingId,
        decision: 'APPROVE',
        confidence: 1.0,
        intent: 'RENT',
        titleDescriptionMatch: true,
        imagesMatch: true,
        communityViolation: false,
        reasons: ['Duyệt thủ công bởi Quản trị viên'],
        reviewedAt: new Date(),
      },
      update: {
        decision: 'APPROVE',
        confidence: 1.0,
        reasons: ['Duyệt thủ công bởi Quản trị viên'],
        reviewedAt: new Date(),
      },
    });

    this.realtimeService.emitNewListing({
      ...listing,
      status: ListingStatus.PUBLISHED,
    });

    await this.notificationService.createNotification({
      userId: listing.createdById,
      type: NotificationType.LISTING_APPROVED,
      title: 'Tin đăng của bạn đã được duyệt thủ công! 🎉',
      content: `Tin đăng "${listing.title}" đã được ban quản trị Homers duyệt và hiển thị công khai.`,
      data: { listingId: listing.id, status: ListingStatus.PUBLISHED },
    });

    this.realtimeService.emitListingModerated(listing.createdById, {
      listingId: listing.id,
      status: ListingStatus.PUBLISHED,
      decision: 'APPROVE',
      reasons: [],
    });

    return updated;
  }

  /**
   * Manually reject a listing (e.g. by Admin)
   */
  async manualReject(listingId: string, reasons: string[] = []) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${listingId} not found`);
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REJECTED },
    });

    await this.prisma.listingModeration.upsert({
      where: { listingId },
      create: {
        listingId,
        decision: 'REJECT',
        confidence: 1.0,
        intent: 'UNKNOWN',
        titleDescriptionMatch: false,
        imagesMatch: false,
        communityViolation: false,
        reasons: reasons.length > 0 ? reasons : ['Từ chối thủ công bởi Quản trị viên'],
        reviewedAt: new Date(),
      },
      update: {
        decision: 'REJECT',
        confidence: 1.0,
        reasons: reasons.length > 0 ? reasons : ['Từ chối thủ công bởi Quản trị viên'],
        reviewedAt: new Date(),
      },
    });

    await this.notificationService.createNotification({
      userId: listing.createdById,
      type: NotificationType.LISTING_REJECTED,
      title: 'Tin đăng của bạn bị từ chối ⚠️',
      content: `Tin đăng "${listing.title}" đã bị từ chối: ${reasons.join('; ')}`,
      data: { listingId: listing.id, status: ListingStatus.REJECTED, reasons },
    });

    this.realtimeService.emitListingModerated(listing.createdById, {
      listingId: listing.id,
      status: ListingStatus.REJECTED,
      decision: 'REJECT',
      reasons,
    });

    return updated;
  }
}
