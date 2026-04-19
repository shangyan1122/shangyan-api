"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeStorageBuckets = initializeStorageBuckets;
exports.uploadToStorage = uploadToStorage;
exports.deleteFromStorage = deleteFromStorage;
exports.getPublicUrl = getPublicUrl;
exports.createBucketIfNotExists = createBucketIfNotExists;
const supabase_client_1 = require("./database/supabase-client");
const supabase = (0, supabase_client_1.getSupabaseClient)();
const REQUIRED_BUCKETS = ['exports', 'banquets', 'avatars', 'gifts'];
async function initializeStorageBuckets() {
    console.log('正在初始化存储桶...');
    for (const bucketName of REQUIRED_BUCKETS) {
        try {
            const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName);
            if (getError || !bucket) {
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
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
                if (createError) {
                    console.error(`创建存储桶 ${bucketName} 失败:`, createError.message);
                }
                else {
                    console.log(`存储桶 ${bucketName} 创建成功`);
                }
            }
            else {
                console.log(`存储桶 ${bucketName} 已存在`);
            }
        }
        catch (error) {
            console.error(`初始化存储桶 ${bucketName} 异常:`, error);
        }
    }
}
async function uploadToStorage(params) {
    const { bucket, fileName, file, contentType = 'application/octet-stream' } = params;
    await ensureBucketExists(bucket);
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
        contentType,
        upsert: true,
    });
    if (error) {
        console.error('上传文件失败:', error);
        throw new Error(error.message);
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
}
async function ensureBucketExists(bucketName) {
    const { data: bucket, error } = await supabase.storage.getBucket(bucketName);
    if (error || !bucket) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 10485760,
        });
        if (createError) {
            throw new Error(`无法创建存储桶 ${bucketName}: ${createError.message}`);
        }
    }
}
async function deleteFromStorage(bucket, fileName) {
    const { error } = await supabase.storage.from(bucket).remove([fileName]);
    if (error) {
        console.error('删除文件失败:', error);
        throw new Error(error.message);
    }
}
function getPublicUrl(bucket, fileName) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
}
async function createBucketIfNotExists(bucketName) {
    await ensureBucketExists(bucketName);
}
//# sourceMappingURL=index.js.map