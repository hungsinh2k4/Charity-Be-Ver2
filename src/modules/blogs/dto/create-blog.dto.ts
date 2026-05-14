import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog post title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Short excerpt' })
  @IsString()
  @IsNotEmpty()
  excerpt: string;

  @ApiProperty({ description: 'Blog author name' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ description: 'Blog post date' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Blog cover image URL' })
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiProperty({ description: 'Blog category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Full blog content' })
  @IsString()
  @IsOptional()
  content?: string;
}
