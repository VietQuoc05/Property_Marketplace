import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { ContractInvitationController } from './contract-invitation.controller';

import { ContractInvitationService } from './contract-invitation.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule],

  controllers: [ContractInvitationController],

  providers: [ContractInvitationService],

  exports: [ContractInvitationService],
})
export class ContractInvitationModule {}
