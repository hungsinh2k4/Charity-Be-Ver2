import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
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
}
