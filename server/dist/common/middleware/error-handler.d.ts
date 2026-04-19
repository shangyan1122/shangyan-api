import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class ErrorMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
    timestamp?: string;
}
export declare function success<T>(data: T, msg?: string): ApiResponse<T>;
export declare function error(msg: string, code?: number): ApiResponse<null>;
export interface PaginatedData<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export declare function paginated<T>(items: T[], total: number, page: number, pageSize: number): ApiResponse<PaginatedData<T>>;
