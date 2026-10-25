import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class ContractInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async createInvitation(
    contractId: string,
    landlordId: string,
    phone: string,
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, landlordId: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== landlordId) {
      throw new ForbiddenException('You are not the landlord of this contract');
    }

    const invitee = await this.prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (!invitee) {
      throw new BadRequestException('User with this phone number not found');
    }

    const existingInvitation = await this.prisma.contractInvitation.findFirst({
      where: {
        contractId,
        inviteeId: invitee.id,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException(
        'This user already has a pending invitation for this contract',
      );
    }

    const isTenant = await this.prisma.contractTenant.findFirst({
      where: {
        contractId,
        tenantId: invitee.id,
      },
    });

    if (isTenant) {
      throw new BadRequestException(
        'This user is already a tenant of this contract',
      );
    }

    const createdInvitation = await this.prisma.contractInvitation.create({
      data: {
        contractId,
        invitedById: landlordId,
        inviteeId: invitee.id,
      },
      include: {
        invitee: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        contract: {
          select: {
            name: true,
          },
        },
      },
    });

    const notification = await this.prisma.notification.create({
      data: {
        userId: invitee.id,
        type: 'CONTRACT_INVITATION',
        title: 'Lời mời tham gia hợp đồng',
        content: `Chủ nhà ${createdInvitation.invitedBy.fullName} đã mời bạn tham gia hợp đồng "${createdInvitation.contract.name}"`,
        data: {
          contractId,
          invitationId: createdInvitation.id,
          contractName: createdInvitation.contract.name,
          landlordName: createdInvitation.invitedBy.fullName,
          landlordPhone: createdInvitation.invitedBy.phone,
        },
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId: invitee.id, isRead: false },
    });

    this.realtimeService.emitNewNotification(invitee.id, notification, unreadCount);

    return createdInvitation;
  }

  async approveInvitation(invitationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.contractInvitation.findUnique({
        where: {
          id: invitationId,
        },

        include: {
          contract: {
            include: {
              conversation: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new BadRequestException('Invitation not found');
      }

      if (invitation.inviteeId !== userId) {
        throw new ForbiddenException();
      }

      if (invitation.status !== 'PENDING') {
        throw new BadRequestException('Invitation already processed');
      }

      await tx.contractInvitation.update({
        where: {
          id: invitationId,
        },

        data: {
          status: 'ACCEPTED',
        },
      });

      await tx.contractTenant.create({
        data: {
          contractId: invitation.contractId,

          tenantId: invitation.inviteeId,
        },
      });

      await tx.conversationParticipant.create({
        data: {
          conversationId: invitation.contract.conversation!.id,

          userId: invitation.inviteeId,
        },
      });

      const tenantCount = await tx.contractTenant.count({
        where: {
          contractId: invitation.contractId,
        },
      });

      if (tenantCount > 0) {
        await tx.contract.update({
          where: {
            id: invitation.contractId,
          },

          data: {
            status: 'ACTIVE',
          },
        });
      }

      return tx.contract.findUnique({
        where: {
          id: invitation.contractId,
        },

        include: {
          landlord: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            },
          },

          tenants: {
            include: {
              tenant: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                  phone: true,
                },
              },
            },
          },

          invitations: {
            include: {
              invitee: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  avatarUrl: true,
                },
              },

              invitedBy: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },

          conversation: true,
        },
      });
    });
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.contractInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException();
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation already processed');
    }

    return this.prisma.contractInvitation.update({
      where: {
        id: invitationId,
      },

      data: {
        status: 'REJECTED',
      },
    });
  }
}
