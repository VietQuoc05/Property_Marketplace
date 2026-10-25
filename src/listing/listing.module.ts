import { Module } from '@nestjs/common';

import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { ListingInterestModule } from '../listing-interest/listing-interest.module';
import { AiModerationModule } from '../ai-moderation/ai-moderation.module';

@Module({
  controllers: [ListingController],
  providers: [ListingService],
  imports: [ListingInterestModule, AiModerationModule],
})
export class ListingModule {}
