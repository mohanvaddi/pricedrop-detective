import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../../config';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
