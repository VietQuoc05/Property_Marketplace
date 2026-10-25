import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NeedType, NeedSaleType } from '@prisma/client';
import { ForumService } from './forum.service';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('forum-posts')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forumService.create(userId, dto);
  }

  @Get()
  findAll(
    @Query('cityId') cityId?: string,
    @Query('districtId') districtId?: string,
    @Query('wardId') wardId?: string,
    @Query('needType') needType?: NeedType,
    @Query('needSaleType') needSaleType?: NeedSaleType,
  ) {
    return this.forumService.findAll({ cityId, districtId, wardId, needType, needSaleType });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.forumService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.forumService.remove(id, userId);
  }
}
