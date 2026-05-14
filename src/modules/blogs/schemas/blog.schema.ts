import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @ApiProperty({ description: 'Blog post title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: 'Short excerpt' })
  @Prop({ required: true })
  excerpt: string;

  @ApiProperty({ description: 'Blog author name' })
  @Prop({ required: true })
  author: string;

  @ApiProperty({ description: 'Blog post date' })
  @Prop({ required: true })
  date: string;

  @ApiProperty({ description: 'Blog cover image URL' })
  @Prop({ required: true })
  image: string;

  @ApiProperty({ description: 'Blog category' })
  @Prop({ required: true })
  category: string;

  @ApiProperty({ description: 'Full blog content', required: false })
  @Prop()
  content?: string;

  @ApiProperty({ description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
