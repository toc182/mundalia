import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';
import { playoffs } from '@/data/playoffsData';
import { predictionsAPI, predictionSetsAPI } from '@/services/api';

export default function Playoffs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [selections, setSelections] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [predictionMode, setPredictionMode] = useState('positions'); // 'positions' | 'scores'

  // Snapshot for change detection
  const originalSelectionsRef = useRef(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [subsequentData, setSubsequentData] = useState({ hasGroups: false, hasThirds: false, hasKnockout: false });

  // Compare current selections with original to detect real changes
  const hasRealChanges = () => {
    if (!originalSelectionsRef.current) return false;
    const original = originalSelectionsRef.current;
    const current = selections;

    // Compare each playoff's final winner (that's what matters for downstream)
    for (const playoffId of Object.keys({ ...original, ...current })) {
      const origFinal = original[playoffId]?.final;
      const currFinal = current[playoffId]?.final;
      if (origFinal !== currFinal) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const loadSelections = async () => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Load playoffs and prediction set info in parallel
          const [playoffsRes, setInfoRes] = await Promise.all([
            predictionsAPI.getPlayoffs(setId),
            predictionSetsAPI.getById(setId),
          ]);

          if (playoffsRes.data && Object.keys(playoffsRes.data).length > 0) {
            setSelections(playoffsRes.data);
            // Save snapshot of original selections
            originalSelectionsRef.current = JSON.parse(JSON.stringify(playoffsRes.data));
          } else {
            originalSelectionsRef.current = {};
          }

          // Set prediction mode from the prediction set
          if (setInfoRes.data?.mode) {
            setPredictionMode(setInfoRes.data.mode);
          }
        } catch (err) {
          // Error de servidor, empezar en blanco
          console.error('[PLAYOFFS] Error loading playoffs:', err);
          originalSelectionsRef.current = {};
        }
      } else {
        // Sin setId: comportamiento legacy con localStorage
        const savedSelections = localStorage.getItem('natalia_playoffs');
        if (savedSelections) {
          const parsed = JSON.parse(savedSelections);
          setSelections(parsed);
          originalSelectionsRef.current = JSON.parse(JSON.stringify(parsed));
        } else {
          originalSelectionsRef.current = {};
        }
      }
    };
    loadSelections();
  }, [setId]);

  const selectWinner = (playoffId, round, winnerId) => {
    setSelections(prev => {
      const playoffSelections = prev[playoffId] || {};

      // Si cambia el ganador de una semi, limpiar la final
      if (round.startsWith('semi')) {
        return {
          ...prev,
          [playoffId]: {
            ...playoffSelections,
            [round]: winnerId,
            final: playoffSelections.final === winnerId ? winnerId : undefined
          }
        };
      }

      return {
        ...prev,
        [playoffId]: {
          ...playoffSelections,
          [round]: winnerId
        }
      };
    });
    setSaved(false);
  };

  // Check if all playoffs are complete
  const isComplete = () => {
    return playoffs.every(playoff => {
      const sel = selections[playoff.id];
      if (!sel?.final) return false;
      return true;
    });
  };

  const handleContinue = async () => {

    // Check if there are real changes
    const changesDetected = hasRealChanges();

    // If there are changes and we have a setId, check for subsequent data
    if (changesDetected && setId) {
      try {
        const response = await predictionsAPI.hasSubsequentData(setId, 'playoffs');
        const { hasGroups, hasThirds, hasKnockout } = response.data;

        if (hasGroups || hasThirds || hasKnockout) {
          // Show warning modal
          setSubsequentData({ hasGroups, hasThirds, hasKnockout });
          setShowResetWarning(true);
          return;
        }
      } catch (err) {
        console.error('[PLAYOFFS] Error checking subsequent data:', err);
        // Continue anyway if check fails
      }
    }

    // No changes or no subsequent data - proceed normally
    await saveAndNavigate();
  };

  const saveAndNavigate = async (resetFirst = false) => {
    setSaving(true);
    setError(null);
    setShowResetWarning(false);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_playoffs', JSON.stringify(selections));

    // Navigate to correct page based on prediction mode
    const groupsPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/grupos';
    const nextUrl = setId ? `${groupsPage}?setId=${setId}` : groupsPage;

    try {
      // If we need to reset subsequent data first
      if (resetFirst && setId) {
        await predictionsAPI.resetFromPlayoffs(setId);
      }

      const response = await predictionsAPI.savePlayoffs(selections, setId);

      // Update snapshot to current state after successful save
      originalSelectionsRef.current = JSON.parse(JSON.stringify(selections));

      setSaved(true);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
      console.error('[PLAYOFFS] savePlayoffs error:', err.response?.data || err.message);
      setError('Error al guardar en servidor - Continuando con guardado local');
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = () => {
    saveAndNavigate(true);
  };

  const handleCancelReset = () => {
    setShowResetWarning(false);
  };

  const getTeamById = (playoff, teamId) => {
    return playoff.teams.find(t => t.id === teamId);
  };

  const completedCount = playoffs.filter(p => selections[p.id]?.final).length;

  const NextButton = ({ size = 'default' }) => (
    <Button
      onClick={handleContinue}
      disabled={!isComplete() || saving}
      size={size}
    >
      {saving ? 'Guardando...' : 'Siguiente'}
      <ChevronRight className="ml-1 h-4 w-4" />
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header con titulo */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Repechajes Intercontinentales</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">Marzo 2026</span>
          <Badge variant={isComplete() ? 'default' : 'secondary'}>
            {completedCount}/{playoffs.length}
          </Badge>
        </div>
      </div>

      {/* Botones de navegacion en linea separada */}
      <div className="flex justify-end mb-6">
        <NextButton />
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Selecciones guardadas correctamente
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isComplete() && (
        <Alert className="mb-6">
          <AlertDescription>
            Selecciona el ganador de cada repechaje para continuar. El ganador de cada uno ira al grupo indicado.
          </AlertDescription>
        </Alert>
      )}

      {/* UEFA Playoffs */}
      <h2 className="text-xl font-semibold mb-4">Repechajes UEFA (Europa)</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {playoffs.filter(p => p.confederation === 'UEFA').map(playoff => (
          <PlayoffBracket
            key={playoff.id}
            playoff={playoff}
            selections={selections[playoff.id] || {}}
            onSelectWinner={(round, winnerId) => selectWinner(playoff.id, round, winnerId)}
            getTeamById={(teamId) => getTeamById(playoff, teamId)}
          />
        ))}
      </div>

      {/* FIFA Playoffs */}
      <h2 className="text-xl font-semibold mb-4">Repechajes Intercontinentales FIFA</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {playoffs.filter(p => p.confederation === 'FIFA').map(playoff => (
          <PlayoffBracketFIFA
            key={playoff.id}
            playoff={playoff}
            selections={selections[playoff.id] || {}}
            onSelectWinner={(round, winnerId) => selectWinner(playoff.id, round, winnerId)}
            getTeamById={(teamId) => getTeamById(playoff, teamId)}
          />
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="flex justify-end mt-8 pt-6 border-t">
        <NextButton size="lg" />
      </div>

      {/* Reset Warning Modal */}
      <Dialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios detectados</DialogTitle>
            <DialogDescription>
              Has modificado las selecciones de repechajes. Esto afectará las siguientes fases que ya tienes completadas:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {subsequentData.hasGroups && <li>Predicciones de grupos</li>}
                {subsequentData.hasThirds && <li>Selección de terceros lugares</li>}
                {subsequentData.hasKnockout && <li>Predicciones de eliminatorias</li>}
              </ul>
              <p className="mt-3 font-medium">Si continúas, estas selecciones serán borradas y tendrás que completarlas de nuevo.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelReset}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset} disabled={saving}>
              {saving ? 'Guardando...' : 'Continuar y borrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlayoffBracket({ playoff, selections, onSelectWinner, getTeamById }) {
  const semi1Winner = selections.semi1;
  const semi2Winner = selections.semi2;
  const finalWinner = selections.final;

  // Match box component - same style as Knockout
  const MatchBox = ({ teamAId, teamBId, round, selectedWinner }) => {
    const teamA = getTeamById(teamAId);
    const teamB = getTeamById(teamBId);
    const canSelect = teamA && teamB;

    const TeamSlot = ({ team, isTop }) => {
      if (!team) {
        return (
          <div className={`h-[32px] px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 border-x border-t ${!isTop ? 'border-b rounded-b' : 'rounded-t'} border-dashed border-gray-300 flex items-center`}>
            Por definir
          </div>
        );
      }

      const isSelected = selectedWinner === team.id;
      const isEliminated = selectedWinner && selectedWinner !== team.id;

      return (
        <button
          onClick={() => canSelect && onSelectWinner(round, team.id)}
          disabled={!canSelect}
          className={`flex items-center gap-2 h-[32px] px-3 py-1.5 text-left w-full transition-colors
            ${isTop ? 'rounded-t border-x border-t' : 'rounded-b border'}
            ${isSelected ? 'bg-green-100 border-green-500 font-semibold' : isEliminated ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-300'}
            ${!isSelected && !isEliminated && canSelect ? 'hover:bg-blue-50 active:bg-blue-100' : ''}
          `}
        >
          <img src={team.flag_url} alt="" className={`w-6 h-4 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-sm truncate ${isEliminated ? 'text-gray-400' : ''}`}>{team.name}</span>
        </button>
      );
    };

    return (
      <div className="border border-gray-300 rounded overflow-hidden">
        <TeamSlot team={teamA} isTop={true} />
        <TeamSlot team={teamB} isTop={false} />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{playoff.name}</CardTitle>
            <CardDescription className="text-xs">
              Ganador va al Grupo {playoff.destinationGroup}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500 text-xs">Completo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Labels row */}
        <div className="flex mb-1">
          <div className="flex-1 text-xs text-muted-foreground font-medium">Semifinales</div>
          <div className="w-5" />
          <div className="flex-1 text-xs text-muted-foreground font-medium">Final</div>
        </div>

        {/* Bracket visual - constantes igual que Knockout */}
        {(() => {
          const MATCH_H = 64;
          const GAP = 4;
          const TOTAL_H = MATCH_H * 2 + GAP;
          const SVG_W = 20;
          const top1Center = MATCH_H / 2;
          const top2Center = MATCH_H + GAP + MATCH_H / 2;
          const midY = (top1Center + top2Center) / 2;

          return (
            <div className="flex items-center">
              {/* Columna Semifinales */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <MatchBox
                  teamAId={playoff.bracket.semi1.teamA}
                  teamBId={playoff.bracket.semi1.teamB}
                  round="semi1"
                  selectedWinner={semi1Winner}
                />
                <MatchBox
                  teamAId={playoff.bracket.semi2.teamA}
                  teamBId={playoff.bracket.semi2.teamB}
                  round="semi2"
                  selectedWinner={semi2Winner}
                />
              </div>

              {/* Lineas conectoras SVG */}
              <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
                <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
              </svg>

              {/* Columna Final */}
              <div className="flex-1 min-w-0">
                <MatchBox
                  teamAId={semi1Winner}
                  teamBId={semi2Winner}
                  round="final"
                  selectedWinner={finalWinner}
                />
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

function PlayoffBracketFIFA({ playoff, selections, onSelectWinner, getTeamById }) {
  const semi1Winner = selections.semi1;
  const finalWinner = selections.final;
  const seededTeam = getTeamById(playoff.bracket.finalTeamA);

  // Match box component - same style as Knockout
  const MatchBox = ({ teamAId, teamBId, round, selectedWinner }) => {
    const teamA = getTeamById(teamAId);
    const teamB = getTeamById(teamBId);
    const canSelect = teamA && teamB;

    const TeamSlot = ({ team, isTop }) => {
      if (!team) {
        return (
          <div className={`h-[32px] px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 border-x border-t ${!isTop ? 'border-b rounded-b' : 'rounded-t'} border-dashed border-gray-300 flex items-center`}>
            Por definir
          </div>
        );
      }

      const isSelected = selectedWinner === team.id;
      const isEliminated = selectedWinner && selectedWinner !== team.id;

      return (
        <button
          onClick={() => canSelect && onSelectWinner(round, team.id)}
          disabled={!canSelect}
          className={`flex items-center gap-2 h-[32px] px-3 py-1.5 text-left w-full transition-colors
            ${isTop ? 'rounded-t border-x border-t' : 'rounded-b border'}
            ${isSelected ? 'bg-green-100 border-green-500 font-semibold' : isEliminated ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-300'}
            ${!isSelected && !isEliminated && canSelect ? 'hover:bg-blue-50 active:bg-blue-100' : ''}
          `}
        >
          <img src={team.flag_url} alt="" className={`w-6 h-4 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-sm truncate ${isEliminated ? 'text-gray-400' : ''}`}>{team.name}</span>
        </button>
      );
    };

    return (
      <div className="border border-gray-300 rounded overflow-hidden">
        <TeamSlot team={teamA} isTop={true} />
        <TeamSlot team={teamB} isTop={false} />
      </div>
    );
  };

  // Seeded team box (team on top, "-" on bottom) - no clickeable
  const SeededTeamBox = () => {
    const isSelected = finalWinner === seededTeam?.id;
    const isEliminated = finalWinner && finalWinner !== seededTeam?.id;

    return (
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className={`flex items-center gap-2 h-[32px] px-3 py-1.5 border-b border-gray-300
          ${isSelected ? 'bg-green-100 font-semibold' : isEliminated ? 'bg-gray-50' : 'bg-white'}
        `}>
          <img src={seededTeam?.flag_url} alt="" className={`w-6 h-4 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-sm truncate ${isEliminated ? 'text-gray-400' : ''}`}>{seededTeam?.name}</span>
        </div>
        <div className="h-[32px] px-3 py-1.5 text-sm text-muted-foreground bg-muted/30 flex items-center justify-center">
          -
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{playoff.name}</CardTitle>
            <CardDescription className="text-xs">
              Ganador va al Grupo {playoff.destinationGroup}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500 text-xs">Completo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Labels row - igual que UEFA */}
        <div className="flex mb-1">
          <div className="flex-1 text-xs text-muted-foreground font-medium">Ronda 1</div>
          <div className="w-5" />
          <div className="flex-1 text-xs text-muted-foreground font-medium">Final</div>
        </div>

        {/* Bracket visual - mismo estilo que UEFA */}
        {(() => {
          const MATCH_H = 64;
          const GAP = 4;
          const TOTAL_H = MATCH_H * 2 + GAP;
          const SVG_W = 20;
          const top1Center = MATCH_H / 2;
          const top2Center = MATCH_H + GAP + MATCH_H / 2;
          const midY = (top1Center + top2Center) / 2;

          return (
            <div className="flex items-center">
              {/* Columna izquierda: Cabeza de serie arriba, Ronda 1 abajo */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <SeededTeamBox />
                <MatchBox
                  teamAId={playoff.bracket.semi1.teamA}
                  teamBId={playoff.bracket.semi1.teamB}
                  round="semi1"
                  selectedWinner={semi1Winner}
                />
              </div>

              {/* Lineas conectoras SVG - igual que UEFA */}
              <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
                <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
                <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
              </svg>

              {/* Columna Final */}
              <div className="flex-1 min-w-0">
                <MatchBox
                  teamAId={playoff.bracket.finalTeamA}
                  teamBId={semi1Winner}
                  round="final"
                  selectedWinner={finalWinner}
                />
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
