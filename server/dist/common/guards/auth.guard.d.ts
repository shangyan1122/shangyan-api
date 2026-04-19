import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
export interface JwtAuthServiceInterface {
    authenticate(request: Request): {
        openid: string;
        nickname?: string;
    } | null;
}
export declare class AuthGuard implements CanActivate {
    private reflector;
    private jwtAuthService;
    private readonly logger;
    constructor(reflector: Reflector, jwtAuthService: JwtAuthServiceInterface);
    canActivate(context: ExecutionContext): boolean;
    private authenticate;
    private extractOpenidLegacy;
    private isValidOpenid;
}
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireAuth: () => <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
