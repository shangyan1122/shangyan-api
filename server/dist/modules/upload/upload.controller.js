"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const coze_coding_dev_sdk_1 = require("coze-coding-dev-sdk");
let UploadController = class UploadController {
    constructor() {
        this.storage = new coze_coding_dev_sdk_1.S3Storage({
            endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
            accessKey: '',
            secretKey: '',
            bucketName: process.env.COZE_BUCKET_NAME,
            region: 'cn-beijing',
        });
    }
    async uploadImage(file) {
        try {
            let fileBuffer;
            if (file.buffer) {
                fileBuffer = file.buffer;
            }
            else if (file.path) {
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                fileBuffer = await fs.readFile(file.path);
            }
            else {
                return {
                    code: 400,
                    msg: '无法获取文件内容',
                    data: null,
                };
            }
            const key = await this.storage.uploadFile({
                fileContent: fileBuffer,
                fileName: `banquets/${Date.now()}_${file.originalname}`,
                contentType: file.mimetype || 'image/jpeg',
            });
            const url = await this.storage.generatePresignedUrl({
                key,
                expireTime: 86400 * 30,
            });
            return {
                code: 200,
                msg: 'success',
                data: {
                    key,
                    url,
                    filename: file.originalname,
                },
            };
        }
        catch (error) {
            console.error('上传图片失败:', error);
            return {
                code: 500,
                msg: '上传失败',
                data: null,
            };
        }
    }
    async uploadPhotos(files) {
        try {
            const uploadPromises = files.map(async (file) => {
                let fileBuffer;
                if (file.buffer) {
                    fileBuffer = file.buffer;
                }
                else if (file.path) {
                    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                    fileBuffer = await fs.readFile(file.path);
                }
                else {
                    throw new Error(`文件 ${file.originalname} 无法读取`);
                }
                const key = await this.storage.uploadFile({
                    fileContent: fileBuffer,
                    fileName: `banquets/${Date.now()}_${file.originalname}`,
                    contentType: file.mimetype || 'image/jpeg',
                });
                const url = await this.storage.generatePresignedUrl({
                    key,
                    expireTime: 86400 * 30,
                });
                return { key, url };
            });
            const results = await Promise.all(uploadPromises);
            return {
                code: 200,
                msg: 'success',
                data: results.map((r) => r.url),
            };
        }
        catch (error) {
            console.error('批量上传照片失败:', error);
            return {
                code: 500,
                msg: '上传失败',
                data: null,
            };
        }
    }
    async getImageUrl(key) {
        try {
            const url = await this.storage.generatePresignedUrl({
                key,
                expireTime: 86400 * 30,
            });
            return {
                code: 200,
                msg: 'success',
                data: { url },
            };
        }
        catch (error) {
            console.error('获取图片URL失败:', error);
            return {
                code: 500,
                msg: '获取失败',
                data: null,
            };
        }
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('photos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('photos', 3)),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadPhotos", null);
__decorate([
    (0, common_1.Get)('url'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "getImageUrl", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [])
], UploadController);
//# sourceMappingURL=upload.controller.js.map