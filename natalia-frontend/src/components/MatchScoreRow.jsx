/**
 * Row component for entering a single match score
 * Shows: [Flag] Team A Name [__] - [__] Team B Name [Flag]
 *
 * tabIndexBase: optional base tabIndex for keyboard navigation
 * - If provided, scoreA gets tabIndexBase, scoreB gets tabIndexBase + 1
 */

export default function MatchScoreRow({
  teamA,
  teamB,
  scoreA,
  scoreB,
  onChange,
  disabled = false,
  tabIndexBase = null
}) {
  const handleScoreChange = (side, value) => {
    // Remove any non-digit characters (prevents decimals, negatives, etc.)
    const cleaned = value.replace(/[^0-9]/g, '');

    // Allow empty string for clearing, otherwise parse to number 0-99
    const parsed = cleaned === '' ? '' : Math.min(99, Math.max(0, parseInt(cleaned, 10)));

    if (side === 'a') {
      onChange(parsed, scoreB);
    } else {
      onChange(scoreA, parsed);
    }
  };

  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-b-0">
      {/* Team A */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="text-sm font-medium truncate text-right">
          {teamA?.name || 'TBD'}
        </span>
        {teamA?.flag_url && (
          <img
            src={teamA.flag_url}
            alt={teamA.code}
            className="w-6 h-4 object-cover rounded flex-shrink-0"
          />
        )}
      </div>

      {/* Score inputs */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={scoreA ?? ''}
          onChange={(e) => handleScoreChange('a', e.target.value)}
          disabled={disabled}
          tabIndex={tabIndexBase !== null ? tabIndexBase : undefined}
          className="w-10 h-8 text-center border rounded text-lg font-bold
                     focus:outline-none focus:ring-2 focus:ring-primary
                     disabled:bg-muted disabled:cursor-not-allowed"
          placeholder="-"
        />
        <span className="text-muted-foreground font-bold">-</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={scoreB ?? ''}
          onChange={(e) => handleScoreChange('b', e.target.value)}
          disabled={disabled}
          tabIndex={tabIndexBase !== null ? tabIndexBase + 1 : undefined}
          className="w-10 h-8 text-center border rounded text-lg font-bold
                     focus:outline-none focus:ring-2 focus:ring-primary
                     disabled:bg-muted disabled:cursor-not-allowed"
          placeholder="-"
        />
      </div>

      {/* Team B */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {teamB?.flag_url && (
          <img
            src={teamB.flag_url}
            alt={teamB.code}
            className="w-6 h-4 object-cover rounded flex-shrink-0"
          />
        )}
        <span className="text-sm font-medium truncate">
          {teamB?.name || 'TBD'}
        </span>
      </div>
    </div>
  );
}
