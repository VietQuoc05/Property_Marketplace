import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConversationService } from './conversation.service';
import { StorageService } from '../storage/storage.service';

@Controller('messages')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly storageService: StorageService,
  ) {}

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async sendDirectMessage(
    @CurrentUser() user: { id: string },
    @Body('targetUserId') targetUserId: string,
    @Body('content') content?: string,
    @Body('listingId') listingId?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attachmentUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.storageService.uploadMessageAttachment(file);
        attachmentUrls.push(url);
      }
    }

    return this.conversationService.sendDirectMessage(
      user.id,
      targetUserId,
      content,
      attachmentUrls,
      listingId,
    );
  }
}

@Controller('conversations')
export class ConversationQueryController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly storageService: StorageService,
  ) {}

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(
    @CurrentUser() user: { id: string },
    @Query('since') since?: string,
  ) {
    return this.conversationService.getUnreadCount(user.id, since);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyConversations(@CurrentUser() user: { id: string }) {
    return this.conversationService.findMyConversations(user.id);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.conversationService.markAllAsRead(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversationService.findOne(conversationId, user.id);
  }

  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  findMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversationService.findMessages(conversationId, user.id);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversationService.markAsRead(conversationId, user.id);
  }

  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async sendMessage(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Body('content') content?: string,
    @Body('listingId') listingId?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const attachmentUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.storageService.uploadMessageAttachment(file);
        attachmentUrls.push(url);
      }
    }

    return this.conversationService.sendMessage(
      conversationId,
      user.id,
      content,
      attachmentUrls,
      listingId,
    );
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  getMembers(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.conversationService.getMembers(conversationId, user.id);
  }

  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard)
  updateSettings(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Body('name') name?: string,
  ) {
    return this.conversationService.updateSettings(conversationId, user.id, {
      name,
    });
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  toggleArchive(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
    @Body('isArchived') isArchived?: boolean,
  ) {
    return this.conversationService.toggleArchive(
      conversationId,
      user.id,
      isArchived !== false,
    );
  }
}
