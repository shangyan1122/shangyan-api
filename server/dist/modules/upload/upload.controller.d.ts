export declare class UploadController {
    private storage;
    constructor();
    uploadImage(file: any): Promise<{
        code: number;
        msg: string;
        data: null;
    } | {
        code: number;
        msg: string;
        data: {
            key: string;
            url: string;
            filename: any;
        };
    }>;
    uploadPhotos(files: any[]): Promise<{
        code: number;
        msg: string;
        data: string[];
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
    getImageUrl(key: string): Promise<{
        code: number;
        msg: string;
        data: {
            url: string;
        };
    } | {
        code: number;
        msg: string;
        data: null;
    }>;
}
