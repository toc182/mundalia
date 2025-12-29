/**
 * Predictions by Exact Scores Page
 * User enters exact match scores for all 72 group stage matches
 * System calculates standings automatically using FIFA tiebreaker rules
 */

import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import GroupScoreInput from '../components/GroupScoreInput';
import TiebreakerModal from '../components/TiebreakerModal';
import { ALL_GROUPS } from '../data/groupMatches';
import { usePredictionsScores } from '../hooks/usePredictionsScores';
import type { UnresolvableTieWithGroup } from '../types/predictionsScores';

export default function PredictionsScores(): JSX.Element {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const {
    scores,
    saving,
    error,
    loading,
    showTiebreakerModal,
    currentTiebreaker,
    showConfirmModal,
    incompleteGroups,
    groupStandings,
    unresolvableTies,
    allGroupsComplete,
    thirdPlaceInfo,
    totalCompleted,
    getGroupTeams,
    handleScoreChange,
    handleTiebreakerResolve,
    openTiebreakerModal,
    closeTiebreakerModal,
    handleSave,
    handleResetGroup,
    handleFillRandom,
    handleContinue,
    handleConfirmContinue,
    handleBack,
    setShowConfirmModal,
  } = usePredictionsScores(setId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Fase de Grupos - Marcadores</h1>
          <p className="text-muted-foreground">
            Ingresa los marcadores de los 72 partidos. Las tablas se calculan automaticamente.
          </p>
          <div className="mt-2 text-sm">
            <span className="font-medium">{totalCompleted}/72</span> partidos completados
          </div>
        </div>

        {/* Top navigation buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atras
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFillRandom}
              disabled={saving}
              title="Rellenar con scores aleatorios (para pruebas)"
            >
              Random
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>

            <Button
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Siguiente'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Unresolvable ties warning */}
        {unresolvableTies.length > 0 && (
          <Alert className="mb-4 border-yellow-400 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Hay {unresolvableTies.length} grupo(s) con empates que requieren tu decision.
            </AlertDescription>
          </Alert>
        )}

        {/* Third place validation - only show error, not success */}
        {allGroupsComplete && !thirdPlaceInfo.valid && (
          <Alert className="mb-4 border-red-400 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {thirdPlaceInfo.reason}
            </AlertDescription>
          </Alert>
        )}

        {/* Groups grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {ALL_GROUPS.map(group => {
            const teams = getGroupTeams(group);
            const groupResult = groupStandings[group];
            const isIncomplete = incompleteGroups.includes(group);

            return (
              <GroupScoreInput
                key={group}
                group={group}
                teams={teams}
                scores={scores[group] || {}}
                standings={groupResult?.standings}
                isComplete={groupResult?.isComplete}
                isIncomplete={isIncomplete}
                unresolvableTie={groupResult?.unresolvableTie}
                onScoreChange={(matchNum, a, b) => handleScoreChange(group, matchNum, a, b)}
                onResolveTie={() => openTiebreakerModal({ group, ...groupResult?.unresolvableTie } as UnresolvableTieWithGroup)}
                onReset={() => handleResetGroup(group)}
              />
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Atras
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>

            <Button
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Siguiente'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tiebreaker Modal */}
      {showTiebreakerModal && currentTiebreaker && (
        <TiebreakerModal
          tie={currentTiebreaker}
          onResolve={handleTiebreakerResolve}
          onClose={closeTiebreakerModal}
        />
      )}

      {/* Confirmation Modal for Group Changes */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios en la Fase de Grupos</DialogTitle>
            <DialogDescription>
              Has realizado cambios en la fase de grupos. Si decides continuar, se reseteara el bracket de eliminatorias y tendras que completarlo nuevamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmContinue}
            >
              Continuar y Resetear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
