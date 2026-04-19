import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
export declare class SentryFilter extends BaseExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
    private sanitizeBody;
    private sanitizeHeaders;
}
