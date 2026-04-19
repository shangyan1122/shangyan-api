export interface UploadParams {
    bucket: string;
    fileName: string;
    file: Buffer;
    contentType?: string;
}
export declare function initializeStorageBuckets(): Promise<void>;
export declare function uploadToStorage(params: UploadParams): Promise<string>;
export declare function deleteFromStorage(bucket: string, fileName: string): Promise<void>;
export declare function getPublicUrl(bucket: string, fileName: string): string;
export declare function createBucketIfNotExists(bucketName: string): Promise<void>;
