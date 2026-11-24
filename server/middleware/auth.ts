import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAdminAuth } from '../config/firebaseAdmin.ts';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication required. Empty token.' });
      return;
    }

    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid or expired authentication token.';
    res.status(401).json({ error: 'Unauthorized', details: message });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const isBootstrappedAdmin =
    req.user.email === 'anikasaida5@gmail.com' && req.user.email_verified === true;
  const hasAdminClaim = req.user.admin === true || req.user.role === 'ADMIN';

  if (!isBootstrappedAdmin && !hasAdminClaim) {
    res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
    return;
  }

  next();
}
