import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

import { SetPhoneDto } from './dto/set-phone.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return this.userService.findById(user.id);
  }

  @Get(':id/listings')
  getUserListings(
    @Param('id') id: string,
    @Query('status') status?: ListingStatus,
  ) {
    return this.userService.getUserListings(id, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUserById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: any, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(user.id, updateUserDto);
  }

  @Post('me/phone')
  @UseGuards(JwtAuthGuard)
  setPhone(@CurrentUser() user: any, @Body() dto: SetPhoneDto) {
    return this.userService.setPhone(user.id, dto.phone);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.storageService.uploadAvatar(file);

    await this.userService.update(user.id, { avatarUrl: imageUrl });

    return {
      imageUrl,
    };
  }
}
