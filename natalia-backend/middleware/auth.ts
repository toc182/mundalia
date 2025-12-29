import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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

// Admin auth verifica el role desde el JWT (sin query a BD)
// El role se incluye en el token al hacer login/register
// Nota: Si se cambia el role de un usuario, debe re-login para que tome efecto
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  auth(req, res, () => {
    const authReq = req as AuthenticatedRequest;

    // Verificar role desde el token
    if (authReq.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin only.' });
      return;
    }

    next();
  });
};

// Optional auth - sets user if token valid, continues anyway if not
const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      (req as AuthenticatedRequest).user = decoded;
    } catch {
      // Token invalid, but we continue anyway - just no user
    }
  }
  next();
};

export { auth, adminAuth, optionalAuth };
