const { createClient } = require('@supabase/supabase-js');

// 从环境变量或代码默认值中获取凭证
const url = process.env.SUPABASE_URL || 'https://qrkwbbphskndxzkfsfep.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya3diYnBoc2tuZHh6a2ZzZmVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI4NDg0OCwiZXhwIjoxMDkwODYwODQ4fQ.ARIUCnl7VF3z6UugczoptN-TThOoocikAXXeh0r_Iq8';

const supabaseAdmin = createClient(url, serviceKey);

const buckets = ['exports', 'banquets', 'avatars', 'gifts'];

async function createBuckets() {
  console.log('开始创建存储桶...');
  console.log(`Supabase URL: ${url}`);
  
  for (const bucketName of buckets) {
    try {
      // 先检查是否存在
      const { data: existingBucket, error: getError } = await supabaseAdmin.storage.getBucket(bucketName);
      
      if (getError || !existingBucket) {
        console.log(`存储桶 ${bucketName} 不存在，正在创建...`);
        
        const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
          ],
        });
        
        if (error) {
          console.error(`❌ 创建存储桶 ${bucketName} 失败:`, error.message);
        } else {
          console.log(`✅ 存储桶 ${bucketName} 创建成功`);
        }
      } else {
        console.log(`✓ 存储桶 ${bucketName} 已存在`);
      }
    } catch (err) {
      console.error(`❌ 处理存储桶 ${bucketName} 异常:`, err.message);
    }
  }
}

createBuckets()
  .then(() => {
    console.log('存储桶创建流程完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('创建存储桶失败:', err);
    process.exit(1);
  });
