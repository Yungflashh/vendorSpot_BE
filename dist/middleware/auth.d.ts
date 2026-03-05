import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { ApiResponse } from '../types';
export declare const authenticate: (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: UserRole[]) => (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) => void;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map