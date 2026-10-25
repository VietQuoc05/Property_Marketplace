import { Controller, Get, Param } from '@nestjs/common';

import { LocationService } from './location.service';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('cities')
  getCities() {
    return this.locationService.getCities();
  }

  @Get('cities/:cityId/districts')
  getDistricts(@Param('cityId') cityId: string) {
    return this.locationService.getDistricts(cityId);
  }

  @Get('districts/:districtId/wards')
  getWards(
    @Param('districtId')
    districtId: string,
  ) {
    return this.locationService.getWards(districtId);
  }
}
