import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mockTeams, getAllGroups } from '@/data/mockData';
import { playoffs } from '@/data/playoffsData';
import { getThirdPlaceCombination } from '@/data/thirdPlaceCombinations';
import { predictionsAPI } from '@/services/api';

// Mapeo de playoff ID a team ID en mockTeams
const playoffToTeamId = {
  'UEFA_A': 6,
  'UEFA_B': 23,
  'UEFA_C': 16,
  'UEFA_D': 4,
  'FIFA_1': 42,
  'FIFA_2': 35,
};

export default function ThirdPlaces() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [predictions, setPredictions] = useState({});
  const [playoffSelections, setPlayoffSelections] = useState({});
  const [bestThirdPlaces, setBestThirdPlaces] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // Si hay setId, solo cargar del servidor (sin fallback a localStorage)
      if (setId) {
        try {
          // Cargar predicciones de grupos del servidor
          const groupsResponse = await predictionsAPI.getMy(setId);
          if (groupsResponse.data?.groupPredictions?.length > 0) {
            const grouped = {};
            groupsResponse.data.groupPredictions.forEach(gp => {
              if (!grouped[gp.group_letter]) {
                grouped[gp.group_letter] = [];
              }
              grouped[gp.group_letter][gp.predicted_position - 1] = gp.team_id;
            });
            setPredictions(grouped);
          }

          // Cargar playoffs del servidor
          const playoffsResponse = await predictionsAPI.getPlayoffs(setId);
          if (playoffsResponse.data && Object.keys(playoffsResponse.data).length > 0) {
            setPlayoffSelections(playoffsResponse.data);
          }

          // Cargar terceros del servidor
          const thirdResponse = await predictionsAPI.getThirdPlaces(setId);
          if (thirdResponse.data?.selectedGroups) {
            const groups = thirdResponse.data.selectedGroups.split('');
            setBestThirdPlaces(groups);
          }
          // Si no hay datos, empezar en blanco
        } catch (err) {
          console.error('Error loading data:', err);
        }
      } else {
        // Sin setId: comportamiento legacy con localStorage
        const savedPredictions = localStorage.getItem('natalia_predictions');
        if (savedPredictions) {
          setPredictions(JSON.parse(savedPredictions));
        }

        const savedPlayoffs = localStorage.getItem('natalia_playoffs');
        if (savedPlayoffs) {
          setPlayoffSelections(JSON.parse(savedPlayoffs));
        }

        const savedThirdPlaces = localStorage.getItem('natalia_best_third_places');
        if (savedThirdPlaces) {
          setBestThirdPlaces(JSON.parse(savedThirdPlaces));
        }
      }
    };
    loadData();
  }, [setId]);

  // Get the winning team from a playoff
  const getPlayoffWinner = (playoffId) => {
    const selection = playoffSelections[playoffId];
    if (!selection?.final) return null;
    const playoff = playoffs.find(p => p.id === playoffId);
    if (!playoff) return null;
    return playoff.teams.find(t => t.id === selection.final);
  };

  // Get team by ID
  const getTeamById = (id) => {
    const team = mockTeams.find(t => t.id === id);
    if (!team) return null;

    if (team.is_playoff) {
      const playoffEntry = Object.entries(playoffToTeamId).find(([_, teamId]) => teamId === id);
      if (playoffEntry) {
        const playoffId = playoffEntry[0];
        const winner = getPlayoffWinner(playoffId);
        if (winner) {
          return { ...winner, id: team.id, isPlayoffWinner: true };
        }
      }
    }
    return team;
  };

  // Get the third place team for each group
  const getThirdPlaceTeams = () => {
    const groups = getAllGroups();
    return groups.map(group => {
      const teamIds = predictions[group] || [];
      const thirdPlaceId = teamIds[2];
      const team = thirdPlaceId ? getTeamById(thirdPlaceId) : null;
      return { group, team, teamId: thirdPlaceId };
    });
  };

  const thirdPlaceTeams = getThirdPlaceTeams();

  const toggleThirdPlace = (group) => {
    setBestThirdPlaces(prev => {
      if (prev.includes(group)) {
        return prev.filter(g => g !== group);
      } else if (prev.length < 8) {
        return [...prev, group];
      }
      return prev;
    });
    setSaved(false);
  };

  const thirdPlaceCombination = bestThirdPlaces.length === 8
    ? getThirdPlaceCombination(bestThirdPlaces)
    : null;

  const isComplete = bestThirdPlaces.length === 8 && thirdPlaceCombination;

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    // Guardar en localStorage primero
    localStorage.setItem('natalia_best_third_places', JSON.stringify(bestThirdPlaces));

    const nextUrl = setId ? `/eliminatorias?setId=${setId}` : '/eliminatorias';

    try {
      // Convertir array a string: ['A','B','C'] -> 'ABC'
      const selectedGroups = bestThirdPlaces.sort().join('');
      await predictionsAPI.saveThirdPlaces(selectedGroups, setId);
      setSaved(true);
      setTimeout(() => {
        navigate(nextUrl);
      }, 500);
    } catch (err) {
      setError('Error al guardar en servidor - Continuando con guardado local');
      setTimeout(() => {
        navigate(nextUrl);
      }, 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground flex-wrap">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <span>/</span>
        <Link to={setId ? `/repechajes?setId=${setId}` : '/repechajes'} className="hover:text-foreground">Paso 1: Repechajes</Link>
        <span>/</span>
        <Link to={setId ? `/grupos?setId=${setId}` : '/grupos'} className="hover:text-foreground">Paso 2: Grupos</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Paso 3: Terceros</span>
        <span>/</span>
        <span>Paso 4: Eliminatorias</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mejores Terceros Lugares</h1>
        <div className="flex items-center gap-3">
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {bestThirdPlaces.length}/8 seleccionados
          </Badge>
          <Button onClick={handleFinish} disabled={!isComplete || saving}>
            {saving ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Seleccion guardada. Continuando a eliminatorias...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground mb-4">
        Selecciona los 8 equipos que crees que clasificaran como mejores terceros lugares.
        Solo 8 de los 12 terceros avanzan a la siguiente ronda.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {bestThirdPlaces.length === 8 && thirdPlaceCombination && (
          <Badge variant="outline" className="text-green-600 border-green-300">
            Combinacion valida (Option {thirdPlaceCombination.option})
          </Badge>
        )}
        {bestThirdPlaces.length === 8 && !thirdPlaceCombination && (
          <Badge variant="outline" className="text-red-600 border-red-300">
            Combinacion no valida - selecciona otra
          </Badge>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {thirdPlaceTeams.map(({ group, team }) => {
              const isSelected = bestThirdPlaces.includes(group);
              const canSelect = isSelected || bestThirdPlaces.length < 8;

              return (
                <button
                  key={group}
                  onClick={() => toggleThirdPlace(group)}
                  disabled={!canSelect && !isSelected}
                  className={`p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected
                      ? 'border-green-500 bg-green-50'
                      : canSelect
                        ? 'border-border hover:border-muted-foreground'
                        : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      3ro Grupo {group}
                    </span>
                    {isSelected && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                  </div>
                  {team ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={team.flag_url}
                        alt={team.name}
                        className="w-6 h-4 object-cover rounded"
                      />
                      <span className="text-sm font-medium truncate">
                        {team.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sin definir
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {bestThirdPlaces.length === 8 && thirdPlaceCombination && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Emparejamientos Round of 32</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Segun tu seleccion, estos serian los emparejamientos de terceros lugares:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(thirdPlaceCombination.assignments).map(([winner, third]) => {
                const thirdTeam = thirdPlaceTeams.find(t => t.group === third)?.team;
                return (
                  <div key={winner} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="font-medium">{winner}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">3{third}</span>
                    {thirdTeam && (
                      <img
                        src={thirdTeam.flag_url}
                        alt={thirdTeam.name}
                        className="w-5 h-3 object-cover rounded ml-auto"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button variant="outline" asChild>
          <Link to={setId ? `/grupos?setId=${setId}` : '/grupos'}>Volver a Grupos</Link>
        </Button>
        <Button onClick={handleFinish} disabled={!isComplete || saving} size="lg">
          {saving ? 'Guardando...' : 'Continuar a Eliminatorias'}
        </Button>
      </div>
    </div>
  );
}
