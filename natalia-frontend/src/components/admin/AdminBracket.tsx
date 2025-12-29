import type { AdminBracketMatchProps, AdminBracketProps, ExtendedMockTeam, AdminBracketMatchData } from '@/types/admin';

// Admin bracket match component with score inputs
export function AdminBracketMatch({ match, onScoreChange, onSelectWinner, matchWidth }: AdminBracketMatchProps): JSX.Element | null {
  if (!match) return null;
  const canSelect = match.teamA && match.teamB;
  const isTied = match.scoreA !== '' && match.scoreB !== '' &&
                Number(match.scoreA) === Number(match.scoreB);

  const renderTeamSlot = (team: ExtendedMockTeam | null, isTop: boolean, side: 'a' | 'b'): JSX.Element => {
    const isSelected = match.selectedWinner === team?.id;
    const isEliminated = match.selectedWinner && match.selectedWinner !== team?.id;
    const teamScore = side === 'a' ? match.scoreA : match.scoreB;

    const canClick = canSelect && isTied;

    if (!team) {
      return (
        <div className={`flex items-center h-[28px] px-2 py-0.5 text-[11px] text-muted-foreground bg-muted/30 border-x border-t ${!isTop ? 'border-b rounded-b' : 'rounded-t'} border-dashed border-gray-300`}>
          <span className="flex-1">Por definir</span>
          <span className="w-8 text-center">-</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center h-[28px] ${isTop ? 'rounded-t border-x border-t' : 'rounded-b border'}
        ${isSelected ? 'bg-green-100 border-green-500' : isEliminated ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-300'}`}
      >
        <button
          onClick={() => canClick && onSelectWinner(match.matchId, team.id)}
          disabled={!canClick}
          className={`flex items-center gap-1.5 flex-1 px-2 py-0.5 text-left transition-colors min-w-0
            ${isSelected ? 'font-semibold' : ''}
            ${!isSelected && !isEliminated && canClick ? 'hover:bg-blue-50' : ''}
          `}
        >
          <img src={team.flag_url} alt="" className={`w-5 h-3 object-cover rounded shrink-0 ${isEliminated ? 'opacity-50' : ''}`} />
          <span className={`text-[11px] truncate ${isEliminated ? 'text-gray-400' : ''}`}>{team.name}</span>
          {team.thirdPlaceFrom && <span className="text-[9px] text-muted-foreground">3{team.thirdPlaceFrom}</span>}
        </button>

        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          defaultValue={teamScore ?? ''}
          key={`${match.matchId}-${side}-${teamScore ?? 'empty'}`}
          onBlur={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            const num = val === '' ? '' : Math.min(99, parseInt(val, 10)).toString();
            onScoreChange(
              match.matchId,
              match.teamA?.id || null,
              match.teamB?.id || null,
              side === 'a' ? num : match.scoreA.toString(),
              side === 'b' ? num : match.scoreB.toString()
            );
          }}
          disabled={!canSelect}
          className="w-8 h-6 mx-0.5 text-center border border-gray-300 rounded text-sm font-bold bg-white
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
            disabled:bg-muted disabled:cursor-not-allowed
            placeholder:text-gray-400"
          placeholder="-"
        />
      </div>
    );
  };

  return (
    <div style={{ width: matchWidth }} className="shrink-0">
      {renderTeamSlot(match.teamA, true, 'a')}
      {renderTeamSlot(match.teamB, false, 'b')}
      {isTied && !match.selectedWinner && (
        <div className="text-[9px] text-center py-0.5 bg-yellow-50 text-yellow-700 border border-t-0 border-yellow-200 rounded-b">
          Click para elegir ganador
        </div>
      )}
    </div>
  );
}

// Full admin bracket component
export function AdminBracket({ r32Matches, r16Matches, qfMatches, sfMatches, final, thirdPlace, onScoreChange, onSelectWinner, getTeamById }: AdminBracketProps): JSX.Element {
  // Visual order for bracket
  const r32VisualOrder = [
    'M74', 'M77', 'M73', 'M75', 'M83', 'M84', 'M81', 'M82',
    'M76', 'M78', 'M79', 'M80', 'M86', 'M88', 'M85', 'M87',
  ];
  const r16VisualOrder = ['M89', 'M90', 'M93', 'M94', 'M91', 'M92', 'M95', 'M96'];
  const qfVisualOrder = ['M97', 'M98', 'M99', 'M100'];
  const sfVisualOrder = ['M101', 'M102'];

  const getMatchById = (matches: AdminBracketMatchData[], id: string): AdminBracketMatchData | undefined =>
    matches.find(m => m.matchId === id);

  const r32Ordered = r32VisualOrder.map(id => getMatchById(r32Matches, id)).filter((m): m is AdminBracketMatchData => Boolean(m));
  const r16Ordered = r16VisualOrder.map(id => getMatchById(r16Matches, id)).filter((m): m is AdminBracketMatchData => Boolean(m));
  const qfOrdered = qfVisualOrder.map(id => getMatchById(qfMatches, id)).filter((m): m is AdminBracketMatchData => Boolean(m));
  const sfOrdered = sfVisualOrder.map(id => getMatchById(sfMatches, id)).filter((m): m is AdminBracketMatchData => Boolean(m));

  // Dimensions
  const MATCH_HEIGHT = 68;
  const MATCH_WIDTH = 180;
  const CONNECTOR_WIDTH = 24;
  const TITLE_HEIGHT = 24;
  const R32_GAP = 8;

  const getMatchCenterY = (index: number, gap: number): number => {
    return TITLE_HEIGHT + (MATCH_HEIGHT / 2) + index * (MATCH_HEIGHT + gap);
  };

  const getColumnHeight = (count: number, gap: number): number => {
    return TITLE_HEIGHT + count * MATCH_HEIGHT + (count - 1) * gap;
  };

  const r32Height = getColumnHeight(16, R32_GAP);

  return (
    <div className="relative min-w-max" style={{ height: r32Height + 150 }}>
      {/* Round titles */}
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: 0, top: 0, width: MATCH_WIDTH }}>Dieciseisavos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: MATCH_WIDTH + CONNECTOR_WIDTH, top: 0, width: MATCH_WIDTH }}>Octavos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 2, top: 0, width: MATCH_WIDTH }}>Cuartos</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 3, top: 0, width: MATCH_WIDTH }}>Semifinales</div>
      <div className="absolute text-xs font-semibold text-center text-muted-foreground"
           style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: 0, width: MATCH_WIDTH }}>Final</div>

      {/* R32 - 16 matches */}
      {r32Ordered.map((match, i) => (
        <div key={match.matchId} className="absolute"
             style={{ left: 0, top: TITLE_HEIGHT + i * (MATCH_HEIGHT + R32_GAP) }}>
          <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
          <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
        </div>
      ))}

      {/* Connectors R32 → R16 */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 8 }, (_, i) => {
          const topMatchCenter = getMatchCenterY(i * 2, R32_GAP);
          const bottomMatchCenter = getMatchCenterY(i * 2 + 1, R32_GAP);
          const nextMatchCenter = (topMatchCenter + bottomMatchCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topMatchCenter} x2={midX} y2={topMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomMatchCenter} x2={midX} y2={bottomMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topMatchCenter} x2={midX} y2={bottomMatchCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* R16 - 8 matches */}
      {r16Ordered.map((match, i) => {
        const topR32Center = getMatchCenterY(i * 2, R32_GAP);
        const bottomR32Center = getMatchCenterY(i * 2 + 1, R32_GAP);
        const centerY = (topR32Center + bottomR32Center) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: MATCH_WIDTH + CONNECTOR_WIDTH, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connectors R16 → QF */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 2 + CONNECTOR_WIDTH, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 4 }, (_, i) => {
          const topIdx = i * 2;
          const bottomIdx = i * 2 + 1;
          const topR16Center = (getMatchCenterY(topIdx * 2, R32_GAP) + getMatchCenterY(topIdx * 2 + 1, R32_GAP)) / 2;
          const bottomR16Center = (getMatchCenterY(bottomIdx * 2, R32_GAP) + getMatchCenterY(bottomIdx * 2 + 1, R32_GAP)) / 2;
          const nextMatchCenter = (topR16Center + bottomR16Center) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topR16Center} x2={midX} y2={topR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomR16Center} x2={midX} y2={bottomR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topR16Center} x2={midX} y2={bottomR16Center} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* QF - 4 matches */}
      {qfOrdered.map((match, i) => {
        const topR32 = getMatchCenterY(i * 4, R32_GAP);
        const bottomR32 = getMatchCenterY(i * 4 + 3, R32_GAP);
        const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 2, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connectors QF → SF */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 3 + CONNECTOR_WIDTH * 2, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {Array.from({ length: 2 }, (_, i) => {
          const topIdx = i * 2;
          const bottomIdx = i * 2 + 1;
          const topQFCenter = (getMatchCenterY(topIdx * 4, R32_GAP) + getMatchCenterY(topIdx * 4 + 3, R32_GAP)) / 2;
          const bottomQFCenter = (getMatchCenterY(bottomIdx * 4, R32_GAP) + getMatchCenterY(bottomIdx * 4 + 3, R32_GAP)) / 2;
          const nextMatchCenter = (topQFCenter + bottomQFCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g key={i} className="text-gray-300">
              <line x1="0" y1={topQFCenter} x2={midX} y2={topQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomQFCenter} x2={midX} y2={bottomQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topQFCenter} x2={midX} y2={bottomQFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={nextMatchCenter} x2={CONNECTOR_WIDTH} y2={nextMatchCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })}
      </svg>

      {/* SF - 2 matches */}
      {sfOrdered.map((match, i) => {
        const topR32 = getMatchCenterY(i * 8, R32_GAP);
        const bottomR32 = getMatchCenterY(i * 8 + 7, R32_GAP);
        const centerY = (topR32 + bottomR32) / 2 - MATCH_HEIGHT / 2;

        return (
          <div key={match.matchId} className="absolute"
               style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 3, top: centerY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">{match.matchId}</div>
            <AdminBracketMatch match={match} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })}

      {/* Connector SF → Final */}
      <svg className="absolute pointer-events-none"
           style={{ left: MATCH_WIDTH * 4 + CONNECTOR_WIDTH * 3, top: 0, width: CONNECTOR_WIDTH, height: r32Height }}>
        {(() => {
          const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
          const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
          const finalCenter = (topSFCenter + bottomSFCenter) / 2;
          const midX = CONNECTOR_WIDTH / 2;

          return (
            <g className="text-gray-300">
              <line x1="0" y1={topSFCenter} x2={midX} y2={topSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1={bottomSFCenter} x2={midX} y2={bottomSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={topSFCenter} x2={midX} y2={bottomSFCenter} stroke="currentColor" strokeWidth="1" />
              <line x1={midX} y1={finalCenter} x2={CONNECTOR_WIDTH} y2={finalCenter} stroke="currentColor" strokeWidth="1" />
            </g>
          );
        })()}
      </svg>

      {/* Final */}
      {(() => {
        const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
        const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
        const finalCenterY = (topSFCenter + bottomSFCenter) / 2 - MATCH_HEIGHT / 2;

        return (
          <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: finalCenterY }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">M104 - Final</div>
            <AdminBracketMatch match={final} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            {final.selectedWinner && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded text-center" style={{ width: MATCH_WIDTH }}>
                <div className="text-[10px] text-yellow-700 mb-1">Campeon</div>
                <div className="flex items-center justify-center gap-2">
                  <img src={getTeamById(final.selectedWinner)?.flag_url} alt="" className="w-6 h-4 object-cover rounded" />
                  <span className="text-sm font-bold">{getTeamById(final.selectedWinner)?.name}</span>
                  <span>🏆</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3rd Place - below Final */}
      {(() => {
        const topSFCenter = (getMatchCenterY(0, R32_GAP) + getMatchCenterY(7, R32_GAP)) / 2;
        const bottomSFCenter = (getMatchCenterY(8, R32_GAP) + getMatchCenterY(15, R32_GAP)) / 2;
        const finalCenterY = (topSFCenter + bottomSFCenter) / 2 - MATCH_HEIGHT / 2;
        const thirdPlaceTop = finalCenterY + MATCH_HEIGHT + 130;

        return (
          <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: thirdPlaceTop }}>
            <div className="text-[9px] text-muted-foreground mb-0.5">M103 - 3er Puesto</div>
            <AdminBracketMatch match={thirdPlace} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        );
      })()}
    </div>
  );
}

export default AdminBracket;
