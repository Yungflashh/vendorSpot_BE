import { Types } from 'mongoose';
import { UserRole } from '../types';
export interface TokenPayload {
    id: string;
    email: string;
    role: UserRole;
}
export declare const generateAccessToken: (payload: TokenPayload) => string;
export declare const generateRefreshToken: (payload: TokenPayload) => string;
export declare const verifyAccessToken: (token: string) => TokenPayload;
export declare const verifyRefreshToken: (token: string) => TokenPayload;
export declare const generateTokens: (userId: Types.ObjectId, email: string, role: UserRole) => {
    accessToken: string;
    refreshToken: string;
};
//# sourceMappingURL=jwt.d.ts.map