import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ParseArrayPipe } from '@nestjs/common';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { ListingAmenity } from '@prisma/client';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findFeed(
    @CurrentUser() user: { id: string } | null,
    @Query() query: FeedQueryDto,
    @Query(
      'amenities[]',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    amenities?: string[],
  ) {
    const parsedAmenities = amenities?.map(
      (item) => item.toUpperCase() as ListingAmenity,
    );

    return this.feedService.buildFeed(user?.id, query, parsedAmenities);
  }
}
