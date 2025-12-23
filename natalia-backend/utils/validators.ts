/**
 * Validadores de entrada para prevenir datos malformados
 */

// Match keys validos: M1-M104 (todos los partidos del mundial)
export const VALID_MATCH_PATTERN = /^M([1-9]|[1-9][0-9]|10[0-4])$/;

// Grupos validos: A-L (12 grupos)
export const VALID_GROUP_PATTERN = /^[A-L]$/;

// Playoff IDs validos (mayúsculas para coincidir con frontend)
export const VALID_PLAYOFF_IDS = ['UEFA_A', 'UEFA_B', 'UEFA_C', 'UEFA_D', 'FIFA_1', 'FIFA_2'] as const;

export type PlayoffIdType = typeof VALID_PLAYOFF_IDS[number];

/**
 * Valida que un match_key sea valido (M1-M104)
 */
export function isValidMatchKey(matchKey: unknown): matchKey is string {
  if (typeof matchKey !== 'string') return false;
  return VALID_MATCH_PATTERN.test(matchKey);
}

/**
 * Valida que un group_letter sea valido (A-L)
 */
export function isValidGroupLetter(groupLetter: unknown): groupLetter is string {
  if (typeof groupLetter !== 'string') return false;
  return VALID_GROUP_PATTERN.test(groupLetter);
}

/**
 * Valida que un team_id sea un entero positivo
 */
export function isValidTeamId(teamId: unknown): boolean {
  const id = parseInt(String(teamId), 10);
  return Number.isInteger(id) && id > 0;
}

/**
 * Valida que un playoff_id sea valido
 */
export function isValidPlayoffId(playoffId: unknown): playoffId is PlayoffIdType {
  if (typeof playoffId !== 'string') return false;
  return (VALID_PLAYOFF_IDS as readonly string[]).includes(playoffId);
}

/**
 * Valida que un match_index sea valido (0-5 para grupos)
 */
export function isValidMatchIndex(matchIndex: unknown): boolean {
  const idx = parseInt(String(matchIndex), 10);
  return Number.isInteger(idx) && idx >= 0 && idx <= 5;
}

/**
 * Valida que una posicion predicha sea valida (1-4 para grupos)
 */
export function isValidPosition(position: unknown): boolean {
  const pos = parseInt(String(position), 10);
  return Number.isInteger(pos) && pos >= 1 && pos <= 4;
}

/**
 * Sanitiza un string para prevenir caracteres especiales
 */
export function sanitizeString(str: unknown, maxLength: number = 100): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}
