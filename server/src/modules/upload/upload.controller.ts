import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { getSupabaseClient } from '@/storage/database/supabase-client';

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private readonly bucketName = 'shangyan-assets';

  /**
   * 上传单张图片
   * 用于宴会照片上传
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any) {
    try {
      // 支持小程序端 file.path 和 H5 端 file.buffer
      let fileBuffer: Buffer;

      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path) {
        const fs = await import('fs/promises');
        fileBuffer = await fs.readFile(file.path);
      } else {
        return {
          code: 400,
          msg: '无法获取文件内容',
          data: null,
        };
      }

      const key = `banquets/${Date.now()}_${file.originalname}`;
      const client = getSupabaseClient();

      // 上传到 Supabase Storage
      const { data, error } = await client.storage
        .from(this.bucketName)
        .upload(key, fileBuffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: true,
        });

      if (error) {
        this.logger.error(`上传图片失败: ${error.message}`);
        return { code: 500, msg: '上传失败: ' + error.message, data: null };
      }

      // 获取公开访问 URL
      const { data: urlData } = client.storage
        .from(this.bucketName)
        .getPublicUrl(key);

      const url = urlData?.publicUrl || '';

      return {
        code: 200,
        msg: 'success',
        data: {
          key,
          url,
          filename: file.originalname,
        },
      };
    } catch (error: any) {
      this.logger.error(`上传图片异常: ${error.message}`);
      return {
        code: 500,
        msg: '上传失败',
        data: null,
      };
    }
  }

  /**
   * 批量上传图片（最多3张）
   * 用于创建宴会时上传多张照片
   */
  @Post('photos')
  @UseInterceptors(FilesInterceptor('photos', 3))
  async uploadPhotos(@UploadedFiles() files: any[]) {
    try {
      const client = getSupabaseClient();
      const uploadPromises = files.map(async (file) => {
        let fileBuffer: Buffer;

        if (file.buffer) {
          fileBuffer = file.buffer;
        } else if (file.path) {
          const fs = await import('fs/promises');
          fileBuffer = await fs.readFile(file.path);
        } else {
          throw new Error(`文件 ${file.originalname} 无法读取`);
        }

        const key = `banquets/${Date.now()}_${file.originalname}`;
        const { error } = await client.storage
          .from(this.bucketName)
          .upload(key, fileBuffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: true,
          });

        if (error) {
          throw new Error(error.message);
        }

        const { data: urlData } = client.storage
          .from(this.bucketName)
          .getPublicUrl(key);

        return { key, url: urlData?.publicUrl || '' };
      });

      const results = await Promise.all(uploadPromises);

      return {
        code: 200,
        msg: 'success',
        data: results.map((r) => r.url),
      };
    } catch (error: any) {
      this.logger.error(`批量上传照片失败: ${error.message}`);
      return {
        code: 500,
        msg: '上传失败',
        data: null,
      };
    }
  }

  /**
   * 获取图片访问链接
   * 当图片 URL 过期时，可以通过此接口重新获取
   */
  @Get('url')
  async getImageUrl(@Query('key') key: string) {
    try {
      const client = getSupabaseClient();
      const { data } = client.storage
        .from(this.bucketName)
        .getPublicUrl(key);

      return {
        code: 200,
        msg: 'success',
        data: { url: data?.publicUrl || '' },
      };
    } catch (error: any) {
      this.logger.error(`获取图片URL失败: ${error.message}`);
      return {
        code: 500,
        msg: '获取失败',
        data: null,
      };
    }
  }
}
