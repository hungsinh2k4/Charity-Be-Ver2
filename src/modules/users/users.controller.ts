import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, RequestUserVerificationDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role, VerificationStatus } from '../../common/enums';
import type { AuthenticatedUser } from '../auth/interfaces';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user.userId, updateDto);
  }

  @Post('request-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request user verification (submit identity document and selfie)',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Already verified or verification already pending',
  })
  async requestVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestUserVerificationDto,
  ) {
    return this.usersService.requestVerification(user.userId, dto);
  }

  // ==================== AUDITOR ENDPOINTS ====================

  @Get('pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Auditor] Get all users with pending verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of users pending verification',
  })
  async getPendingVerifications() {
    return this.usersService.findPendingVerifications();
  }

  @Get(':id/verification-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Auditor] Get user verification details including documents',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user verification details',
  })
  async getVerificationDetails(@Param('id') id: string) {
    return this.usersService.getVerificationDetails(id);
  }

  @Patch(':id/verification-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Auditor] Approve or reject user verification' })
  @ApiResponse({ status: 200, description: 'Verification status updated' })
  async updateVerificationStatus(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
  ) {
    return this.usersService.updateVerificationStatus(id, status);
  }
}
