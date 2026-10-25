import { Controller, Param, Post, UseGuards, Body } from '@nestjs/common';

import { ContractInvitationService } from './contract-invitation.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('contracts/invitations')
export class ContractInvitationController {
  constructor(
    private readonly contractInvitationService: ContractInvitationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post(':contractId')
  create(
    @CurrentUser()
    user: any,

    @Param('contractId')
    contractId: string,

    @Body()
    dto: CreateInvitationDto,
  ) {
    return this.contractInvitationService.createInvitation(
      contractId,
      user.id,
      dto.phone,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  approveInvitation(
    @CurrentUser()
    user: any,

    @Param('id')
    id: string,
  ) {
    return this.contractInvitationService.approveInvitation(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  rejectInvitation(
    @CurrentUser()
    user: any,

    @Param('id')
    id: string,
  ) {
    return this.contractInvitationService.rejectInvitation(id, user.id);
  }
}
