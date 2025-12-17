/**
 * Validadores de entrada para prevenir datos malformados
 */

// Match keys validos: M1-M104 (todos los partidos del mundial)
const VALID_MATCH_PATTERN = /^M([1-9]|[1-9][0-9]|10[0-4])$/;

// Grupos validos: A-L (12 grupos)
const VALID_GROUP_PATTERN = /^[A-L]$/;

// Playoff IDs validos
const VALID_PLAYOFF_IDS = ['uefa_a', 'uefa_b', 'uefa_c', 'uefa_d', 'fifa_1', 'fifa_2'];

/**
 * Valida que un match_key sea valido (M1-M104)
 */
function isValidMatchKey(matchKey) {
  if (typeof matchKey !== 'string') return false;
  return VALID_MATCH_PATTERN.test(matchKey);
}

/**
 * Valida que un group_letter sea valido (A-L)
 */
function isValidGroupLetter(groupLetter) {
  if (typeof groupLetter !== 'string') return false;
  return VALID_GROUP_PATTERN.test(groupLetter);
}

/**
 * Valida que un team_id sea un entero positivo
 */
function isValidTeamId(teamId) {
  const id = parseInt(teamId, 10);
  return Number.isInteger(id) && id > 0;
}

/**
 * Valida que un playoff_id sea valido
 */
function isValidPlayoffId(playoffId) {
  if (typeof playoffId !== 'string') return false;
  return VALID_PLAYOFF_IDS.includes(playoffId);
}

/**
 * Valida que un match_index sea valido (0-5 para grupos)
 */
function isValidMatchIndex(matchIndex) {
  const idx = parseInt(matchIndex, 10);
  return Number.isInteger(idx) && idx >= 0 && idx <= 5;
}

/**
 * Valida que una posicion predicha sea valida (1-4 para grupos)
 */
function isValidPosition(position) {
  const pos = parseInt(position, 10);
  return Number.isInteger(pos) && pos >= 1 && pos <= 4;
}

/**
 * Sanitiza un string para prevenir caracteres especiales
 */
function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

module.exports = {
  isValidMatchKey,
  isValidGroupLetter,
  isValidTeamId,
  isValidPlayoffId,
  isValidMatchIndex,
  isValidPosition,
  sanitizeString,
  VALID_MATCH_PATTERN,
  VALID_GROUP_PATTERN,
  VALID_PLAYOFF_IDS,
};
