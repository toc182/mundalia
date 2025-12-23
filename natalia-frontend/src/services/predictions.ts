import { predictionsAPI } from './api';
import { AxiosError } from 'axios';

// Type definitions
export interface GroupPrediction {
  group_letter: string;
  team_id: number;
  predicted_position: number;
}

export interface MatchPrediction {
  match_id: number;
  predicted_winner_id: number;
}

export interface SaveResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetPredictionsResult {
  success: boolean;
  groupPredictions: Record<string, number[]>;
  matchPredictions: MatchPrediction[];
  error?: string;
}

/**
 * Guarda predicciones de grupos en el servidor
 * @param predictions - Objeto con grupo como key y array de team IDs como value
 *   Ejemplo: { A: [1, 2, 3, 4], B: [5, 6, 7, 8], ... }
 */
export async function saveGroupPredictions(
  predictions: Record<string, number[]>
): Promise<SaveResult> {
  // Convertir formato del frontend al formato del backend
  // Frontend: { A: [1, 2, 3, 4], B: [5, 6, 7, 8] }
  // Backend: { predictions: [{group_letter, team_id, predicted_position}] }
  const formattedPredictions: GroupPrediction[] = [];

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
    const axiosError = error as AxiosError<{ error?: string }>;
    return {
      success: false,
      error: axiosError.response?.data?.error || 'Error al guardar predicciones',
    };
  }
}

/**
 * Guarda predicción de un partido de eliminatorias
 * @param matchId - ID del partido
 * @param predictedWinnerId - ID del equipo ganador predicho
 */
export async function saveMatchPrediction(
  matchId: number,
  predictedWinnerId: number
): Promise<SaveResult> {
  try {
    const response = await predictionsAPI.saveMatch(matchId, predictedWinnerId);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error saving match prediction:', error);
    const axiosError = error as AxiosError<{ error?: string }>;
    return {
      success: false,
      error: axiosError.response?.data?.error || 'Error al guardar prediccion',
    };
  }
}

/**
 * Obtiene todas las predicciones del usuario actual
 * @returns { groupPredictions, matchPredictions }
 */
export async function getMyPredictions(): Promise<GetPredictionsResult> {
  try {
    const response = await predictionsAPI.getMy();
    const { groupPredictions, matchPredictions } = response.data as {
      groupPredictions: Array<{
        group_letter: string;
        team_id: number;
        predicted_position: number;
      }>;
      matchPredictions: MatchPrediction[];
    };

    // Convertir groupPredictions del formato backend al formato frontend
    // Backend: [{group_letter, team_id, predicted_position, ...}]
    // Frontend: { A: [1, 2, 3, 4], B: [5, 6, 7, 8] }
    const groupsByLetter: Record<string, number[]> = {};

    if (groupPredictions && groupPredictions.length > 0) {
      const tempGroups: Record<string, Array<{ teamId: number; position: number }>> = {};

      groupPredictions.forEach((pred) => {
        if (!tempGroups[pred.group_letter]) {
          tempGroups[pred.group_letter] = [];
        }
        tempGroups[pred.group_letter].push({
          teamId: pred.team_id,
          position: pred.predicted_position,
        });
      });

      // Ordenar por posición y extraer solo los IDs
      for (const group of Object.keys(tempGroups)) {
        groupsByLetter[group] = tempGroups[group]
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
    const axiosError = error as AxiosError<{ error?: string }>;
    return {
      success: false,
      error: axiosError.response?.data?.error || 'Error al obtener predicciones',
      groupPredictions: {},
      matchPredictions: [],
    };
  }
}
