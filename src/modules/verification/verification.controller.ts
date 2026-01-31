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
    @CurrentUser() user: any,
  ) {
    return this.verificationService.create(createDto, user.userId);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all verification requests (Admin/Auditor)' })
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
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification request by ID (Admin/Auditor)' })
  @ApiResponse({
    status: 200,
    description: 'Returns verification request details',
  })
  async findOne(@Param('id') id: string) {
    return this.verificationService.findById(id);
  }

  @Post('requests/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject a verification request (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Verification request processed' })
  @ApiResponse({ status: 400, description: 'Request already processed' })
  async processRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessVerificationDto,
    @CurrentUser() user: any,
  ) {
    return this.verificationService.processRequest(id, processDto, user.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get verification statistics (Admin/Auditor)' })
  @ApiResponse({ status: 200, description: 'Returns verification statistics' })
  async getStats() {
    return this.verificationService.getStats();
  }
}
