import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

const contractInclude = Prisma.validator<Prisma.ContractInclude>()({
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
});

export { contractInclude };

@Injectable()
export class ContractService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(dto: CreateContractDto, landlordId: string) {
    return this.prisma.$transaction(async (tx) => {
      const landlord = await tx.user.findUnique({
        where: {
          id: landlordId,
        },
      });

      if (!landlord) {
        throw new BadRequestException('Landlord not found');
      }

      const contract = await tx.contract.create({
        data: {
          name: dto.name,
          landlordId,
        },
      });

      const conversation = await tx.conversation.create({
        data: {
          type: 'CONTRACT',

          contractId: contract.id,
        },
      });

      await tx.conversationParticipant.create({
        data: {
          conversationId: conversation.id,

          userId: landlordId,
        },
      });

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: landlordId,
          content: `Đã tạo đoạn chat hợp đồng: ${dto.name}`,
        },
      });

      for (const phone of dto.tenantPhones) {
        const invitee = await tx.user.findFirst({
          where: {
            phone,
          },
        });

        if (!invitee) {
          continue;
        }

        const invitation = await tx.contractInvitation.create({
          data: {
            contractId: contract.id,

            invitedById: landlordId,

            inviteeId: invitee.id,
          },
        });

        const createdNotif = await tx.notification.create({
          data: {
            userId: invitee.id,
            type: 'CONTRACT_INVITATION',
            title: 'Lời mời tham gia hợp đồng',
            content: `Chủ nhà ${landlord.fullName} đã mời bạn tham gia hợp đồng "${dto.name}"`,
            data: {
              contractId: contract.id,
              invitationId: invitation.id,
              contractName: dto.name,
              landlordName: landlord.fullName,
              landlordPhone: landlord.phone,
            },
          },
        });

        // Trigger realtime event asynchronously
        this.prisma.notification.count({ where: { userId: invitee.id, isRead: false } }).then((unreadCount) => {
          this.realtimeService.emitNewNotification(invitee.id, createdNotif, unreadCount);
        }).catch(() => null);
      }

      return tx.contract.findUnique({
        where: {
          id: contract.id,
        },

        include: contractInclude,
      });
    });
  }

  async findAll() {
    return this.prisma.contract.findMany({
      include: contractInclude,
    });
  }

  async findMyContracts(userId: string) {
    return this.prisma.contract.findMany({
      where: {
        OR: [
          {
            landlordId: userId,
          },

          {
            tenants: {
              some: {
                tenantId: userId,
              },
            },
          },
        ],
      },

      include: contractInclude,

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.contract.findUnique({
      where: {
        id,
      },

      include: contractInclude,
    });
  }

  async getMyInvitations(userId: string) {
    return this.prisma.contractInvitation.findMany({
      where: {
        inviteeId: userId,
      },

      include: {
        contract: {
          include: {
            landlord: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },

        invitedBy: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getContractInvitations(contractId: string) {
    return this.prisma.contractInvitation.findMany({
      where: {
        contractId,
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
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, dto: UpdateContractDto, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: {
        id,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== userId) {
      throw new ForbiddenException('You are not the landlord of this contract');
    }

    return this.prisma.contract.update({
      where: {
        id,
      },

      data: {
        name: dto.name,
      },

      include: contractInclude,
    });
  }

  async leaveContract(contractId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({
        where: {
          id: contractId,
        },

        include: {
          conversation: true,
        },
      });

      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      const tenant = await tx.contractTenant.findFirst({
        where: {
          contractId,
          tenantId: userId,
        },
      });

      if (!tenant) {
        throw new ForbiddenException('You are not a tenant of this contract');
      }

      await tx.contractTenant.delete({
        where: {
          id: tenant.id,
        },
      });

      await tx.conversationParticipant.deleteMany({
        where: {
          conversationId: contract.conversation!.id,

          userId,
        },
      });

      return tx.contract.findUnique({
        where: {
          id: contractId,
        },

        include: contractInclude,
      });
    });
  }
}
