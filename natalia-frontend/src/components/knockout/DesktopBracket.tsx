import MatchBox from '@/components/MatchBox';
import type {
  DesktopBracketMatchProps,
  FullBracketProps,
  BuildR32Match,
  BuildKnockoutMatch,
} from '@/types/knockout';
import { toMatchTeam } from '@/types/knockout';

// Desktop bracket match wrapper using unified MatchBox component
export function DesktopBracketMatch({
  match,
  predictionMode,
  knockoutScores,
  onScoreChange,
  onSelectWinner,
  matchWidth
}: DesktopBracketMatchProps): React.JSX.Element | null {
  if (!match) return null;
  const showScoreInputs = predictionMode === 'scores';
  const score = knockoutScores[match.matchId] || {};

  return (
    <div style={{ width: matchWidth }} className="shrink-0">
      <MatchBox
        teamA={toMatchTeam(match.teamA)}
        teamB={toMatchTeam(match.teamB)}
        selectedWinner={match.selectedWinner}
        onSelectWinner={(teamId) => onSelectWinner(match.matchId, typeof teamId === 'string' ? parseInt(teamId, 10) : teamId)}
        showScores={showScoreInputs}
        scoreA={score.a}
        scoreB={score.b}
        onScoreChange={(side, value) => {
          onScoreChange(
            match.matchId,
            match.teamA?.id,
            match.teamB?.id,
            side === 'a' ? value : score.a,
            side === 'b' ? value : score.b
          );
        }}
        size="sm"
      />
    </div>
  );
}

// Full horizontal bracket for desktop
export function FullBracket({
  r32Matches,
  r16Matches,
  qfMatches,
  sfMatches,
  final,
  thirdPlace,
  onSelectWinner,
  getTeamById,
  predictionMode,
  knockoutScores,
  onScoreChange
}: FullBracketProps): React.JSX.Element {
  const showScoreInputs = predictionMode === 'scores';

  // Visual order for bracket (according to FIFA structure)
  const r32VisualOrder = [
    'M74', 'M77',  // → M89
    'M73', 'M75',  // → M90
    'M83', 'M84',  // → M93
    'M81', 'M82',  // → M94
    'M76', 'M78',  // → M91
    'M79', 'M80',  // → M92
    'M86', 'M88',  // → M95
    'M85', 'M87',  // → M96
  ];

  const r16VisualOrder = [
    'M89', 'M90',  // → M97
    'M93', 'M94',  // → M98
    'M91', 'M92',  // → M99
    'M95', 'M96',  // → M100
  ];

  const qfVisualOrder = [
    'M97', 'M98',   // → M101
    'M99', 'M100',  // → M102
  ];

  const sfVisualOrder = ['M101', 'M102']; // → M104 (Final)

  // Reorder matches according to visual order
  const getMatchById = (matches: (BuildR32Match | BuildKnockoutMatch)[], id: string): BuildR32Match | BuildKnockoutMatch | undefined =>
    matches.find(m => m.matchId === id);

  const r32Ordered = r32VisualOrder.map(id => getMatchById(r32Matches, id)).filter(Boolean) as BuildR32Match[];
  const r16Ordered = r16VisualOrder.map(id => getMatchById(r16Matches, id)).filter(Boolean) as BuildKnockoutMatch[];
  const qfOrdered = qfVisualOrder.map(id => getMatchById(qfMatches, id)).filter(Boolean) as BuildKnockoutMatch[];
  const sfOrdered = sfVisualOrder.map(id => getMatchById(sfMatches, id)).filter(Boolean) as BuildKnockoutMatch[];

  // Dimension constants (in pixels)
  const MATCH_HEIGHT = showScoreInputs ? 60 : 52;
  const MATCH_WIDTH = showScoreInputs ? 180 : 140;
  const CONNECTOR_WIDTH = 24;
  const TITLE_HEIGHT = 24;

  // Gaps between matches for each round
  const R32_GAP = 8;
  const R16_GAP = R32_GAP + MATCH_HEIGHT + R32_GAP;
  const QF_GAP = R16_GAP + MATCH_HEIGHT + R16_GAP;
  const SF_GAP = QF_GAP + MATCH_HEIGHT + QF_GAP;

  // Calculate Y center position of a match
  const getMatchCenterY = (index: number, gap: number): number => {
    return TITLE_HEIGHT + (MATCH_HEIGHT / 2) + index * (MATCH_HEIGHT + gap);
  };

  // Calculate total column height
  const getColumnHeight = (count: number, gap: number): number => {
    return TITLE_HEIGHT + count * MATCH_HEIGHT + (count - 1) * gap;
  };

  const r32Height = getColumnHeight(16, R32_GAP);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="relative min-w-max" style={{ height: r32Height + 100 }}>

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
            <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
          </div>
        ))}

        {/* R32 → R16 Connectors */}
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
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* R16 → QF Connectors */}
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
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* QF → SF Connectors */}
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
              <DesktopBracketMatch match={match} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })}

        {/* SF → Final Connectors */}
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
              <DesktopBracketMatch match={final} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
              {final.selectedWinner && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded text-center" style={{ width: MATCH_WIDTH }}>
                  <div className="text-[10px] text-yellow-700 mb-1">Campeón</div>
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
          const thirdPlaceTop = finalCenterY + MATCH_HEIGHT + 120;

          return (
            <div className="absolute" style={{ left: (MATCH_WIDTH + CONNECTOR_WIDTH) * 4, top: thirdPlaceTop }}>
              <div className="text-xs font-semibold text-center text-muted-foreground mb-2" style={{ width: MATCH_WIDTH }}>3er Puesto</div>
              <DesktopBracketMatch match={thirdPlace} predictionMode={predictionMode} knockoutScores={knockoutScores} onScoreChange={onScoreChange} onSelectWinner={onSelectWinner} matchWidth={MATCH_WIDTH} />
            </div>
          );
        })()}

      </div>
    </div>
  );
}

export default FullBracket;
