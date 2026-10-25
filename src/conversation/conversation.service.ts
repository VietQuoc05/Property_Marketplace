import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ConversationResponseDto } from './dto/response.dto';
import { MessageResponseDto } from './dto/response.dto';
import { DirectMessageResponseDto } from './dto/response.dto';

const messageInclude = {
  sender: {
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
    },
  },
  attachments: { select: { url: true } },
  listing: {
    select: {
      id: true,
      title: true,
      listingType: true,
      saleType: true,
      size: true,
      monthlyRent: true,
      salePrice: true,
      images: {
        select: { imageUrl: true },
        take: 1,
      },
      ward: { select: { name: true } },
      district: { select: { name: true } },
      city: { select: { name: true } },
    },
  },
};

function formatMessageListing(listing: any) {
  if (!listing) return null;
  const addressParts = [
    listing.ward?.name,
    listing.district?.name,
    listing.city?.name,
  ].filter(Boolean);

  return {
    id: listing.id,
    title: listing.title,
    listingType: String(listing.listingType || ''),
    saleType: String(listing.saleType || ''),
    size: listing.size ? Number(listing.size) : null,
    monthlyRent: listing.monthlyRent ? Number(listing.monthlyRent) : null,
    salePrice: listing.salePrice ? Number(listing.salePrice) : null,
    imageUrl: listing.images?.[0]?.imageUrl || null,
    address: addressParts.length > 0 ? addressParts.join(', ') : null,
  };
}

function formatMessageDto(message: any): MessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    listingId: message.listingId || null,
    listing: formatMessageListing(message.listing),
    attachments: message.attachments?.map((a: any) => a.url) || [],
    sentAt: message.sentAt instanceof Date ? message.sentAt.toISOString() : message.sentAt,
    sender: message.sender ? {
      id: message.sender.id,
      fullName: message.sender.fullName,
      email: message.sender.email,
      avatarUrl: message.sender.avatarUrl,
    } : null,
  };
}

const conversationInclude = Prisma.validator<Prisma.ConversationInclude>()({
  contract: {
    select: {
      id: true,
      name: true,
      status: true,
      landlordId: true,
    },
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
        },
      },
    },
  },
  messages: {
    include: messageInclude,
    orderBy: { sentAt: 'asc' },
  },
});

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async sendDirectMessage(
    senderId: string,
    targetUserId: string,
    content?: string,
    attachmentUrls?: string[],
    listingId?: string,
  ): Promise<DirectMessageResponseDto> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found');
    }

    let existingConversation: any = null;
    if (senderId === targetUserId) {
      // Direct conversation with self has only 1 participant or participants with senderId
      existingConversation = await this.prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: { userId: senderId },
          },
        },
        include: {
          participants: true,
        },
      });
    } else {
      existingConversation = await this.prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { participants: { some: { userId: senderId } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: {
          participants: true,
        },
      });
    }

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      const participantsData = senderId === targetUserId
        ? [{ userId: senderId }]
        : [{ userId: senderId }, { userId: targetUserId }];

      const conversation = await this.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: participantsData,
          },
        },
      });
      conversationId = conversation.id;
    }

    let messageRes: MessageResponseDto | null = null;
    if (content || (attachmentUrls && attachmentUrls.length > 0) || listingId) {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: content || '',
          listingId: listingId || undefined,
          attachments: attachmentUrls?.length
            ? { create: attachmentUrls.map((url) => ({ url })) }
            : undefined,
        },
        include: messageInclude,
      });
      messageRes = formatMessageDto(message);

      const participantIds = senderId === targetUserId ? [senderId] : [senderId, targetUserId];
      this.realtimeService.emitNewMessage(participantIds, messageRes);

      if (senderId !== targetUserId) {
        this.getUnreadCount(targetUserId).then(({ unreadCount }) => {
          this.realtimeService.emitUnreadMessagesCount(targetUserId, unreadCount);
        }).catch(() => null);
      }

      await this.prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      }).catch(() => null);
    }

    return {
      conversationId,
      message: messageRes as any,
    };
  }

  async getUnreadCount(userId: string, since?: string): Promise<{ unreadCount: number }> {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
      },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 1,
              select: {
                senderId: true,
                sentAt: true,
              },
            },
          },
        },
      },
    });

    const sinceTime = since ? new Date(since).getTime() : 0;

    let count = 0;
    for (const p of participants) {
      const lastMsg = p.conversation?.messages?.[0];
      if (lastMsg && lastMsg.senderId !== userId) {
        const lastMsgTime = new Date(lastMsg.sentAt).getTime();
        const lastReadTime = p.lastReadAt ? new Date(p.lastReadAt).getTime() : 0;
        const isUnread = lastMsgTime > lastReadTime;
        const isAfterSince = !sinceTime || lastMsgTime > sinceTime;
        if (isUnread && isAfterSince) {
          count++;
        }
      }
    }

    return { unreadCount: count };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.prisma.conversationParticipant.updateMany({
      where: {
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    this.realtimeService.emitUnreadMessagesCount(userId, 0);

    return { success: true };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    this.realtimeService.emitConversationRead(conversationId, userId);
    this.getUnreadCount(userId).then(({ unreadCount }) => {
      this.realtimeService.emitUnreadMessagesCount(userId, unreadCount);
    }).catch(() => null);

    return { success: true };
  }

  async findMyConversations(
    userId: string,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: conversationInclude,
    });

    const mapped = conversations
      .filter((conversation) => (conversation.messages && conversation.messages.length > 0) || conversation.type === 'CONTRACT')
      .map((conversation) => {
        const lastMsg = conversation.messages && conversation.messages.length > 0
          ? conversation.messages[conversation.messages.length - 1]
          : null;

        return {
          id: conversation.id,
          type: conversation.type,
          contractId: conversation.contractId,
          contract: conversation.contract ? {
            id: conversation.contract.id,
            name: conversation.contract.name,
            status: conversation.contract.status,
            landlordId: conversation.contract.landlordId,
          } : null,
          participants: conversation.participants.map((p) => ({
            id: p.id,
            userId: p.user.id,
            fullName: p.user.fullName,
            email: p.user.email,
            phone: p.user.phone,
            avatarUrl: p.user.avatarUrl,
            lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
            isArchived: p.isArchived || false,
          })),
          isArchived: conversation.participants.find((p) => p.userId === userId)?.isArchived || false,
          lastMessage: lastMsg ? formatMessageDto(lastMsg) : null,
          createdAt: conversation.createdAt.toISOString(),
        };
      });

    // Sort by latest message sentAt or conversation createdAt descending
    return mapped.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  async toggleArchive(
    conversationId: string,
    userId: string,
    isArchived: boolean,
  ): Promise<{ success: boolean; isArchived: boolean }> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const updated = await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        isArchived,
      },
    });

    return { success: true, isArchived: updated.isArchived };
  }

  async findOne(
    conversationId: string,
    userId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    return {
      id: conversation.id,
      type: conversation.type,
      contractId: conversation.contractId,
      contract: conversation.contract ? {
        id: conversation.contract.id,
        name: conversation.contract.name,
        status: conversation.contract.status,
        landlordId: conversation.contract.landlordId,
      } : null,
      participants: conversation.participants.map((p) => ({
        id: p.id,
        userId: p.user.id,
        fullName: p.user.fullName,
        email: p.user.email,
        phone: p.user.phone,
        avatarUrl: p.user.avatarUrl,
        lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
        isArchived: p.isArchived || false,
      })),
      isArchived: conversation.participants.find((p) => p.userId === userId)?.isArchived || false,
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  async findMessages(
    conversationId: string,
    userId: string,
  ): Promise<MessageResponseDto[]> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    // Automatically mark as read when fetching messages
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: { sentAt: 'asc' },
    });

    return messages.map(formatMessageDto);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content?: string,
    attachmentUrls?: string[],
    listingId?: string,
  ): Promise<MessageResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content || '',
        listingId: listingId || undefined,
        attachments: attachmentUrls?.length
          ? { create: attachmentUrls.map((url) => ({ url })) }
          : undefined,
      },
      include: messageInclude,
    });

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    }).catch(() => null);

    const messageDto: MessageResponseDto = formatMessageDto(message);

    const participantIds = conversation.participants.map((p) => p.userId);
    this.realtimeService.emitNewMessage(participantIds, messageDto);

    for (const pId of participantIds) {
      if (pId !== senderId) {
        this.getUnreadCount(pId).then(({ unreadCount }) => {
          this.realtimeService.emitUnreadMessagesCount(pId, unreadCount);
        }).catch(() => null);
      }
    }

    return messageDto;
  }

  async getMembers(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contract: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    const landlordId = conversation.contract?.landlordId;

    const members = conversation.participants.map((p) => {
      let role = 'MEMBER';
      if (conversation.type === 'CONTRACT') {
        if (p.userId === landlordId) {
          role = 'LANDLORD';
        } else {
          role = 'TENANT';
        }
      }
      return {
        id: p.id,
        userId: p.user.id,
        fullName: p.user.fullName,
        avatarUrl: p.user.avatarUrl,
        phone: p.user.phone,
        email: p.user.email,
        role,
        isMe: p.userId === userId,
      };
    });

    return {
      conversationId: conversation.id,
      type: conversation.type,
      contractId: conversation.contractId,
      contractName: conversation.contract?.name,
      contractStatus: conversation.contract?.status,
      landlordId,
      members,
    };
  }

  async updateSettings(
    conversationId: string,
    userId: string,
    data: { name?: string },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contract: true,
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant of this conversation',
      );
    }

    if (conversation.type === 'CONTRACT' && conversation.contractId && data.name) {
      if (conversation.contract && conversation.contract.landlordId === userId) {
        await this.prisma.contract.update({
          where: { id: conversation.contractId },
          data: { name: data.name },
        });
      } else {
        throw new ForbiddenException('Only landlord can change the contract name');
      }
    }

    return this.findOne(conversationId, userId);
  }
}
