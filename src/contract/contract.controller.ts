import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

import { ContractService } from './contract.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser()
    user: any,

    @Body()
    dto: CreateContractDto,
  ) {
    return this.contractService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.contractService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-invitations')
  getMyInvitations(
    @CurrentUser()
    user: any,
  ) {
    return this.contractService.getMyInvitations(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyContracts(
    @CurrentUser()
    user: any,
  ) {
    return this.contractService.findMyContracts(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.contractService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @CurrentUser()
    user: any,

    @Body()
    dto: UpdateContractDto,
  ) {
    return this.contractService.update(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/tenants/me/leave')
  leaveContract(
    @Param('id')
    id: string,

    @CurrentUser()
    user: any,
  ) {
    return this.contractService.leaveContract(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/invitations')
  async getContractInvitations(
    @Param('id')
    id: string,

    @CurrentUser()
    user: any,
  ) {
    const contract = await this.contractService.findOne(id);

    if (!contract) {
      throw new ForbiddenException('Contract not found');
    }

    if (contract.landlordId !== user.id) {
      throw new ForbiddenException('You are not the landlord of this contract');
    }

    return this.contractService.getContractInvitations(id);
  }
}
