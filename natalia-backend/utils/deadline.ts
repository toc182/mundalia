import db from '../config/db';

/**
 * Whether predictions are closed (past the global deadline).
 *
 * Single source of truth: the 'predictions_deadline' setting, which the admin panel
 * sets and the public status endpoint / countdown read. Returns false when no
 * deadline is set (predictions always open).
 */
export async function predictionsClosed(): Promise<boolean> {
  const result = await db.query(
    "SELECT value FROM settings WHERE key = 'predictions_deadline'"
  );
  if (result.rows.length === 0) return false; // no deadline set => always open
  const deadlineDate = new Date((result.rows[0] as { value: string }).value);
  return new Date() > deadlineDate;
}

export default predictionsClosed;
