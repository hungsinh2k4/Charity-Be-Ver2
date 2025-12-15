import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { Role } from '../../common/enums';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get('dashboard')
    @Roles(Role.ADMIN, Role.AUDITOR)
    @ApiOperation({ summary: 'Get admin dashboard statistics' })
    @ApiResponse({ status: 200, description: 'Returns dashboard statistics' })
    async getDashboardStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('users')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({ status: 200, description: 'Returns list of all users' })
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }

    @Patch('users/:id/role')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Update user role (Admin only)' })
    @ApiResponse({ status: 200, description: 'User role updated' })
    async updateUserRole(
        @Param('id') id: string,
        @Body() body: { role: Role },
    ) {
        return this.adminService.updateUserRole(id, body.role);
    }

    @Get('audit/organizations/:id')
    @Roles(Role.ADMIN, Role.AUDITOR)
    @ApiOperation({ summary: 'Get organization audit trail' })
    @ApiResponse({ status: 200, description: 'Returns blockchain audit trail' })
    async getOrganizationAudit(@Param('id') id: string) {
        return this.adminService.getOrganizationAudit(id);
    }

    @Get('audit/campaigns/:id')
    @Roles(Role.ADMIN, Role.AUDITOR)
    @ApiOperation({ summary: 'Get campaign audit trail' })
    @ApiResponse({ status: 200, description: 'Returns blockchain audit trail' })
    async getCampaignAudit(@Param('id') id: string) {
        return this.adminService.getCampaignAudit(id);
    }

    @Get('blockchain/summary')
    @Roles(Role.ADMIN, Role.AUDITOR)
    @ApiOperation({ summary: 'Get blockchain summary' })
    @ApiResponse({ status: 200, description: 'Returns blockchain stats' })
    async getBlockchainSummary() {
        return this.adminService.getBlockchainSummary();
    }
}
