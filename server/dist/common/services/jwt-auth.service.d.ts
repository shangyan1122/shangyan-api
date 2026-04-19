import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
export declare class JwtAuthService {
    private readonly jwtService;
    private readonly logger;
    private tokenBlacklist;
    constructor(jwtService: JwtService);
    generateAccessToken(payload: {
        openid: string;
        nickname?: string;
    }): string;
    generateRefreshToken(payload: {
        openid: string;
    }): string;
    verifyToken(token: string): {
        openid: string;
        nickname?: string;
    };
    decodeToken(token: string): any;
    revokeToken(token: string): void;
    private cleanupBlacklist;
    extractTokenFromRequest(request: Request): string | null;
    authenticate(request: Request): {
        openid: string;
        nickname?: string;
    } | null;
    generateTokenPair(payload: {
        openid: string;
        nickname?: string;
    }): {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    refreshAccessToken(refreshToken: string): {
        accessToken: string;
        expiresIn: number;
    } | null;
}
