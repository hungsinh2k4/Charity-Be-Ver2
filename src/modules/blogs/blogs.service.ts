import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from './schemas/blog.schema';
import { CreateBlogDto, UpdateBlogDto } from './dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) {}

  async create(createDto: CreateBlogDto): Promise<BlogDocument> {
    const blog = new this.blogModel(createDto);
    return blog.save();
  }

  async findAll(pagination?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: BlogDocument[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };

    const [data, total] = await Promise.all([
      this.blogModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.blogModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<BlogDocument> {
    const blog = await this.blogModel.findById(id).exec();
    if (!blog || blog.isDeleted) {
      throw new NotFoundException('Blog not found');
    }
    return blog;
  }

  async update(
    id: string,
    updateDto: UpdateBlogDto,
  ): Promise<BlogDocument> {
    const blog = await this.findById(id);
    Object.assign(blog, updateDto);
    return blog.save();
  }

  async softDelete(id: string): Promise<BlogDocument> {
    const blog = await this.findById(id);
    blog.isDeleted = true;
    return blog.save();
  }
}
