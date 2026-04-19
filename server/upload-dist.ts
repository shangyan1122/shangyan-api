import { S3Storage } from "coze-coding-dev-sdk";
import * as fs from "fs";
import * as path from "path";

async function uploadDist() {
  const storage = new S3Storage({
    endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
    accessKey: "",
    secretKey: "",
    bucketName: process.env.COZE_BUCKET_NAME,
    region: "cn-beijing",
  });

  // 读取打包文件
  const filePath = path.join(__dirname, "../dist-weapp.tar.gz");
  const fileContent = fs.readFileSync(filePath);

  console.log("正在上传 dist-weapp.tar.gz...");

  // 上传文件
  const key = await storage.uploadFile({
    fileContent,
    fileName: "dist-weapp.tar.gz",
    contentType: "application/gzip",
  });

  console.log("上传成功，key:", key);

  // 生成下载链接（有效期7天）
  const downloadUrl = await storage.generatePresignedUrl({
    key,
    expireTime: 7 * 24 * 60 * 60, // 7天
  });

  console.log("\n========================================");
  console.log("下载链接（有效期7天）：");
  console.log(downloadUrl);
  console.log("========================================\n");
}

uploadDist().catch(console.error);
