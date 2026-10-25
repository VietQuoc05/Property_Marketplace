import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MODERATION_QUEUE } from './ai-moderation.constants';
import { AiModerationService } from './ai-moderation.service';
import { GeminiService } from './gemini.service';
import { ListingModerationProcessor } from './ai-moderation.processor';
import { AiModerationController } from './ai-moderation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MODERATION_QUEUE,
    }),
    PrismaModule,
    RealtimeModule,
    NotificationModule,
  ],
  controllers: [AiModerationController],
  providers: [
    AiModerationService,
    GeminiService,
    ListingModerationProcessor,
  ],
  exports: [AiModerationService, GeminiService],
})
export class AiModerationModule {}
