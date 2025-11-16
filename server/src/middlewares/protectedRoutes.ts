import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../utils/jwt.util';
import type { AuthTokenPayload } from '../utils/jwt.util';

declare module 'express' {
  interface Request {
    authUser?: AuthTokenPayload;
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = header.substring('Bearer '.length).trim();

  try {
    const payload = verifyAuthToken(token);
    req.authUser = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
