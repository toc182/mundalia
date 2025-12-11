import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight } from 'lucide-react';
import { playoffs } from '@/data/playoffsData';
import { predictionsAPI } from '@/services/api';

export default function Playoffs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [selections, setSelections] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSelections = async () => {
      console.log('[PLAYOFFS] loadSelections called, setId:', setId);
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          const response = await predictionsAPI.getPlayoffs(setId);
          console.log('[PLAYOFFS] getPlayoffs response:', response.data);
          if (response.data && Object.keys(response.data).length > 0) {
            setSelections(response.data);
            console.log('[PLAYOFFS] Loaded selections from API');
          } else {
            console.log('[PLAYOFFS] No data from API, starting blank');
          }
          // Si no hay datos en servidor, empezar en blanco (no cargar localStorage)
        } catch (err) {
          // Error de servidor, empezar en blanco
          console.error('[PLAYOFFS] Error loading playoffs:', err);
        }
      } else {
        // Sin setId: comportamiento legacy con localStorage
        console.log('[PLAYOFFS] No setId, checking localStorage');
        const savedSelections = localStorage.getItem('natalia_playoffs');
        if (savedSelections) {
          setSelections(JSON.parse(savedSelections));
          console.log('[PLAYOFFS] Loaded from localStorage');
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
    setSaving(true);
    setError(null);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_playoffs', JSON.stringify(selections));

    const nextUrl = setId ? `/grupos?setId=${setId}` : '/grupos';

    console.log('[PLAYOFFS] handleContinue called');
    console.log('[PLAYOFFS] setId:', setId);
    console.log('[PLAYOFFS] selections:', selections);

    try {
      const response = await predictionsAPI.savePlayoffs(selections, setId);
      console.log('[PLAYOFFS] savePlayoffs response:', response.data);
      setSaved(true);
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 500);
    } catch (err) {
      console.error('[PLAYOFFS] savePlayoffs error:', err.response?.data || err.message);
      setError('Error al guardar en servidor - Continuando con guardado local');
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 1500);
    } finally {
      setSaving(false);
    }
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
    </div>
  );
}

function PlayoffBracket({ playoff, selections, onSelectWinner, getTeamById }) {
  const semi1Winner = selections.semi1;
  const semi2Winner = selections.semi2;
  const finalWinner = selections.final;

  const TeamButton = ({ teamId, round, isSelected, isEliminated }) => {
    const team = getTeamById(teamId);
    if (!team) return null;

    return (
      <button
        onClick={() => onSelectWinner(round, teamId)}
        className={`flex items-center gap-2 p-2 rounded border w-full transition-all
          ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : ''}
          ${isEliminated ? 'opacity-40' : 'hover:bg-muted'}
        `}
      >
        <img src={team.flag_url} alt={team.name} className="w-6 h-4 object-cover rounded" />
        <span className="text-sm font-medium">{team.name}</span>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{playoff.name}</CardTitle>
            <CardDescription>
              Ganador va al Grupo {playoff.destinationGroup}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500">Completo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Semifinals */}
          <div className="flex-1 space-y-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">SEMIFINALES</p>

            {/* Semi 1 */}
            <div className="space-y-1">
              <TeamButton
                teamId={playoff.bracket.semi1.teamA}
                round="semi1"
                isSelected={semi1Winner === playoff.bracket.semi1.teamA}
                isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamA}
              />
              <TeamButton
                teamId={playoff.bracket.semi1.teamB}
                round="semi1"
                isSelected={semi1Winner === playoff.bracket.semi1.teamB}
                isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamB}
              />
            </div>

            {/* Semi 2 */}
            <div className="space-y-1">
              <TeamButton
                teamId={playoff.bracket.semi2.teamA}
                round="semi2"
                isSelected={semi2Winner === playoff.bracket.semi2.teamA}
                isEliminated={semi2Winner && semi2Winner !== playoff.bracket.semi2.teamA}
              />
              <TeamButton
                teamId={playoff.bracket.semi2.teamB}
                round="semi2"
                isSelected={semi2Winner === playoff.bracket.semi2.teamB}
                isEliminated={semi2Winner && semi2Winner !== playoff.bracket.semi2.teamB}
              />
            </div>
          </div>

          {/* Final */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">FINAL</p>
            <div className="space-y-1">
              {semi1Winner ? (
                <TeamButton
                  teamId={semi1Winner}
                  round="final"
                  isSelected={finalWinner === semi1Winner}
                  isEliminated={finalWinner && finalWinner !== semi1Winner}
                />
              ) : (
                <div className="p-2 rounded border border-dashed text-center text-xs text-muted-foreground">
                  Ganador Semi 1
                </div>
              )}
              {semi2Winner ? (
                <TeamButton
                  teamId={semi2Winner}
                  round="final"
                  isSelected={finalWinner === semi2Winner}
                  isEliminated={finalWinner && finalWinner !== semi2Winner}
                />
              ) : (
                <div className="p-2 rounded border border-dashed text-center text-xs text-muted-foreground">
                  Ganador Semi 2
                </div>
              )}
            </div>

            {/* Winner */}
            {finalWinner && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">CLASIFICADO</p>
                <div className="flex items-center gap-2">
                  <img
                    src={getTeamById(finalWinner)?.flag_url}
                    alt=""
                    className="w-6 h-4 object-cover rounded"
                  />
                  <span className="font-semibold text-green-700">
                    {getTeamById(finalWinner)?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayoffBracketFIFA({ playoff, selections, onSelectWinner, getTeamById }) {
  const semi1Winner = selections.semi1;
  const finalWinner = selections.final;

  const TeamButton = ({ teamId, round, isSelected, isEliminated }) => {
    const team = getTeamById(teamId);
    if (!team) return null;

    return (
      <button
        onClick={() => onSelectWinner(round, teamId)}
        className={`flex items-center gap-2 p-2 rounded border w-full transition-all
          ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : ''}
          ${isEliminated ? 'opacity-40' : 'hover:bg-muted'}
        `}
      >
        <img src={team.flag_url} alt={team.name} className="w-6 h-4 object-cover rounded" />
        <span className="text-sm font-medium">{team.name}</span>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{playoff.name}</CardTitle>
            <CardDescription>
              Ganador va al Grupo {playoff.destinationGroup}
            </CardDescription>
          </div>
          {finalWinner && (
            <Badge className="bg-green-500">Completo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* First Round */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">PRIMERA RONDA</p>
            <div className="space-y-1">
              <TeamButton
                teamId={playoff.bracket.semi1.teamA}
                round="semi1"
                isSelected={semi1Winner === playoff.bracket.semi1.teamA}
                isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamA}
              />
              <TeamButton
                teamId={playoff.bracket.semi1.teamB}
                round="semi1"
                isSelected={semi1Winner === playoff.bracket.semi1.teamB}
                isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamB}
              />
            </div>
          </div>

          {/* Final */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">FINAL</p>
            <div className="space-y-1">
              {/* Waiting team */}
              <TeamButton
                teamId={playoff.bracket.finalTeamA}
                round="final"
                isSelected={finalWinner === playoff.bracket.finalTeamA}
                isEliminated={finalWinner && finalWinner !== playoff.bracket.finalTeamA}
              />
              {/* Winner of first round */}
              {semi1Winner ? (
                <TeamButton
                  teamId={semi1Winner}
                  round="final"
                  isSelected={finalWinner === semi1Winner}
                  isEliminated={finalWinner && finalWinner !== semi1Winner}
                />
              ) : (
                <div className="p-2 rounded border border-dashed text-center text-xs text-muted-foreground">
                  Ganador Ronda 1
                </div>
              )}
            </div>

            {/* Winner */}
            {finalWinner && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">CLASIFICADO</p>
                <div className="flex items-center gap-2">
                  <img
                    src={getTeamById(finalWinner)?.flag_url}
                    alt=""
                    className="w-6 h-4 object-cover rounded"
                  />
                  <span className="font-semibold text-green-700">
                    {getTeamById(finalWinner)?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
