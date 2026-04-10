import { predictionSetsAPI, predictionsAPI, groupsAPI } from '@/services/api';

export async function claimGuestPredictions(): Promise<string | null> {
  try {
    const predictions = localStorage.getItem('natalia_predictions');
    const thirdPlaces = localStorage.getItem('natalia_best_third_places');
    const knockout = localStorage.getItem('natalia_knockout');

    if (!predictions) return null;

    // Create prediction set
    const setResponse = await predictionSetsAPI.create('Mi Prediccion', 'positions');
    const setId = setResponse.data.public_id;

    // Save groups
    const groupPredictions = JSON.parse(predictions);
    const predictionsArray: Array<{ group_letter: string; team_id: number; predicted_position: number }> = [];
    Object.entries(groupPredictions).forEach(([groupLetter, teamIds]) => {
      (teamIds as number[]).forEach((teamId, index) => {
        predictionsArray.push({
          group_letter: groupLetter,
          team_id: teamId,
          predicted_position: index + 1,
        });
      });
    });
    await predictionsAPI.saveGroups(predictionsArray, setId);

    // Save third places
    if (thirdPlaces) {
      const groups = JSON.parse(thirdPlaces) as string[];
      if (groups.length === 8) {
        await predictionsAPI.saveThirdPlaces(groups.join(''), setId);
      }
    }

    // Save knockout
    if (knockout) {
      const knockoutData = JSON.parse(knockout);
      if (Object.keys(knockoutData).length > 0) {
        await predictionsAPI.saveKnockout(knockoutData, setId);
      }
    }

    // Join group if invite code exists
    const groupCode = localStorage.getItem('guest_group_code');
    if (groupCode) {
      try {
        await groupsAPI.join(groupCode);
      } catch {
        console.error('Failed to join group:', groupCode);
      }
    }

    // Clear guest data
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    localStorage.removeItem('guest_pending_claim');
    localStorage.removeItem('natalia_predictions');
    localStorage.removeItem('natalia_best_third_places');
    localStorage.removeItem('natalia_knockout');
    localStorage.removeItem('natalia_knockout_scores');

    return setId;
  } catch (err) {
    console.error('Error claiming guest predictions:', err);
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_group_code');
    localStorage.removeItem('guest_pending_claim');
    return null;
  }
}
