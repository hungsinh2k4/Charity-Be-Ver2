import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
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
}
