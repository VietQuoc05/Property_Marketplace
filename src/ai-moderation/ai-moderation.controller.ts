import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiModerationService } from './ai-moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Moderation')
@Controller('moderation')
export class AiModerationController {
  constructor(private readonly moderationService: AiModerationService) {}

  @Get(':listingId')
  @ApiOperation({ summary: 'Get AI moderation status and results for a listing' })
  async getStatus(@Param('listingId') listingId: string) {
    return this.moderationService.getModerationResult(listingId);
  }

  @Post(':listingId/retry')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Re-trigger AI moderation for a listing' })
  async retryModeration(@Param('listingId') listingId: string) {
    await this.moderationService.enqueueModeration(listingId);
    return {
      success: true,
      message: `Enqueued listing ${listingId} for AI moderation`,
    };
  }

  @Post(':listingId/manual-approve')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually approve a listing' })
  async manualApprove(@Param('listingId') listingId: string) {
    return this.moderationService.manualApprove(listingId);
  }

  @Post(':listingId/manual-reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually reject a listing with reasons' })
  async manualReject(
    @Param('listingId') listingId: string,
    @Body('reasons') reasons?: string[],
  ) {
    return this.moderationService.manualReject(listingId, reasons || []);
  }
}
