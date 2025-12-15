import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { VerificationStatus } from '../../common/enums';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
    constructor(private campaignsService: CampaignsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new campaign (organization creator only)' })
    @ApiResponse({ status: 201, description: 'Campaign created successfully' })
    @ApiResponse({ status: 403, description: 'Not authorized to create campaign for this organization' })
    async create(@Body() createDto: CreateCampaignDto, @CurrentUser() user: any) {
        return this.campaignsService.create(createDto, user.userId);
    }

    @Get()
    @ApiOperation({ summary: 'List all campaigns with optional filters' })
    @ApiQuery({ name: 'organizationId', required: false })
    @ApiQuery({ name: 'verificationStatus', enum: VerificationStatus, required: false })
    @ApiQuery({ name: 'isActive', type: Boolean, required: false })
    @ApiResponse({ status: 200, description: 'Returns list of campaigns' })
    async findAll(
        @Query('organizationId') organizationId?: string,
        @Query('verificationStatus') verificationStatus?: VerificationStatus,
        @Query('isActive') isActive?: string,
    ) {
        return this.campaignsService.findAll({
            organizationId,
            verificationStatus,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get campaign by ID' })
    @ApiResponse({ status: 200, description: 'Returns campaign details' })
    @ApiResponse({ status: 404, description: 'Campaign not found' })
    async findOne(@Param('id') id: string) {
        return this.campaignsService.findById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update campaign (creator only)' })
    @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
    @ApiResponse({ status: 403, description: 'Not authorized to update this campaign' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateCampaignDto,
        @CurrentUser() user: any,
    ) {
        return this.campaignsService.update(id, updateDto, user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete campaign (soft delete, creator only)' })
    @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.campaignsService.softDelete(id, user.userId);
    }

    @Get(':id/audit')
    @ApiOperation({ summary: 'Get campaign blockchain audit trail' })
    @ApiResponse({ status: 200, description: 'Returns blockchain audit history' })
    async getAuditTrail(@Param('id') id: string) {
        return this.campaignsService.getAuditTrail(id);
    }
}
