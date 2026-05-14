import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateBlogDto {
  @ApiPropertyOptional({ description: 'Blog post title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Short excerpt' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Blog author name' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: 'Blog post date' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Blog cover image URL' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Blog category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Full blog content' })
  @IsString()
  @IsOptional()
  content?: string;
}
