import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { JwtAuthGuard, VerifiedUserGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role, VerificationStatus } from '../../common/enums';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
    constructor(private organizationsService: OrganizationsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, VerifiedUserGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new organization (requires verified user)' })
    @ApiResponse({ status: 201, description: 'Organization created successfully' })
    @ApiResponse({ status: 403, description: 'User must be verified' })
    async create(@Body() createDto: CreateOrganizationDto, @CurrentUser() user: any) {
        return this.organizationsService.create(createDto, user.userId);
    }

    @Get()
    @ApiOperation({ summary: 'List all organizations' })
    @ApiResponse({ status: 200, description: 'Returns list of organizations' })
    async findAll() {
        return this.organizationsService.findAll();
    }

    @Get('my')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get organizations created by current user' })
    async findMyOrganizations(@CurrentUser() user: any) {
        return this.organizationsService.findByUser(user.userId);
    }

    @Get('pending-verifications')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Auditor] Get all organizations with pending verification' })
    @ApiResponse({ status: 200, description: 'Returns list of organizations pending verification' })
    async getPendingVerifications() {
        return this.organizationsService.findPendingVerifications();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiResponse({ status: 200, description: 'Returns organization details' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async findOne(@Param('id') id: string) {
        return this.organizationsService.findById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update organization (creator only)' })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    @ApiResponse({ status: 403, description: 'Not authorized to update this organization' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateOrganizationDto,
        @CurrentUser() user: any,
    ) {
        return this.organizationsService.update(id, updateDto, user.userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete organization (soft delete, creator only)' })
    @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
    @ApiResponse({ status: 403, description: 'Not authorized to delete this organization' })
    async remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.organizationsService.softDelete(id, user.userId);
    }

    @Post(':id/request-verification')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request verification for organization (requires legal documents to be uploaded first)' })
    @ApiResponse({ status: 200, description: 'Verification request submitted successfully' })
    @ApiResponse({ status: 400, description: 'Legal documents are required or verification already pending/completed' })
    @ApiResponse({ status: 403, description: 'Not authorized - only organization owner can request verification' })
    async requestVerification(@Param('id') id: string, @CurrentUser() user: any) {
        return this.organizationsService.requestVerification(id, user.userId);
    }

    @Patch(':id/verification-status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: '[Auditor] Approve or reject organization verification' })
    @ApiResponse({ status: 200, description: 'Verification status updated' })
    async updateVerificationStatus(
        @Param('id') id: string,
        @Body('status') status: VerificationStatus,
        @CurrentUser() user: any,
    ) {
        return this.organizationsService.updateVerificationStatus(id, status, user.userId);
    }

    @Get(':id/audit')
    @ApiOperation({ summary: 'Get organization blockchain audit trail' })
    @ApiResponse({ status: 200, description: 'Returns blockchain audit history' })
    async getAuditTrail(@Param('id') id: string) {
        return this.organizationsService.getAuditTrail(id);
    }
}
