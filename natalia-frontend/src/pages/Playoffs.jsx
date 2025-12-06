import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { playoffs } from '@/data/playoffsData';

export default function Playoffs() {
  const [selections, setSelections] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSelections = localStorage.getItem('natalia_playoffs');
    if (savedSelections) {
      setSelections(JSON.parse(savedSelections));
    }
  }, []);

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

  const handleSave = () => {
    localStorage.setItem('natalia_playoffs', JSON.stringify(selections));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getTeamById = (playoff, teamId) => {
    return playoff.teams.find(t => t.id === teamId);
  };

  const getWinner = (playoffId, round) => {
    return selections[playoffId]?.[round];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Playoffs / Repechajes</h1>
          <p className="text-muted-foreground">Marzo 2026</p>
        </div>
        <Button onClick={handleSave}>
          Guardar Selecciones
        </Button>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Selecciones guardadas correctamente
          </AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground mb-6">
        Selecciona quien crees que ganara cada partido de repechaje.
        El ganador de cada playoff ira al grupo indicado.
      </p>

      {/* UEFA Playoffs */}
      <h2 className="text-xl font-semibold mb-4">Playoffs UEFA (Europa)</h2>
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
      <h2 className="text-xl font-semibold mb-4">Playoffs Intercontinentales FIFA</h2>
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
        <CardTitle className="text-lg">{playoff.name}</CardTitle>
        <CardDescription>
          Ganador va al Grupo {playoff.destinationGroup}
        </CardDescription>
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
  const waitingTeam = getTeamById(playoff.bracket.finalTeamA);

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
        <CardTitle className="text-lg">{playoff.name}</CardTitle>
        <CardDescription>
          Ganador va al Grupo {playoff.destinationGroup}
        </CardDescription>
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
