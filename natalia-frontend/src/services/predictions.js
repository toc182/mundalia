import { predictionsAPI } from './api';

/**
 * Guarda predicciones de grupos en el servidor
 * @param {Object} predictions - Objeto con grupo como key y array de team IDs como value
 *   Ejemplo: { A: [1, 2, 3, 4], B: [5, 6, 7, 8], ... }
 */
export async function saveGroupPredictions(predictions) {
  // Convertir formato del frontend al formato del backend
  // Frontend: { A: [1, 2, 3, 4], B: [5, 6, 7, 8] }
  // Backend: { predictions: [{group_letter, team_id, predicted_position}] }
  const formattedPredictions = [];

  for (const [groupLetter, teamIds] of Object.entries(predictions)) {
    teamIds.forEach((teamId, index) => {
      formattedPredictions.push({
        group_letter: groupLetter,
        team_id: teamId,
        predicted_position: index + 1, // 1-indexed position
      });
    });
  }

  try {
    const response = await predictionsAPI.saveGroups({ predictions: formattedPredictions });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error saving group predictions:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Error al guardar predicciones',
    };
  }
}

/**
 * Guarda predicción de un partido de eliminatorias
 * @param {number} matchId - ID del partido
 * @param {number} predictedWinnerId - ID del equipo ganador predicho
 */
export async function saveMatchPrediction(matchId, predictedWinnerId) {
  try {
    const response = await predictionsAPI.saveMatch(matchId, predictedWinnerId);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error saving match prediction:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Error al guardar prediccion',
    };
  }
}

/**
 * Obtiene todas las predicciones del usuario actual
 * @returns {Object} { groupPredictions, matchPredictions }
 */
export async function getMyPredictions() {
  try {
    const response = await predictionsAPI.getMy();
    const { groupPredictions, matchPredictions } = response.data;

    // Convertir groupPredictions del formato backend al formato frontend
    // Backend: [{group_letter, team_id, predicted_position, ...}]
    // Frontend: { A: [1, 2, 3, 4], B: [5, 6, 7, 8] }
    const groupsByLetter = {};

    if (groupPredictions && groupPredictions.length > 0) {
      groupPredictions.forEach((pred) => {
        if (!groupsByLetter[pred.group_letter]) {
          groupsByLetter[pred.group_letter] = [];
        }
        groupsByLetter[pred.group_letter].push({
          teamId: pred.team_id,
          position: pred.predicted_position,
        });
      });

      // Ordenar por posición y extraer solo los IDs
      for (const group of Object.keys(groupsByLetter)) {
        groupsByLetter[group] = groupsByLetter[group]
          .sort((a, b) => a.position - b.position)
          .map((item) => item.teamId);
      }
    }

    return {
      success: true,
      groupPredictions: groupsByLetter,
      matchPredictions: matchPredictions || [],
    };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Error al obtener predicciones',
      groupPredictions: {},
      matchPredictions: [],
    };
  }
}
