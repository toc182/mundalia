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

  const TeamButton = ({ teamId, round, isSelected, isEliminated, compact = false }) => {
    const team = getTeamById(teamId);
    if (!team) return null;

    return (
      <button
        onClick={() => onSelectWinner(round, teamId)}
        className={`flex items-center gap-2 ${compact ? 'p-1.5' : 'p-2'} rounded border w-full transition-all
          ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : ''}
          ${isEliminated ? 'opacity-40' : 'hover:bg-muted'}
        `}
      >
        <img src={team.flag_url} alt={team.name} className="w-5 h-3 object-cover rounded" />
        <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`}>{team.name}</span>
      </button>
    );
  };

  const WinnerSlot = ({ teamId, round, isSelected, isEliminated, placeholder }) => {
    if (teamId) {
      return <TeamButton teamId={teamId} round={round} isSelected={isSelected} isEliminated={isEliminated} compact />;
    }
    return (
      <div className="p-1.5 rounded border border-dashed text-center text-[10px] text-muted-foreground bg-muted/30">
        {placeholder}
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
        {/* Bracket visual */}
        <div className="flex items-stretch gap-2">
          {/* Columna Semifinales */}
          <div className="flex flex-col justify-around flex-1 min-w-0 gap-2">
            {/* Semi 1 */}
            <div className="space-y-0.5">
              <TeamButton teamId={playoff.bracket.semi1.teamA} round="semi1" isSelected={semi1Winner === playoff.bracket.semi1.teamA} isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamA} compact />
              <TeamButton teamId={playoff.bracket.semi1.teamB} round="semi1" isSelected={semi1Winner === playoff.bracket.semi1.teamB} isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamB} compact />
            </div>
            {/* Semi 2 */}
            <div className="space-y-0.5">
              <TeamButton teamId={playoff.bracket.semi2.teamA} round="semi2" isSelected={semi2Winner === playoff.bracket.semi2.teamA} isEliminated={semi2Winner && semi2Winner !== playoff.bracket.semi2.teamA} compact />
              <TeamButton teamId={playoff.bracket.semi2.teamB} round="semi2" isSelected={semi2Winner === playoff.bracket.semi2.teamB} isEliminated={semi2Winner && semi2Winner !== playoff.bracket.semi2.teamB} compact />
            </div>
          </div>

          {/* Lineas conectoras */}
          <div className="w-4 flex flex-col justify-around py-2">
            {/* Conector Semi 1 → Final */}
            <div className="flex-1 flex items-center">
              <div className="w-full border-t-2 border-r-2 border-b-2 border-muted-foreground/30 rounded-r h-8" />
            </div>
            {/* Conector Semi 2 → Final */}
            <div className="flex-1 flex items-center">
              <div className="w-full border-t-2 border-r-2 border-b-2 border-muted-foreground/30 rounded-r h-8" />
            </div>
          </div>

          {/* Columna Final */}
          <div className="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
            <WinnerSlot teamId={semi1Winner} round="final" isSelected={finalWinner === semi1Winner} isEliminated={finalWinner && finalWinner !== semi1Winner} placeholder="Semi 1" />
            <WinnerSlot teamId={semi2Winner} round="final" isSelected={finalWinner === semi2Winner} isEliminated={finalWinner && finalWinner !== semi2Winner} placeholder="Semi 2" />
          </div>

          {/* Linea al ganador */}
          <div className="w-4 flex items-center">
            <div className="w-full border-t-2 border-muted-foreground/30" />
          </div>

          {/* Columna Ganador */}
          <div className="flex items-center min-w-[70px]">
            {finalWinner ? (
              <div className="p-2 bg-green-50 rounded-lg border border-green-300 w-full">
                <div className="flex items-center gap-1.5">
                  <img src={getTeamById(finalWinner)?.flag_url} alt="" className="w-5 h-3 object-cover rounded" />
                  <span className="text-xs font-bold text-green-700 truncate">{getTeamById(finalWinner)?.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded border-2 border-dashed border-muted-foreground/30 text-center text-[10px] text-muted-foreground w-full">
                Ganador
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
        className={`flex items-center gap-2 p-1.5 rounded border w-full transition-all
          ${isSelected ? 'bg-green-100 border-green-400 ring-2 ring-green-400' : ''}
          ${isEliminated ? 'opacity-40' : 'hover:bg-muted'}
        `}
      >
        <img src={team.flag_url} alt={team.name} className="w-5 h-3 object-cover rounded" />
        <span className="text-xs font-medium truncate">{team.name}</span>
      </button>
    );
  };

  const WinnerSlot = ({ teamId, round, isSelected, isEliminated, placeholder }) => {
    if (teamId) {
      return <TeamButton teamId={teamId} round={round} isSelected={isSelected} isEliminated={isEliminated} />;
    }
    return (
      <div className="p-1.5 rounded border border-dashed text-center text-[10px] text-muted-foreground bg-muted/30">
        {placeholder}
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
        {/* Bracket visual */}
        <div className="flex items-stretch gap-2">
          {/* Columna Primera Ronda */}
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="space-y-0.5">
              <TeamButton teamId={playoff.bracket.semi1.teamA} round="semi1" isSelected={semi1Winner === playoff.bracket.semi1.teamA} isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamA} />
              <TeamButton teamId={playoff.bracket.semi1.teamB} round="semi1" isSelected={semi1Winner === playoff.bracket.semi1.teamB} isEliminated={semi1Winner && semi1Winner !== playoff.bracket.semi1.teamB} />
            </div>
          </div>

          {/* Linea conectora */}
          <div className="w-4 flex items-center">
            <div className="w-full border-t-2 border-r-2 border-b-2 border-muted-foreground/30 rounded-r h-8" />
          </div>

          {/* Columna Final */}
          <div className="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
            {/* Equipo que espera en final */}
            <TeamButton teamId={playoff.bracket.finalTeamA} round="final" isSelected={finalWinner === playoff.bracket.finalTeamA} isEliminated={finalWinner && finalWinner !== playoff.bracket.finalTeamA} />
            {/* Ganador de primera ronda */}
            <WinnerSlot teamId={semi1Winner} round="final" isSelected={finalWinner === semi1Winner} isEliminated={finalWinner && finalWinner !== semi1Winner} placeholder="Ganador R1" />
          </div>

          {/* Linea al ganador */}
          <div className="w-4 flex items-center">
            <div className="w-full border-t-2 border-muted-foreground/30" />
          </div>

          {/* Columna Ganador */}
          <div className="flex items-center min-w-[70px]">
            {finalWinner ? (
              <div className="p-2 bg-green-50 rounded-lg border border-green-300 w-full">
                <div className="flex items-center gap-1.5">
                  <img src={getTeamById(finalWinner)?.flag_url} alt="" className="w-5 h-3 object-cover rounded" />
                  <span className="text-xs font-bold text-green-700 truncate">{getTeamById(finalWinner)?.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded border-2 border-dashed border-muted-foreground/30 text-center text-[10px] text-muted-foreground w-full">
                Ganador
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
