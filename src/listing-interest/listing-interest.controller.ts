import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListingInterestService } from './listing-interest.service';

@Controller('listings')
export class ListingInterestController {
  constructor(
    private readonly listingInterestService: ListingInterestService,
  ) {}

  @Post(':id/interest')
  @UseGuards(JwtAuthGuard)
  addInterest(
    @Param('id') listingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.listingInterestService.addInterest(listingId, user.id);
  }

  @Delete(':id/interest')
  @UseGuards(JwtAuthGuard)
  removeInterest(
    @Param('id') listingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.listingInterestService.removeInterest(listingId, user.id);
  }

  @Get('interested/me')
  @UseGuards(JwtAuthGuard)
  findMyInterests(@CurrentUser() user: { id: string }) {
    return this.listingInterestService.findMyInterestedListings(user.id);
  }

  @Get(':id/interests')
  @UseGuards(JwtAuthGuard)
  findListingInterests(
    @Param('id') listingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.listingInterestService.findListingInterests(listingId, user.id);
  }

  @Get('interests/me')
  @UseGuards(JwtAuthGuard)
  findAllInterestsOnMyListings(@CurrentUser() user: { id: string }) {
    return this.listingInterestService.findAllInterestsOnMyListings(user.id);
  }
}
