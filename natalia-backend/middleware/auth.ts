import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db';
import { JwtPayload, AuthenticatedRequest } from '../types';

const auth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Admin auth verifica el role en la BD para cada request
// Esto previene que usuarios degradados mantengan acceso admin
const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  auth(req, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      // Verificar role actual en BD (no confiar solo en JWT)
      const result = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [authReq.user.id]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'User not found.' });
        return;
      }

      const currentRole = result.rows[0].role as string;
      if (currentRole !== 'admin') {
        res.status(403).json({ error: 'Access denied. Admin only.' });
        return;
      }

      // Actualizar req.user con role actual de BD
      authReq.user.role = currentRole;
      next();
    } catch (err) {
      const error = err as Error;
      console.error('[ADMIN AUTH] Error checking role:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
};

export { auth, adminAuth };
