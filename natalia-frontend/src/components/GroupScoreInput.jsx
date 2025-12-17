/**
 * Card component for a single group's score inputs
 * Shows 6 matches grouped by match day + calculated standings table
 */

import { RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import MatchScoreRow from './MatchScoreRow';
import GroupStandingsTable from './GroupStandingsTable';
import { GROUP_MATCH_STRUCTURE, getMatchTeams } from '../data/groupMatches';

// Calculate tabIndex base for a group (A=0, B=1, ... L=11)
// Each group has 6 matches × 2 inputs = 12 inputs
const getGroupTabOffset = (groupLetter) => {
  const groupIndex = groupLetter.charCodeAt(0) - 'A'.charCodeAt(0);
  return groupIndex * 12 + 1; // Start at 1, not 0
};

export default function GroupScoreInput({
  group,
  teams,
  scores,
  standings,
  isComplete,
  isIncomplete = false,
  unresolvableTie,
  onScoreChange,
  onResolveTie,
  onReset,
  disabled = false,
}) {
  // Base tabIndex for this group's inputs
  const groupTabOffset = getGroupTabOffset(group);
  // Group matches by match day
  const matchesByDay = {
    1: GROUP_MATCH_STRUCTURE.filter(m => m.matchDay === 1),
    2: GROUP_MATCH_STRUCTURE.filter(m => m.matchDay === 2),
    3: GROUP_MATCH_STRUCTURE.filter(m => m.matchDay === 3),
  };

  // Count completed matches
  const completedCount = Object.values(scores || {}).filter(
    s => s && s.a !== undefined && s.b !== undefined && s.a !== '' && s.b !== ''
  ).length;

  // Determine card border color
  const getBorderClass = () => {
    if (isIncomplete) return 'border-red-500 border-2';
    if (isComplete && unresolvableTie) return 'border-yellow-400 border-2';
    return '';
  };

  // Check if there are any scores to reset
  const hasScores = Object.keys(scores || {}).length > 0;

  return (
    <Card className={getBorderClass()}>
      <CardHeader className="py-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Grupo {group}</span>
          <div className="flex items-center gap-2">
            {hasScores && onReset && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-muted-foreground hover:text-destructive"
                onClick={onReset}
                title="Limpiar marcadores"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/6 partidos
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Match days */}
        {[1, 2, 3].map(day => (
          <div key={day}>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Jornada {day}
            </div>
            <div className="space-y-1">
              {matchesByDay[day].map(match => {
                const { teamA, teamB } = getMatchTeams(teams, match.matchNumber);
                const score = scores?.[match.matchNumber] || {};
                // Calculate tabIndex: groupOffset + (matchNumber-1)*2
                // Each match uses 2 tab indices (scoreA, scoreB)
                const tabIndexBase = groupTabOffset + (match.matchNumber - 1) * 2;

                return (
                  <MatchScoreRow
                    key={match.matchNumber}
                    teamA={teamA}
                    teamB={teamB}
                    scoreA={score.a}
                    scoreB={score.b}
                    onChange={(a, b) => onScoreChange(match.matchNumber, a, b)}
                    disabled={disabled}
                    tabIndexBase={tabIndexBase}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Unresolvable tie warning - only show if group is complete */}
        {isComplete && unresolvableTie && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
            <p className="text-sm text-yellow-800">{unresolvableTie.reason}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              onClick={onResolveTie}
            >
              Resolver empate
            </Button>
          </div>
        )}

        {/* Standings table */}
        <GroupStandingsTable standings={standings} isComplete={isComplete} />
      </CardContent>
    </Card>
  );
}
