import express, { Request, Response, Router } from 'express';
import db from '../config/db';
import { success, serverError } from '../utils/response';

const router: Router = express.Router();

interface SettingsRow {
  key: string;
  value: string;
}

interface PredictionStatus {
  isOpen: boolean;
  deadline: string | null;
  message: string;
}

// Public endpoint - check if predictions are open
router.get('/predictions-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      "SELECT value FROM settings WHERE key = 'predictions_deadline'"
    );

    if (result.rows.length === 0) {
      // No deadline set - predictions always open
      const status: PredictionStatus = {
        isOpen: true,
        deadline: null,
        message: 'Las predicciones estan abiertas'
      };
      success(res, status);
      return;
    }

    const deadline = (result.rows[0] as SettingsRow).value;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const isOpen = now < deadlineDate;

    const status: PredictionStatus = {
      isOpen,
      deadline,
      message: isOpen
        ? `Las predicciones cierran el ${deadlineDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`
        : 'Las predicciones estan cerradas'
    };

    success(res, status);
  } catch (err) {
    console.error('Error checking prediction status:', err);
    serverError(res, err as Error);
  }
});

// Public endpoint - get available prediction modes
router.get('/prediction-modes', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      "SELECT value FROM settings WHERE key = 'prediction_modes'"
    );

    if (result.rows.length === 0) {
      // No setting - default to both modes available
      success(res, { modes: 'both' });
      return;
    }

    const modes = (result.rows[0] as SettingsRow).value;
    success(res, { modes });
  } catch (err) {
    console.error('Error getting prediction modes:', err);
    serverError(res, err as Error);
  }
});

export default router;
