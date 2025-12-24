import express, { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult, ValidationError } from 'express-validator';
// google-auth-library no longer needed - using fetch to userinfo endpoint
import rateLimit from 'express-rate-limit';
import db from '../config/db';
import { success, created, validationError, error, serverError } from '../utils/response';
import { UserRow } from '../types';

const router: Router = express.Router();

// Rate limiters para prevenir brute force y spam
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana
  message: { success: false, error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora por IP
  message: { success: false, error: 'Demasiados registros. Intenta de nuevo en 1 hora.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  message: { success: false, error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validación de password fuerte
const passwordValidator = body('password')
  .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
  .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una mayúscula')
  .matches(/[a-z]/).withMessage('La contraseña debe tener al menos una minúscula')
  .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número');

interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface GoogleAuthBody {
  access_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Register
router.post('/register', registerLimiter, [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  passwordValidator,
  body('name').trim().notEmpty().withMessage('El nombre es requerido')
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationError(res, errors.array().map((e: ValidationError) => e.msg as string));
    return;
  }

  const { email, password, name } = req.body as RegisterBody;

  try {
    // Check if user exists
    const userExists = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      error(res, 'Email already registered', 400, 'EMAIL_EXISTS');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [email, hashedPassword, name]
    );

    const user = result.rows[0] as UserRow;

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    created(res, { user, token });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Login
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    validationError(res, errors.array().map((e: ValidationError) => e.msg as string));
    return;
  }

  const { email, password } = req.body as LoginBody;

  try {
    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      error(res, 'Invalid credentials', 400, 'INVALID_CREDENTIALS');
      return;
    }

    const user = result.rows[0] as UserRow;

    // Check if user has a password (Google OAuth users may not)
    if (!user.password) {
      error(res, 'This account uses Google login. Please sign in with Google.', 400, 'USE_GOOGLE_LOGIN');
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      error(res, 'Invalid credentials', 400, 'INVALID_CREDENTIALS');
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    success(res, {
      user: { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role },
      token
    });
  } catch (err) {
    serverError(res, err as Error);
  }
});

// Google OAuth Login/Register
router.post('/google', googleAuthLimiter, async (req: Request<unknown, unknown, GoogleAuthBody>, res: Response): Promise<void> => {
  const { access_token } = req.body;

  if (!access_token) {
    error(res, 'No access_token provided', 400, 'MISSING_TOKEN');
    return;
  }

  try {
    // Verify access_token by calling Google's userinfo endpoint
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userInfoResponse.ok) {
      error(res, 'Invalid Google token', 401, 'INVALID_TOKEN');
      return;
    }

    const userInfo = await userInfoResponse.json() as GoogleUserInfo;
    const { sub: googleId, email, name } = userInfo;

    // Check if user exists by google_id
    let result = await db.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );

    let user: UserRow;

    if (result.rows.length > 0) {
      // User exists with this Google ID
      user = result.rows[0] as UserRow;
    } else {
      // Check if user exists by email (might have registered with email/password before)
      result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length > 0) {
        // Link Google account to existing user
        user = result.rows[0] as UserRow;
        await db.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
      } else {
        // Create new user
        result = await db.query(
          'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name, role',
          [email, name, googleId]
        );
        user = result.rows[0] as UserRow;
      }
    }

    // Fetch full user data including created_at
    const fullUser = await db.query(
      'SELECT id, email, name, username, role, country, birth_date, created_at FROM users WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    success(res, {
      user: fullUser.rows[0] as UserRow,
      token
    });
  } catch (err) {
    console.error('[GOOGLE AUTH] Error:', err);
    error(res, 'Invalid Google token', 401, 'INVALID_TOKEN');
  }
});

// Google OAuth Redirect Flow (server-side, no client-side errors)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = isProduction ? 'https://mundalia.vercel.app' : 'http://localhost:5174';
const BACKEND_URL = isProduction ? 'https://mundalia-production.up.railway.app' : 'http://localhost:5001';
const GOOGLE_REDIRECT_URI = `${BACKEND_URL}/api/auth/google/callback`;

// Step 1: Redirect to Google OAuth
router.get('/google/redirect', (_req: Request, res: Response): void => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID || '',
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Step 2: Handle callback from Google
router.get('/google/callback', googleAuthLimiter, async (req: Request, res: Response): Promise<void> => {
  const { code, error: googleError } = req.query;

  if (googleError || !code) {
    res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    return;
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      console.error('[GOOGLE CALLBACK] Token exchange failed');
      res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
      return;
    }

    const tokens = await tokenResponse.json() as { access_token: string };

    // Get user info with access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userInfoResponse.ok) {
      console.error('[GOOGLE CALLBACK] User info fetch failed');
      res.redirect(`${FRONTEND_URL}/login?error=userinfo_failed`);
      return;
    }

    const userInfo = await userInfoResponse.json() as GoogleUserInfo;
    const { sub: googleId, email, name } = userInfo;

    // Find or create user
    let result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user: UserRow;

    if (result.rows.length > 0) {
      user = result.rows[0] as UserRow;
    } else {
      result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length > 0) {
        user = result.rows[0] as UserRow;
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
      } else {
        result = await db.query(
          'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name, role',
          [email, name, googleId]
        );
        user = result.rows[0] as UserRow;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('[GOOGLE CALLBACK] Error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
});

export default router;
