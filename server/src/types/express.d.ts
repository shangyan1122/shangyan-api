import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        phone: string;
        role: string;
      };
    }
  }
}

export {};
