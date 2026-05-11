import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto, ProcessVerificationDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role, RequestStatus } from '../../common/enums';
import type { AuthenticatedUser } from '../auth/interfaces';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a verification request' })
  @ApiResponse({ status: 201, description: 'Verification request created' })
  @ApiResponse({ status: 400, description: 'Pending request already exists' })
  async createRequest(
    @Body() createDto: CreateVerificationRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verificationService.create(createDto, user.userId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.AUDITOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all verification requests (Moderator/Auditor/Admin)' })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns list of verification requests',
  })
  async findAll(@Query('status') status?: RequestStatus) {
    return this.verificationService.findAll(status);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.AUDITOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification request by ID (Moderator/Auditor/Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Returns verification request details',
  })
  async findOne(@Param('id') id: string) {
    return this.verificationService.findById(id);
  }

  @Post('requests/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a verification request (Moderator only)',
  })
  @ApiResponse({ status: 200, description: 'Verification request processed' })
  @ApiResponse({ status: 400, description: 'Request already processed' })
  async processRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verificationService.processRequest(id, processDto, user.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.AUDITOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification statistics (Moderator/Auditor/Admin)' })
  @ApiResponse({ status: 200, description: 'Returns verification statistics' })
  async getStats() {
    return this.verificationService.getStats();
  }
}
