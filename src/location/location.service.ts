import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async getCities() {
    return this.prisma.city.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getDistricts(cityId: string) {
    return this.prisma.district.findMany({
      where: {
        cityId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getWards(districtId: string) {
    return this.prisma.ward.findMany({
      where: {
        districtId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
