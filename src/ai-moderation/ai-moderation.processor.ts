import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationService } from '../notification/notification.service';
import { GeminiService } from './gemini.service';
import { MODERATION_QUEUE } from './ai-moderation.constants';
import { ModerateListingJobData } from './ai-moderation.interface';
import { ListingStatus, NotificationType } from '@prisma/client';

@Processor(MODERATION_QUEUE)
export class ListingModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ListingModerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<ModerateListingJobData>): Promise<any> {
    const { listingId } = job.data;
    this.logger.log(`[Job ${job.id}] Starting moderation for listing ${listingId}`);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        city: true,
        district: true,
        ward: true,
      },
    });

    if (!listing) {
      this.logger.warn(`[Job ${job.id}] Listing ${listingId} not found, skipping.`);
      return { skipped: true, reason: 'LISTING_NOT_FOUND' };
    }

    // Call Gemini for content moderation
    const result = await this.geminiService.moderateListing({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType,
      saleType: listing.saleType,
      imageUrls: listing.images.map((img) => img.imageUrl),
    });

    this.logger.log(
      `[Job ${job.id}] Moderation result for ${listingId}: decision=${result.decision}, confidence=${result.confidence}, reasons=${JSON.stringify(result.reasons)}`,
    );

    // Save moderation record in database
    await this.prisma.listingModeration.upsert({
      where: { listingId: listing.id },
      create: {
        listingId: listing.id,
        decision: result.decision,
        confidence: result.confidence,
        intent: result.intent,
        titleDescriptionMatch: result.titleDescriptionMatch,
        imagesMatch: result.imagesMatch,
        communityViolation: result.communityViolation,
        reasons: result.reasons,
        rawResponse: result as any,
        reviewedAt: new Date(),
      },
      update: {
        decision: result.decision,
        confidence: result.confidence,
        intent: result.intent,
        titleDescriptionMatch: result.titleDescriptionMatch,
        imagesMatch: result.imagesMatch,
        communityViolation: result.communityViolation,
        reasons: result.reasons,
        rawResponse: result as any,
        reviewedAt: new Date(),
      },
    });

    let newStatus: ListingStatus = ListingStatus.PENDING_REVIEW;

    if (result.decision === 'APPROVE') {
      newStatus = ListingStatus.PUBLISHED;

      const updatedListing = await this.prisma.listing.update({
        where: { id: listing.id },
        data: { status: newStatus },
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

      // Emit new listing to feed & all active clients
      this.realtimeService.emitNewListing(updatedListing);

      // Send approved notification to the owner
      await this.notificationService.createNotification({
        userId: listing.createdById,
        type: NotificationType.LISTING_APPROVED,
        title: 'Tin đăng của bạn đã được duyệt thành công! 🎉',
        content: `Tin đăng "${listing.title}" đã được kiểm duyệt tự động và đang hiển thị công khai trên Homers.`,
        data: {
          listingId: listing.id,
          status: newStatus,
        },
      });
    } else {
      newStatus = ListingStatus.REJECTED;

      await this.prisma.listing.update({
        where: { id: listing.id },
        data: { status: newStatus },
      });

      const reasonText =
        result.reasons && result.reasons.length > 0
          ? result.reasons.join('; ')
          : 'Nội dung hoặc hình ảnh không phù hợp với tiêu chuẩn Homers Property.';

      // Send rejection notification to the owner
      await this.notificationService.createNotification({
        userId: listing.createdById,
        type: NotificationType.LISTING_REJECTED,
        title: 'Tin đăng của bạn không được duyệt ⚠️',
        content: `Tin đăng "${listing.title}" bị từ chối do: ${reasonText}`,
        data: {
          listingId: listing.id,
          status: newStatus,
          reasons: result.reasons,
        },
      });
    }

    // Emit realtime status update to the author and subscribers
    this.realtimeService.emitListingModerated(listing.createdById, {
      listingId: listing.id,
      status: newStatus,
      decision: result.decision,
      reasons: result.reasons,
    });

    return {
      listingId: listing.id,
      decision: result.decision,
      status: newStatus,
    };
  }
}
