import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ContractController } from './contract.controller';

import { ContractService } from './contract.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],

  controllers: [ContractController],

  providers: [ContractService],
})
export class ContractModule {}
