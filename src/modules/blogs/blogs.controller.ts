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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto } from './dto';
import { JwtAuthGuard, VerifiedUserGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { Role } from '../../common/enums';

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private blogsService: BlogsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post (admin only)' })
  @ApiResponse({ status: 201, description: 'Blog created successfully' })
  async create(@Body() createDto: CreateBlogDto) {
    return this.blogsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all blog posts with pagination' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of blog posts' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blog post by ID with full content' })
  @ApiResponse({ status: 200, description: 'Returns blog post details' })
  @ApiResponse({ status: 404, description: 'Blog not found' })
  async findOne(@Param('id') id: string) {
    return this.blogsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog post (admin only)' })
  @ApiResponse({ status: 200, description: 'Blog updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBlogDto,
  ) {
    return this.blogsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete blog post (soft delete, admin only)' })
  @ApiResponse({ status: 200, description: 'Blog deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.blogsService.softDelete(id);
  }
}
