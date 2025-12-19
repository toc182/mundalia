import express, { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../config/db';
import { auth } from '../middleware/auth';
import { success, error, notFound, serverError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const router: Router = express.Router();

// Rate limiter para check-username (prevenir enumeración)
const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 checks por minuto
  message: { success: false, error: 'Demasiadas consultas. Intenta de nuevo en 1 minuto.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

interface UserRow {
  id: number;
  email: string;
  name: string;
  username?: string;
  role: string;
  country?: string;
  birth_date?: string;
  created_at: Date;
}

interface UpdateProfileBody {
  name?: string;
  username?: string;
  country?: string;
  birth_date?: string;
}

// Get current user
router.get('/me', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await db.query(
      'SELECT id, email, name, username, role, country, birth_date, created_at FROM users WHERE id = $1',
      [authReq.user.id]
    );

    if (result.rows.length === 0) {
      notFound(res, 'User not found');
      return;
    }

    success(res, result.rows[0] as UserRow);
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Check if username is available
router.get('/check-username/:username', checkUsernameLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      success(res, { available: false, reason: 'invalid' });
      return;
    }

    const result = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    success(res, { available: result.rows.length === 0 });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Update user profile
router.put('/me', auth, async (req: Request<unknown, unknown, UpdateProfileBody>, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const { name, username, country, birth_date } = req.body;

  try {
    // If username is being set/changed, validate it
    if (username) {
      // Validate format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        error(res, 'Username debe tener 3-20 caracteres (letras, números, _)', 400, 'INVALID_USERNAME');
        return;
      }

      // Check if taken by another user
      const existing = await db.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username, authReq.user.id]
      );

      if (existing.rows.length > 0) {
        error(res, 'Ese username ya está en uso', 400, 'USERNAME_TAKEN');
        return;
      }
    }

    const result = await db.query(
      `UPDATE users
       SET name = $1, username = $2, country = $3, birth_date = $4
       WHERE id = $5
       RETURNING id, email, name, username, role, country, birth_date, created_at`,
      [name, username || null, country || null, birth_date || null, authReq.user.id]
    );

    success(res, result.rows[0] as UserRow);
  } catch (err) {
    serverError(res, err as Error);
  }
});

export default router;
