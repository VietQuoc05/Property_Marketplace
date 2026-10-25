import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        data: dto.data ?? undefined,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId: dto.userId, isRead: false },
    });

    this.realtimeService.emitNewNotification(dto.userId, notification, unreadCount);

    return notification;
  }

  async getMyNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    // Enrich CONTRACT_INVITATION notifications with real-time invitation status
    // and LISTING_INTEREST notifications with latest user info (avatar, name)
    const invitationIds: string[] = [];
    const contractIdsWithoutInvId: string[] = [];
    const interestedUserIds: string[] = [];
    const listingIds: string[] = [];

    for (const n of notifications) {
      if (n.type === 'CONTRACT_INVITATION') {
        const d = (n.data as any) || {};
        if (d.invitationId) {
          invitationIds.push(d.invitationId);
        } else if (d.contractId) {
          contractIdsWithoutInvId.push(d.contractId);
        }
      } else if (n.type === 'LISTING_INTEREST') {
        const d = (n.data as any) || {};
        if (d.interestedUserId) {
          interestedUserIds.push(d.interestedUserId);
        }
        if (d.listingId) {
          listingIds.push(d.listingId);
        }
      }
    }

    let invitationsMap = new Map<string, string>();
    let contractToInvMap = new Map<string, { id: string; status: string }>();
    let usersMap = new Map<string, { fullName: string; avatarUrl: string | null }>();
    let listingsMap = new Map<string, { title: string; imageUrl: string | null }>();

    if (invitationIds.length > 0) {
      const invitations = await this.prisma.contractInvitation.findMany({
        where: { id: { in: invitationIds } },
        select: { id: true, status: true },
      });
      invitationsMap = new Map(invitations.map((i) => [i.id, i.status]));
    }

    if (contractIdsWithoutInvId.length > 0) {
      const fallbackInvs = await this.prisma.contractInvitation.findMany({
        where: {
          contractId: { in: contractIdsWithoutInvId },
          inviteeId: userId,
        },
        select: { id: true, status: true, contractId: true },
      });
      for (const fi of fallbackInvs) {
        contractToInvMap.set(fi.contractId, { id: fi.id, status: fi.status });
      }
    }

    if (interestedUserIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: interestedUserIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      });
      for (const u of users) {
        usersMap.set(u.id, { fullName: u.fullName, avatarUrl: u.avatarUrl });
      }
    }

    if (listingIds.length > 0) {
      const listings = await this.prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: {
          id: true,
          title: true,
          images: {
            select: { imageUrl: true },
            take: 1,
          },
        },
      });
      for (const l of listings) {
        listingsMap.set(l.id, {
          title: l.title,
          imageUrl: l.images?.[0]?.imageUrl || null,
        });
      }
    }

    const enrichedNotifications = notifications.map((n) => {
      if (n.type === 'CONTRACT_INVITATION') {
        const data = (n.data as any) || {};
        let invId = data.invitationId;
        let invitationStatus = invId ? invitationsMap.get(invId) : undefined;

        if (!invitationStatus && data.contractId && contractToInvMap.has(data.contractId)) {
          const fi = contractToInvMap.get(data.contractId)!;
          invId = fi.id;
          invitationStatus = fi.status;
        }

        return {
          ...n,
          data: {
            ...data,
            invitationId: invId || data.invitationId,
            invitationStatus:
              invitationStatus || data.invitationStatus || 'PENDING',
          },
        };
      } else if (n.type === 'LISTING_INTEREST') {
        const data = (n.data as any) || {};
        const u = data.interestedUserId ? usersMap.get(data.interestedUserId) : null;
        const l = data.listingId ? listingsMap.get(data.listingId) : null;
        return {
          ...n,
          data: {
            ...data,
            listingTitle: l?.title || data.listingTitle || 'Tin đăng',
            listingImage: l?.imageUrl || data.listingImage || null,
            interestedUserName: u?.fullName || data.interestedUserName || 'Người dùng Homers',
            interestedUserAvatar: u?.avatarUrl || data.interestedUserAvatar || null,
          },
        };
      }
      return n;
    });

    return {
      notifications: enrichedNotifications,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot update notification of another user');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    this.realtimeService.emitNotificationUnreadCount(userId, unreadCount);

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    this.realtimeService.emitNotificationUnreadCount(userId, 0);

    return { success: true };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Cannot delete notification of another user');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    this.realtimeService.emitNotificationUnreadCount(userId, unreadCount);

    return { success: true };
  }
}
