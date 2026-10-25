import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ListingAmenity, ListingStatus, ListingSaleType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { sortListingsBySearchPriority } from '../listing/utils/listing-search.util';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async buildFeed(
    userId?: string | null,
    query: FeedQueryDto = {},
    amenities?: ListingAmenity[],
  ) {
    let userCityId: string | null = null;

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, cityId: true },
      });
      if (user) {
        userCityId = user.cityId;
      }
    }

    const where: Prisma.ListingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = ListingStatus.PUBLISHED;
    }

    if (query.listingType) {
      where.listingType = query.listingType;
    }

    if (query.saleType) {
      where.saleType = query.saleType;
    }

    if (query.cityId) {
      where.cityId = query.cityId;
    }

    if (query.districtId) {
      where.districtId = query.districtId;
    }

    if (query.wardId) {
      where.wardId = query.wardId;
    }

    if (amenities && amenities.length > 0) {
      where.amenities = {
        hasEvery: amenities,
      };
    }

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

    if (query.minRent || query.maxRent) {
      where.monthlyRent = {
        ...(where.monthlyRent as Prisma.DecimalNullableFilter || {}),
        ...(query.minRent ? { gte: Number(query.minRent) } : {}),
        ...(query.maxRent ? { lte: Number(query.maxRent) } : {}),
      };
    }

    if (query.minSalePrice || query.maxSalePrice) {
      where.salePrice = {
        ...(where.salePrice as Prisma.DecimalNullableFilter || {}),
        ...(query.minSalePrice ? { gte: Number(query.minSalePrice) } : {}),
        ...(query.maxSalePrice ? { lte: Number(query.maxSalePrice) } : {}),
      };
    }

    if (query.minWc || query.maxWc) {
      where.wc = {};
      if (query.minWc) {
        where.wc.gte = Number(query.minWc);
      }
      if (query.maxWc) {
        where.wc.lte = Number(query.maxWc);
      }
    }

    if (query.minBr || query.maxBr) {
      where.br = {};
      if (query.minBr) {
        where.br.gte = Number(query.minBr);
      }
      if (query.maxBr) {
        where.br.lte = Number(query.maxBr);
      }
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.ListingOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
    ];

    const listingInclude: Prisma.ListingInclude = {
      city: { select: { id: true, name: true } },
      district: { select: { id: true, name: true } },
      ward: { select: { id: true, name: true } },
      images: { orderBy: { createdAt: 'asc' } },
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
    };

    let data: any[] = [];
    let total = 0;

    // When search query is provided, prioritize results by:
    // 1: title, 2: city/district/ward, 3: description
    if (query.search?.trim()) {
      const searchKey = query.search.trim();

      const [matchingListings, totalCount] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          include: listingInclude,
          orderBy,
        }),
        this.prisma.listing.count({ where }),
      ]);

      const sortedListings = sortListingsBySearchPriority(matchingListings, searchKey);
      total = totalCount;
      data = sortedListings.slice(skip, skip + limit);
    } else if (!query.cityId && userCityId) {
      // If a specific cityId is queried, it's a strict filter (handled via where.cityId).
      // If NO cityId is specified but user has a registered cityId, apply FEED logic:
      // Prioritize user.cityId first; once exhausted, show other cities.
      const preferredCityWhere: Prisma.ListingWhereInput = {
        ...where,
        cityId: userCityId,
      };
      const otherCitiesWhere: Prisma.ListingWhereInput = {
        ...where,
        cityId: { not: userCityId },
      };

      const [preferredCount, otherCount] = await Promise.all([
        this.prisma.listing.count({ where: preferredCityWhere }),
        this.prisma.listing.count({ where: otherCitiesWhere }),
      ]);

      total = preferredCount + otherCount;

      let preferredTake = 0;
      let preferredSkip = 0;

      if (skip < preferredCount) {
        preferredSkip = skip;
        preferredTake = Math.min(limit, preferredCount - skip);
      }

      const otherTake = limit - preferredTake;
      let otherSkip = 0;
      if (otherTake > 0) {
        otherSkip = Math.max(0, skip - preferredCount);
      }

      const queries: Promise<any>[] = [];

      if (preferredTake > 0) {
        queries.push(
          this.prisma.listing.findMany({
            where: preferredCityWhere,
            include: listingInclude,
            orderBy,
            skip: preferredSkip,
            take: preferredTake,
          }),
        );
      } else {
        queries.push(Promise.resolve([]));
      }

      if (otherTake > 0) {
        queries.push(
          this.prisma.listing.findMany({
            where: otherCitiesWhere,
            include: listingInclude,
            orderBy,
            skip: otherSkip,
            take: otherTake,
          }),
        );
      } else {
        queries.push(Promise.resolve([]));
      }

      const [preferredData, otherData] = await Promise.all(queries);
      data = [...preferredData, ...otherData];
    } else {
      // Standard query (strict filter or user without cityId)
      const [resData, resTotal] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          include: listingInclude,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.listing.count({ where }),
      ]);
      data = resData;
      total = resTotal;
    }

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
}
