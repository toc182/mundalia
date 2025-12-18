/**
 * Sistema de puntuacion centralizado
 * Usado por leaderboard.js y groups.js
 */

const POINTS = {
  GROUP_EXACT_POSITION: 3,    // Posicion exacta en grupo
  GROUP_QUALIFIER: 1,         // Equipo que clasifica (top 2)
  ROUND_OF_32: 1,             // Dieciseisavos (M73-M88)
  ROUND_OF_16: 2,             // Octavos (M89-M96)
  QUARTERFINAL: 4,            // Cuartos (M97-M100)
  SEMIFINAL: 6,               // Semifinal (M101-M102)
  FINALIST: 8,                // Tercer puesto + Final (M103, M104)
  CHAMPION: 15,               // Campeon (M104)
};

/**
 * Obtiene los puntos para un partido de eliminatorias
 * @param {string} matchKey - Clave del partido (ej: 'M73', 'M104')
 * @returns {number} Puntos correspondientes
 */
function getMatchPoints(matchKey) {
  const matchNum = parseInt(matchKey.replace('M', ''));
  if (matchNum >= 73 && matchNum <= 88) return POINTS.ROUND_OF_32;
  if (matchNum >= 89 && matchNum <= 96) return POINTS.ROUND_OF_16;
  if (matchNum >= 97 && matchNum <= 100) return POINTS.QUARTERFINAL;
  if (matchNum >= 101 && matchNum <= 102) return POINTS.SEMIFINAL;
  if (matchNum === 103) return POINTS.FINALIST;
  if (matchNum === 104) return POINTS.CHAMPION;
  return 0;
}

/**
 * Calcula puntos de grupo para una prediccion
 * @param {number} predictedPosition - Posicion predicha (1-4)
 * @param {number} realPosition - Posicion real (1-4)
 * @returns {number} Puntos obtenidos
 */
function getGroupPoints(predictedPosition, realPosition) {
  if (predictedPosition === realPosition) {
    return POINTS.GROUP_EXACT_POSITION;
  }
  if (predictedPosition <= 2 && realPosition <= 2) {
    return POINTS.GROUP_QUALIFIER;
  }
  return 0;
}

module.exports = {
  POINTS,
  getMatchPoints,
  getGroupPoints,
};
