import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class AuthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
declare module 'express' {
    interface Request {
        user?: {
            openid: string;
            nickname?: string;
            avatar?: string;
        };
    }
}
