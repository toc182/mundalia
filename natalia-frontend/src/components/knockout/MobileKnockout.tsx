import MatchBox from '@/components/MatchBox';
import type {
  MobileMatchBoxProps,
  MobileMatchPairProps,
  MobileKnockoutSlidesProps,
  BuildR32Match,
  BuildKnockoutMatch,
  MatchPair,
} from '@/types/knockout';
import { toMatchTeam } from '@/types/knockout';

// Mobile match box wrapper using unified MatchBox component
export function MobileMatchBox({
  match,
  predictionMode,
  knockoutScores,
  onScoreChange,
  onSelectWinner
}: MobileMatchBoxProps): React.JSX.Element | null {
  if (!match) return null;
  const showScoreInputs = predictionMode === 'scores';
  const score = knockoutScores[match.matchId] || {};

  return (
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
      size="lg"
    />
  );
}

// Match pair component for mobile view
export function MobileMatchPair({
  match1,
  match2,
  nextMatch,
  predictionMode,
  knockoutScores,
  onScoreChange,
  onSelectWinner
}: MobileMatchPairProps): React.JSX.Element {
  const MATCH_H = 64;
  const GAP = 4;
  const TOTAL_H = MATCH_H * 2 + GAP;
  const SVG_W = 20;
  const top1Center = MATCH_H / 2;
  const top2Center = MATCH_H + GAP + MATCH_H / 2;
  const midY = (top1Center + top2Center) / 2;

  return (
    <div className="flex items-center">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <MobileMatchBox
          match={match1}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
        <MobileMatchBox
          match={match2}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
      </div>
      <svg width={SVG_W} height={TOTAL_H} className="shrink-0">
        <line x1="0" y1={top1Center} x2={SVG_W/2} y2={top1Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1="0" y1={top2Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={top1Center} x2={SVG_W/2} y2={top2Center} stroke="#d1d5db" strokeWidth="1" />
        <line x1={SVG_W/2} y1={midY} x2={SVG_W} y2={midY} stroke="#d1d5db" strokeWidth="1" />
      </svg>
      <div className="flex-1 min-w-0">
        <MobileMatchBox
          match={nextMatch}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={onScoreChange}
          onSelectWinner={onSelectWinner}
        />
      </div>
    </div>
  );
}

// Mobile knockout slides container
export function MobileKnockoutSlides({
  r32Matches,
  r16Matches,
  qfMatches,
  sfMatches,
  final,
  thirdPlace,
  predictionMode,
  knockoutScores,
  onScoreChange,
  onSelectWinner,
  scrollContainerRef,
  handleScroll,
  getTeamById
}: MobileKnockoutSlidesProps): React.JSX.Element {
  const r32Pairs: MatchPair[] = [
    { m1: 'M74', m2: 'M77', next: 'M89' },
    { m1: 'M73', m2: 'M75', next: 'M90' },
    { m1: 'M83', m2: 'M84', next: 'M93' },
    { m1: 'M81', m2: 'M82', next: 'M94' },
    { m1: 'M76', m2: 'M78', next: 'M91' },
    { m1: 'M79', m2: 'M80', next: 'M92' },
    { m1: 'M86', m2: 'M88', next: 'M95' },
    { m1: 'M85', m2: 'M87', next: 'M96' },
  ];

  const r16Pairs: MatchPair[] = [
    { m1: 'M89', m2: 'M90', next: 'M97' },
    { m1: 'M93', m2: 'M94', next: 'M98' },
    { m1: 'M91', m2: 'M92', next: 'M99' },
    { m1: 'M95', m2: 'M96', next: 'M100' },
  ];

  const qfPairs: MatchPair[] = [
    { m1: 'M97', m2: 'M98', next: 'M101' },
    { m1: 'M99', m2: 'M100', next: 'M102' },
  ];

  const getMatch = (id: string): BuildR32Match | BuildKnockoutMatch | null => {
    return [...r32Matches, ...r16Matches, ...qfMatches, ...sfMatches].find(m => m.matchId === id) || null;
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Slide 1: R32 → R16 */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Dieciseisavos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Octavos</div>
          </div>
          {r32Pairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 2: R16 → QF */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Octavos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Cuartos</div>
          </div>
          {r16Pairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 3: QF → SF */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Cuartos</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Semifinales</div>
          </div>
          {qfPairs.map((pair, i) => (
            <MobileMatchPair
              key={i}
              match1={getMatch(pair.m1)}
              match2={getMatch(pair.m2)}
              nextMatch={getMatch(pair.next)}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          ))}
        </div>
      </div>

      {/* Slide 4: SF → Final + 3rd Place */}
      <div className="w-full flex-shrink-0 snap-start snap-always px-1">
        <div className="space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground font-medium">
            <div className="flex-1 text-center">Semifinales</div>
            <div className="w-5"></div>
            <div className="flex-1 text-center">Final</div>
          </div>
          <MobileMatchPair
            match1={sfMatches.find(m => m.matchId === 'M101') || null}
            match2={sfMatches.find(m => m.matchId === 'M102') || null}
            nextMatch={final}
            predictionMode={predictionMode}
            knockoutScores={knockoutScores}
            onScoreChange={onScoreChange}
            onSelectWinner={onSelectWinner}
          />

          {final.selectedWinner && (
            <div className="p-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg w-fit">
              <div className="text-[10px] text-yellow-700 mb-1">Campeón</div>
              <div className="flex items-center gap-2">
                <img src={getTeamById(final.selectedWinner)?.flag_url} alt="" className="w-8 h-5 object-cover rounded shadow" />
                <span className="text-sm font-bold">{getTeamById(final.selectedWinner)?.name}</span>
                <span className="text-lg">🏆</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="text-xs font-semibold text-muted-foreground mb-2">3er Puesto</div>
            <MobileMatchBox
              match={thirdPlace}
              predictionMode={predictionMode}
              knockoutScores={knockoutScores}
              onScoreChange={onScoreChange}
              onSelectWinner={onSelectWinner}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileKnockoutSlides;
