export declare function initSentry(): boolean;
export declare function captureException(error: Error, context?: Record<string, any>): void;
export declare function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void;
export declare function setUserContext(user: {
    id: string;
    openid: string;
    role?: string;
}): void;
export declare function clearUserContext(): void;
