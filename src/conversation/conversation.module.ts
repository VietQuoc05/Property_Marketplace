import { Module } from '@nestjs/common';

import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationQueryController } from './conversation.controller';

@Module({
  controllers: [ConversationController, ConversationQueryController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
