import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FilesInterceptor } from '@nestjs/platform-express';

import { StorageService } from '../storage/storage.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { ListingService } from './listing.service';
import { ListingAmenity, ListingStatus } from '@prisma/client';
import { ParseArrayPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('listings')
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 20))
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateListingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls = files
      ? await Promise.all(
          files.map((file) => this.storageService.uploadListingImage(file)),
        )
      : [];

    return this.listingService.create(user.id, dto, imageUrls);
  }

  @Get()
  findAll(
    @Query() query: ListingQueryDto,
    @Query(
      'amenities[]',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    amenities?: string[],
  ) {
    const parsedAmenities = amenities?.map(
      (item) => item.toUpperCase() as ListingAmenity,
    );

    return this.listingService.findAll(query, parsedAmenities);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyListings(@CurrentUser() user: { id: string }) {
    return this.listingService.findMyListings(user.id);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('status') status?: ListingStatus,
  ) {
    return this.listingService.findByUser(userId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.listingService.remove(id, user.id);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @Param('imageId') imageId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.listingService.removeImage(imageId, user.id);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 20))
  @UseGuards(JwtAuthGuard)
  async uploadImages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    const listing = await this.listingService.findOne(id);

    if (!listing || listing.createdById !== user.id) {
      throw new ForbiddenException('You are not the owner of this listing');
    }

    const imageUrls = await Promise.all(
      files.map((file) => this.storageService.uploadListingImage(file)),
    );

    return this.listingService.addImages(id, imageUrls);
  }
}
