import jwt from 'jsonwebtoken';
import cfg from '@config/index';
import type { AuthUser } from '../types/auth.types';

const { jwtSecret, jwtExpiresIn } = cfg.security;

export interface AuthTokenPayload {
  sub: string;        
  email: string;
  name?: string | null;
}

export function signAuthToken(user: AuthUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn as any,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, jwtSecret) as AuthTokenPayload;
}
