import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ListingAmenity, ListingStatus, ListingSaleType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AiModerationService } from '../ai-moderation/ai-moderation.service';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { sortListingsBySearchPriority } from './utils/listing-search.util';

const listingInclude = Prisma.validator<Prisma.ListingInclude>()({
  city: true,
  district: true,
  ward: true,
  images: { orderBy: { createdAt: 'asc' } },
  moderation: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      phone: true,
    },
  },
  _count: {
    select: {
      interests: true,
    },
  },
});

@Injectable()
export class ListingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly moderationService: AiModerationService,
  ) {}

  async create(userId: string, dto: CreateListingDto, imageUrls?: string[]) {
    if (dto.isDealable && dto.saleType === 'RENT') {
      throw new BadRequestException('isDealable chỉ áp dụng cho listing bán');
    }

    if (dto.saleType === 'SALE') {
      if (dto.salePrice == null) {
        throw new BadRequestException(
          'salePrice là bắt buộc khi saleType là SALE',
        );
      }
    }

    if (dto.saleType === 'RENT') {
      if (dto.monthlyRent == null) {
        throw new BadRequestException(
          'monthlyRent là bắt buộc khi saleType là RENT',
        );
      }
    }

    if (dto.wardId && !dto.districtId) {
      throw new BadRequestException('wardId yêu cầu phải có districtId');
    }

    if (dto.districtId && !dto.cityId) {
      throw new BadRequestException('districtId yêu cầu phải có cityId');
    }

    const city = await this.prisma.city.findUnique({
      where: { id: dto.cityId },
      select: { id: true },
    });

    if (!city) {
      throw new BadRequestException('cityId không tồn tại');
    }

    if (dto.districtId) {
      const district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
        select: { id: true, cityId: true },
      });

      if (!district || district.cityId !== dto.cityId) {
        throw new BadRequestException(
          'districtId không tồn tại hoặc không thuộc cityId',
        );
      }

      if (dto.wardId) {
        const ward = await this.prisma.ward.findUnique({
          where: { id: dto.wardId },
          select: { id: true, districtId: true },
        });

        if (!ward || ward.districtId !== dto.districtId) {
          throw new BadRequestException(
            'wardId không tồn tại hoặc không thuộc districtId',
          );
        }
      }
    }

    const listing = await this.prisma.listing.create({
      data: {
        createdById: userId,

        title: dto.title,

        description: dto.description,

        cityId: dto.cityId,

        districtId: dto.districtId,

        wardId: dto.wardId,

        listingType: dto.listingType,

        saleType: dto.saleType,

        size: dto.size,

        monthlyRent: dto.monthlyRent,

        salePrice: dto.salePrice,

        depositAmount: dto.depositAmount,

        wc: dto.wc,

        br: dto.br,

        status: ListingStatus.PENDING_REVIEW,

        isDealable: dto.isDealable,

        amenities: dto.amenities ?? [],

        images:
          imageUrls && imageUrls.length > 0
            ? {
                create: imageUrls.map((imageUrl) => ({
                  imageUrl,
                })),
              }
            : undefined,
      },

      include: listingInclude,
    });

    // Enqueue listing for AI content moderation via BullMQ
    await this.moderationService.enqueueModeration(listing.id);

    return listing;
  }

  async findAll(query: ListingQueryDto, amenities?: ListingAmenity[]) {
    const where: Prisma.ListingWhereInput = {};

    // Filter by user / creator
    if (query.userId) {
      where.createdById = query.userId;
    }

    // Filter location
    if (query.cityId) {
      where.cityId = query.cityId;
    }

    if (query.districtId) {
      where.districtId = query.districtId;
    }

    if (query.wardId) {
      where.wardId = query.wardId;
    }

    // Filter amenities
    if (amenities && amenities.length > 0) {
      where.amenities = {
        hasEvery: amenities,
      };
    }

    // Filter loại bất động sản
    if (query.listingType) {
      where.listingType = query.listingType;
    }

    // Filter hình thức
    if (query.saleType) {
      where.saleType = query.saleType;
    }

    // Filter trạng thái
    if (query.status) {
      where.status = query.status;
    }

    // Filter diện tích
    if (query.size || query.minSize || query.maxSize) {
      where.size = {};
      if (query.size) {
        where.size.equals = Number(query.size);
      }
      if (query.minSize) {
        where.size.gte = Number(query.minSize);
      }
      if (query.maxSize) {
        where.size.lte = Number(query.maxSize);
      }
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { city: { name: { contains: s, mode: 'insensitive' } } },
        { district: { name: { contains: s, mode: 'insensitive' } } },
        { ward: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    if (query.minPrice || query.maxPrice) {
      const minP = query.minPrice ? Number(query.minPrice) : undefined;
      const maxP = query.maxPrice ? Number(query.maxPrice) : undefined;

      if (query.saleType === ListingSaleType.RENT) {
        where.monthlyRent = {
          ...(minP != null ? { gte: minP } : {}),
          ...(maxP != null ? { lte: maxP } : {}),
        };
      } else if (query.saleType === ListingSaleType.SALE) {
        where.salePrice = {
          ...(minP != null ? { gte: minP } : {}),
          ...(maxP != null ? { lte: maxP } : {}),
        };
      } else {
        const rentCond: Prisma.DecimalNullableFilter = {
          ...(minP != null ? { gte: minP } : {}),
          ...(maxP != null ? { lte: maxP } : {}),
        };
        const saleCond: Prisma.DecimalNullableFilter = {
          ...(minP != null ? { gte: minP } : {}),
          ...(maxP != null ? { lte: maxP } : {}),
        };
        const priceOr = [
          { monthlyRent: rentCond },
          { salePrice: saleCond },
        ];
        if (where.OR) {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            { OR: priceOr },
          ];
        } else {
          where.OR = priceOr;
        }
      }
    }

    // Filter giá thuê
    if (query.minRent || query.maxRent) {
      where.monthlyRent = {
        ...(where.monthlyRent as Prisma.DecimalNullableFilter || {}),
        ...(query.minRent ? { gte: Number(query.minRent) } : {}),
        ...(query.maxRent ? { lte: Number(query.maxRent) } : {}),
      };
    }

    // Filter giá bán
    if (query.minSalePrice || query.maxSalePrice) {
      where.salePrice = {
        ...(where.salePrice as Prisma.DecimalNullableFilter || {}),
        ...(query.minSalePrice ? { gte: Number(query.minSalePrice) } : {}),
        ...(query.maxSalePrice ? { lte: Number(query.maxSalePrice) } : {}),
      };
    }

    // Filter wc (số nhà vệ sinh)
    if (query.minWc || query.maxWc) {
      where.wc = {};

      if (query.minWc) {
        where.wc.gte = Number(query.minWc);
      }

      if (query.maxWc) {
        where.wc.lte = Number(query.maxWc);
      }
    }

    // Filter br (số phòng ngủ)
    if (query.minBr || query.maxBr) {
      where.br = {};

      if (query.minBr) {
        where.br.gte = Number(query.minBr);
      }

      if (query.maxBr) {
        where.br.lte = Number(query.maxBr);
      }
    }

    // Pagination
    const page = Number(query.page) || 1;

    const limit = Number(query.limit) || 10;

    const skip = (page - 1) * limit;

    const orderBy: Prisma.ListingOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
    ];

    if (query.search?.trim()) {
      const searchKey = query.search.trim();

      const [matchingListings, totalCount] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          include: listingInclude,
          orderBy,
        }),
        this.prisma.listing.count({
          where,
        }),
      ]);

      const sorted = sortListingsBySearchPriority(matchingListings, searchKey);
      return {
        data: sorted.slice(skip, skip + limit),
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,

        include: listingInclude,

        orderBy,

        skip,

        take: limit,
      }),

      this.prisma.listing.count({
        where,
      }),
    ]);

    return {
      data,

      meta: {
        total,

        page,

        limit,

        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id,
      },

      include: listingInclude,
    });

    if (!listing) {
      throw new NotFoundException('Không tìm thấy bài đăng hoặc bài đăng đã bị xóa');
    }

    return listing;
  }

  async findMyListings(userId: string) {
    return this.prisma.listing.findMany({
      where: {
        createdById: userId,
      },

      include: listingInclude,

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByUser(userId: string, status?: ListingStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: Prisma.ListingWhereInput = {
      createdById: userId,
    };

    if (status) {
      where.status = status;
    } else {
      where.status = ListingStatus.PUBLISHED;
    }

    return this.prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addImages(listingId: string, imageUrls: string[]) {
    await this.prisma.listingImage.createMany({
      data: imageUrls.map((imageUrl) => ({
        listingId,
        imageUrl,
      })),
    });

    return this.prisma.listing.findUnique({
      where: {
        id: listingId,
      },

      include: listingInclude,
    });
  }

  async update(id: string, dto: UpdateListingDto, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdById !== userId) {
      throw new ForbiddenException('You are not the owner of this listing');
    }

    if (dto.saleType === 'SALE' && dto.salePrice == null) {
      throw new BadRequestException(
        'salePrice là bắt buộc khi saleType là SALE',
      );
    }

    if (dto.saleType === 'RENT' && dto.monthlyRent == null) {
      throw new BadRequestException(
        'monthlyRent là bắt buộc khi saleType là RENT',
      );
    }

    if (dto.wardId && !dto.districtId) {
      throw new BadRequestException('wardId yêu cầu phải có districtId');
    }

    if (dto.districtId && !dto.cityId) {
      throw new BadRequestException('districtId yêu cầu phải có cityId');
    }

    if (dto.cityId !== undefined) {
      const city = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
        select: { id: true },
      });

      if (!city) {
        throw new BadRequestException('cityId không tồn tại');
      }
    }

    if (dto.districtId !== undefined) {
      const district = await this.prisma.district.findUnique({
        where: { id: dto.districtId },
        select: { id: true, cityId: true },
      });

      const targetCityId = dto.cityId ?? listing.cityId;

      if (!district || district.cityId !== targetCityId) {
        throw new BadRequestException(
          'districtId không tồn tại hoặc không thuộc cityId',
        );
      }
    }

    if (dto.wardId !== undefined) {
      const ward = await this.prisma.ward.findUnique({
        where: { id: dto.wardId },
        select: { id: true, districtId: true },
      });

      const targetDistrictId = dto.districtId ?? listing.districtId;

      if (!ward || ward.districtId !== targetDistrictId) {
        throw new BadRequestException(
          'wardId không tồn tại hoặc không thuộc districtId',
        );
      }
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cityId !== undefined && { cityId: dto.cityId }),
        ...(dto.districtId !== undefined && { districtId: dto.districtId }),
        ...(dto.wardId !== undefined && { wardId: dto.wardId }),
        ...(dto.listingType !== undefined && { listingType: dto.listingType }),
        ...(dto.saleType !== undefined && { saleType: dto.saleType }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.monthlyRent !== undefined && { monthlyRent: dto.monthlyRent }),
        ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
        ...(dto.isDealable !== undefined && { isDealable: dto.isDealable }),
        ...(dto.depositAmount !== undefined && {
          depositAmount: dto.depositAmount,
        }),
        ...(dto.wc !== undefined && { wc: dto.wc }),
        ...(dto.br !== undefined && { br: dto.br }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
      },
      include: listingInclude,
    });

    this.realtimeService.emitListingUpdated(updated);

    return updated;
  }

  async remove(id: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: {
        id,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdById !== userId) {
      throw new ForbiddenException('You are not the owner of this listing');
    }

    const deleted = await this.prisma.listing.delete({
      where: { id },
    });

    this.realtimeService.emitListingDeleted(id);

    return deleted;
  }

  async removeImage(imageId: string, userId: string) {
    const image = await this.prisma.listingImage.findUnique({
      where: {
        id: imageId,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const listing = await this.prisma.listing.findUnique({
      where: {
        id: image.listingId,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdById !== userId) {
      throw new ForbiddenException('You are not the owner of this listing');
    }

    return this.prisma.listingImage.delete({
      where: { id: imageId },
    });
  }
}
