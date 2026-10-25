import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { ListingModule } from './listing/listing.module';
import { LocationModule } from './location/location.module';
import { AuthModule } from './auth/auth.module';
import { ContractModule } from './contract/contract.module';
import { ContractInvitationModule } from './contract-invitation/contract-invitation.module';
import { ConversationModule } from './conversation/conversation.module';
import { FeedModule } from './feed/feed.module';
import { NotificationModule } from './notification/notification.module';
import { ForumModule } from './forum/forum.module';
import { RealtimeModule } from './realtime/realtime.module';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AiModerationModule } from './ai-moderation/ai-moderation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT')
            ? Number(configService.get('REDIS_PORT'))
            : 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    RealtimeModule,
    AiModerationModule,

    PrismaModule,

    StorageModule,

    UserModule,

    ListingModule,

    LocationModule,

    AuthModule,

    ContractModule,

    ContractInvitationModule,

    ConversationModule,

    FeedModule,

    NotificationModule,

    ForumModule,
  ],
})
export class AppModule {}
