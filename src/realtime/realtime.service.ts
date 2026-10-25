import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  // 1. Post Listing & 4. Feed
  emitNewListing(listing: any) {
    try {
      this.gateway.server.emit('listing:created', listing);
      this.gateway.server.to('room:feed').emit('feed:new_listing', listing);
    } catch (err) {
      this.logger.error('Failed to emit listing:created', err);
    }
  }

  emitListingUpdated(listing: any) {
    try {
      this.gateway.server.emit('listing:updated', listing);
    } catch (err) {
      this.logger.error('Failed to emit listing:updated', err);
    }
  }

  emitListingModerated(
    userId: string,
    data: {
      listingId: string;
      status: string;
      decision: string;
      reasons: string[];
    },
  ) {
    try {
      this.gateway.server.to(`user:${userId}`).emit('listing:moderated', data);
      this.gateway.server.emit('listing:status_changed', {
        listingId: data.listingId,
        status: data.status,
      });
    } catch (err) {
      this.logger.error('Failed to emit listing:moderated', err);
    }
  }

  emitListingDeleted(listingId: string) {
    try {
      this.gateway.server.emit('listing:deleted', { listingId });
      this.gateway.server.to('room:feed').emit('listing:deleted', { listingId });
    } catch (err) {
      this.logger.error('Failed to emit listing:deleted', err);
    }
  }

  // 2. Listing Interest
  emitInterestUpdated(
    ownerId: string,
    data: {
      listingId: string;
      interestScore: number;
      action: 'ADD' | 'REMOVE';
      user?: any;
    },
  ) {
    try {
      // Send to listing owner
      this.gateway.server.to(`user:${ownerId}`).emit('listing:interest_updated', data);
      // Broadcast to anyone looking at this listing or feed
      this.gateway.server.emit('listing:interest_count_changed', {
        listingId: data.listingId,
        interestScore: data.interestScore,
      });
      this.gateway.server.to(`listing:${data.listingId}`).emit('listing:interest_updated', data);
    } catch (err) {
      this.logger.error('Failed to emit listing:interest_updated', err);
    }
  }

  // 3. Messaging
  emitNewMessage(participantIds: string[], message: any) {
    try {
      // Emit to conversation room (for clients currently in this conversation)
      this.gateway.server
        .to(`conversation:${message.conversationId}`)
        .emit('message:new', message);

      // Emit to each participant's personal room (for conversation list, badge, etc.)
      for (const pId of participantIds) {
        this.gateway.server.to(`user:${pId}`).emit('message:new', message);
        this.gateway.server.to(`user:${pId}`).emit('conversation:updated', {
          conversationId: message.conversationId,
          lastMessage: message,
        });
      }
    } catch (err) {
      this.logger.error('Failed to emit message:new', err);
    }
  }

  emitConversationRead(conversationId: string, userId: string) {
    try {
      this.gateway.server
        .to(`conversation:${conversationId}`)
        .emit('conversation:read', { conversationId, userId });
    } catch (err) {
      this.logger.error('Failed to emit conversation:read', err);
    }
  }

  emitUnreadMessagesCount(userId: string, unreadCount: number) {
    try {
      this.gateway.server.to(`user:${userId}`).emit('messages:unread_count', { unreadCount });
    } catch (err) {
      this.logger.error('Failed to emit messages:unread_count', err);
    }
  }

  // 5. Notifications
  emitNewNotification(userId: string, notification: any, unreadCount?: number) {
    try {
      this.gateway.server.to(`user:${userId}`).emit('notification:new', notification);
      if (typeof unreadCount === 'number') {
        this.gateway.server
          .to(`user:${userId}`)
          .emit('notification:unread_count', { unreadCount });
      }
    } catch (err) {
      this.logger.error('Failed to emit notification:new', err);
    }
  }

  emitNotificationUnreadCount(userId: string, unreadCount: number) {
    try {
      this.gateway.server
        .to(`user:${userId}`)
        .emit('notification:unread_count', { unreadCount });
    } catch (err) {
      this.logger.error('Failed to emit notification:unread_count', err);
    }
  }
}
