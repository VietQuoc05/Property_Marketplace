import { Module } from '@nestjs/common';

import { ListingInterestController } from './listing-interest.controller';
import { ListingInterestService } from './listing-interest.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [ListingInterestController],
  providers: [ListingInterestService],
  exports: [ListingInterestService],
})
export class ListingInterestModule {}
