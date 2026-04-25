import { getSupabaseClient, getSupabaseAdminClient } from './database/supabase-client';

const supabase = getSupabaseClient(); // 普通客户端：用于上传/删除文件
const supabaseAdmin = getSupabaseAdminClient(); // 管理员客户端：用于创建存储桶（绕过RLS）

// 需要的存储桶列表
const REQUIRED_BUCKETS = ['exports', 'banquets', 'avatars', 'gifts'];

export interface UploadParams {
  bucket: string;
  fileName: string;
  file: Buffer;
  contentType?: string;
}

/**
 * 初始化所有需要的存储桶
 */
export async function initializeStorageBuckets(): Promise<void> {
  console.log('正在初始化存储桶...');

  for (const bucketName of REQUIRED_BUCKETS) {
    try {
      // 检查存储桶是否存在
      const { data: bucket, error: getError } = await supabaseAdmin.storage.getBucket(bucketName);

      if (getError || !bucket) {
        // 创建存储桶（使用管理员权限绕过RLS）
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
          ],
        });

        if (createError) {
          console.error(`创建存储桶 ${bucketName} 失败:`, createError.message);
        } else {
          console.log(`存储桶 ${bucketName} 创建成功`);
        }
      } else {
        console.log(`存储桶 ${bucketName} 已存在`);
      }
    } catch (error) {
      console.error(`初始化存储桶 ${bucketName} 异常:`, error);
    }
  }
}

/**
 * 上传文件到 Supabase Storage
 */
export async function uploadToStorage(params: UploadParams): Promise<string> {
  const { bucket, fileName, file, contentType = 'application/octet-stream' } = params;

  // 确保存储桶存在
  await ensureBucketExists(bucket);

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('上传文件失败:', error);
    throw new Error(error.message);
  }

  // 获取公开访问 URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * 确保存储桶存在
 */
async function ensureBucketExists(bucketName: string): Promise<void> {
  const { data: bucket, error } = await supabaseAdmin.storage.getBucket(bucketName);

  if (error || !bucket) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760,
    });

    if (createError) {
      throw new Error(`无法创建存储桶 ${bucketName}: ${createError.message}`);
    }
  }
}

/**
 * 从 Supabase Storage 删除文件
 */
export async function deleteFromStorage(bucket: string, fileName: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([fileName]);

  if (error) {
    console.error('删除文件失败:', error);
    throw new Error(error.message);
  }
}

/**
 * 获取文件公开访问 URL
 */
export function getPublicUrl(bucket: string, fileName: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * 创建存储桶（如果不存在）
 */
export async function createBucketIfNotExists(bucketName: string): Promise<void> {
  await ensureBucketExists(bucketName);
}
