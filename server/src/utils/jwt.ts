import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserRole } from '../models/CompanyMembership.js';

export interface TokenPayload {
  userId: string;
  companyId?: string;
  role?: UserRole;
  membershipId?: string;
}

export class JWTUtil {
  static signAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: ENV.ACCESS_TOKEN_EXPIRES_IN as any,
    };
    return jwt.sign(payload, ENV.JWT_ACCESS_SECRET as Secret, options);
  }

  static signRefreshToken(payload: { userId: string }): string {
    const options: SignOptions = {
      expiresIn: ENV.REFRESH_TOKEN_EXPIRES_IN as any,
    };
    return jwt.sign(payload, ENV.JWT_REFRESH_SECRET as Secret, options);
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, ENV.JWT_ACCESS_SECRET as Secret) as TokenPayload;
  }

  static verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET as Secret) as { userId: string };
  }
}
