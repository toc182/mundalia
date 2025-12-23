/**
 * MatchBox - Componente unificado para mostrar un partido entre dos equipos
 *
 * Modos de uso:
 * 1. Click (default): Click en equipo para seleccionar ganador
 * 2. Scores: Inputs de marcador, ganador derivado automáticamente (o click en empate)
 * 3. Readonly: Solo visualización, sin interacción
 */

interface MatchTeam {
  id: number | string;
  name: string;
  flag_url: string;
  thirdPlaceFrom?: string;
}

interface MatchBoxProps {
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  selectedWinner: number | string | null;
  onSelectWinner?: (teamId: number | string) => void;
  showScores?: boolean;
  scoreA?: number | string;
  scoreB?: number | string;
  onScoreChange?: (side: 'a' | 'b', value: number | string) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function MatchBox({
  teamA,
  teamB,
  selectedWinner,
  onSelectWinner,
  showScores = false,
  scoreA,
  scoreB,
  onScoreChange,
  readonly = false,
  size = 'md',
}: MatchBoxProps): JSX.Element {
  const canSelect = teamA && teamB && !readonly;

  // En modo scores con empate, permitir click para desempatar
  const isTied = showScores &&
    scoreA !== undefined && scoreB !== undefined &&
    scoreA !== '' && scoreB !== '' &&
    Number(scoreA) === Number(scoreB);

  // Alturas según tamaño
  const heightClass: Record<string, string> = {
    sm: 'h-[24px]',
    md: 'h-[32px]',
    lg: 'h-[36px]',
  };

  const textSize: Record<string, string> = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-sm',
  };

  const flagSize: Record<string, string> = {
    sm: 'w-5 h-3',
    md: 'w-6 h-4',
    lg: 'w-6 h-4',
  };

  const inputSize: Record<string, string> = {
    sm: 'w-7 h-5 text-xs',
    md: 'w-10 h-7 text-lg',
    lg: 'w-10 h-7 text-lg',
  };

  const renderTeamSlot = (team: MatchTeam | null, isTop: boolean, side: 'a' | 'b'): JSX.Element => {
    const isSelected = selectedWinner === team?.id;
    const isEliminated = selectedWinner && selectedWinner !== team?.id;
    const teamScore = side === 'a' ? scoreA : scoreB;

    // En modo scores con empate, permitir click
    // En modo click normal, permitir click si hay dos equipos
    const canClick = showScores
      ? (canSelect && isTied)
      : canSelect;

    // Slot vacío (equipo por definir)
    if (!team) {
      return (
        <div className={`${heightClass[size]} px-3 py-1.5 ${textSize[size]} text-muted-foreground bg-muted/30
          border-x border-t ${!isTop ? 'border-b rounded-b' : 'rounded-t'} border-dashed border-gray-300
          flex items-center`}
        >
          <span className="flex-1">Por definir</span>
          {showScores && <span className="w-10 text-center">-</span>}
        </div>
      );
    }

    // Slot con equipo
    const baseClasses = `flex items-center ${heightClass[size]}
      ${isTop ? 'rounded-t border-x border-t' : 'rounded-b border'}`;

    const stateClasses = isSelected
      ? 'bg-green-100 border-green-500'
      : isEliminated
        ? 'bg-gray-50 border-gray-300'
        : 'bg-white border-gray-300';

    // Modo readonly - solo mostrar con checkmark para ganador
    if (readonly) {
      return (
        <div className={`${baseClasses} ${stateClasses}`}>
          <div className={`flex items-center gap-2 flex-1 px-3 py-1.5 min-w-0 ${isSelected ? 'font-semibold' : ''}`}>
            <img
              src={team.flag_url}
              alt={`Bandera de ${team.name}`}
              className={`${flagSize[size]} object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`}
            />
            <span className={`${textSize[size]} truncate ${isEliminated ? 'text-gray-400' : ''}`}>
              {team.name}
            </span>
            {team.thirdPlaceFrom && (
              <span className="text-xs text-muted-foreground ml-auto">3{team.thirdPlaceFrom}</span>
            )}
            {isSelected && <span className="ml-auto text-green-600">✓</span>}
          </div>
        </div>
      );
    }

    // Modo interactivo
    return (
      <div className={`${baseClasses} ${stateClasses}`}>
        {/* Botón de equipo - clickeable */}
        <button
          onClick={() => canClick && onSelectWinner?.(team.id)}
          disabled={!canClick}
          tabIndex={showScores ? -1 : 0}
          aria-label={`Seleccionar ${team.name} como ganador${isSelected ? ' (seleccionado)' : ''}`}
          aria-pressed={isSelected}
          className={`flex items-center gap-2 flex-1 px-3 py-1.5 text-left transition-colors min-w-0
            ${isSelected ? 'font-semibold' : ''}
            ${!isSelected && !isEliminated && canClick ? 'hover:bg-blue-50 active:bg-blue-100' : ''}
          `}
        >
          <img
            src={team.flag_url}
            alt={`Bandera de ${team.name}`}
            className={`${flagSize[size]} object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`}
          />
          <span className={`${textSize[size]} truncate ${isEliminated ? 'text-gray-400' : ''}`}>
            {team.name}
          </span>
          {team.thirdPlaceFrom && (
            <span className="text-xs text-muted-foreground ml-auto">3{team.thirdPlaceFrom}</span>
          )}
        </button>

        {/* Input de marcador - solo en modo scores */}
        {showScores && (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            defaultValue={teamScore ?? ''}
            key={`score-${side}-${teamScore ?? 'empty'}`}
            onBlur={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              const num = val === '' ? '' : Math.min(99, parseInt(val, 10));
              onScoreChange?.(side, num);
            }}
            disabled={!canSelect}
            aria-label={`Goles de ${team.name}`}
            className={`${inputSize[size]} mx-1 text-center border border-gray-300 rounded font-bold bg-white
              focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
              disabled:bg-muted disabled:cursor-not-allowed
              placeholder:text-gray-400 focus:placeholder:text-transparent`}
            placeholder="-"
          />
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      {renderTeamSlot(teamA, true, 'a')}
      {renderTeamSlot(teamB, false, 'b')}
      {/* Indicador de empate - solo en modo scores */}
      {showScores && isTied && !selectedWinner && (
        <div className={`${size === 'sm' ? 'text-[9px] py-0.5' : 'text-xs py-1'}
          text-center bg-yellow-50 text-yellow-700 border-t border-yellow-200`}
        >
          {size === 'sm' ? 'Click para elegir ganador' : 'Empate - click para elegir ganador'}
        </div>
      )}
    </div>
  );
}

/**
 * MatchBoxPair - Dos partidos conectados al siguiente (para brackets móviles)
 */

interface MatchData {
  matchId: string;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
  selectedWinner: number | string | null;
}

interface ScoreData {
  a?: number | string;
  b?: number | string;
}

interface MatchBoxPairProps {
  match1: MatchData | null;
  match2: MatchData | null;
  nextMatch: MatchData | null;
  onSelectWinner: (matchId: string, teamId: number | string) => void;
  showScores?: boolean;
  scores?: Record<string, ScoreData>;
  onScoreChange?: (matchId: string, teamAId: number | string | undefined, teamBId: number | string | undefined, scoreA: number | string | undefined, scoreB: number | string | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function MatchBoxPair({
  match1,
  match2,
  nextMatch,
  onSelectWinner,
  showScores = false,
  scores = {},
  onScoreChange,
  size = 'lg',
}: MatchBoxPairProps): JSX.Element {
  const MATCH_H = 64;
  const GAP = 4;
  const TOTAL_H = MATCH_H * 2 + GAP;
  const SVG_W = 20;
  const top1Center = MATCH_H / 2;
  const top2Center = MATCH_H + GAP + MATCH_H / 2;
  const midY = (top1Center + top2Center) / 2;

  const getMatchProps = (match: MatchData | null): MatchBoxProps | null => {
    if (!match) return null;
    const score = scores[match.matchId] || {};
    return {
      teamA: match.teamA,
      teamB: match.teamB,
      selectedWinner: match.selectedWinner,
      onSelectWinner: (teamId) => onSelectWinner(match.matchId, teamId),
      showScores,
      scoreA: score.a,
      scoreB: score.b,
      onScoreChange: showScores ? (side, value) => {
        onScoreChange?.(match.matchId, match.teamA?.id, match.teamB?.id,
          side === 'a' ? value : score.a,
          side === 'b' ? value : score.b
        );
      } : undefined,
      size,
    };
  };

  const match1Props = getMatchProps(match1);
  const match2Props = getMatchProps(match2);
  const nextMatchProps = getMatchProps(nextMatch);

  return (
    <div className="flex items-center">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {match1Props && <MatchBox {...match1Props} />}
        {match2Props && <MatchBox {...match2Props} />}
      </div>
      <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
        <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
      </svg>
      <div className="flex-1 min-w-0">
        {nextMatchProps && <MatchBox {...nextMatchProps} />}
      </div>
    </div>
  );
}
