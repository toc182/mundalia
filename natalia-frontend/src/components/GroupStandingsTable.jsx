/**
 * Displays calculated group standings table
 * Shows: Position, Flag, Team, Played, W, D, L, GF, GA, GD, Points
 */

export default function GroupStandingsTable({ standings, isComplete }) {
  if (!standings || standings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4 text-sm">
        Ingresa los marcadores para ver la tabla
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Tabla de Posiciones {isComplete && <span className="text-green-600">(Completa)</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 w-6">#</th>
              <th className="text-left py-1">Equipo</th>
              <th className="text-center py-1 w-6">PJ</th>
              <th className="text-center py-1 w-6">G</th>
              <th className="text-center py-1 w-6">E</th>
              <th className="text-center py-1 w-6">P</th>
              <th className="text-center py-1 w-8">GF</th>
              <th className="text-center py-1 w-8">GC</th>
              <th className="text-center py-1 w-8">DG</th>
              <th className="text-center py-1 w-8 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => {
              // Position 1-2 qualify (green), 3 may qualify (yellow), 4 out
              const bgClass = index < 2
                ? 'bg-green-50'
                : index === 2
                  ? 'bg-yellow-50'
                  : '';

              return (
                <tr key={team.teamId} className={`border-b last:border-b-0 ${bgClass}`}>
                  <td className="py-1.5 font-medium">{team.position}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      {team.flagUrl && (
                        <img
                          src={team.flagUrl}
                          alt={team.teamCode}
                          className="w-5 h-3.5 object-cover rounded"
                        />
                      )}
                      <span className="truncate max-w-[80px]" title={team.teamName}>
                        {team.teamCode || team.teamName?.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-1.5">{team.played}</td>
                  <td className="text-center py-1.5">{team.won}</td>
                  <td className="text-center py-1.5">{team.drawn}</td>
                  <td className="text-center py-1.5">{team.lost}</td>
                  <td className="text-center py-1.5">{team.goalsFor}</td>
                  <td className="text-center py-1.5">{team.goalsAgainst}</td>
                  <td className="text-center py-1.5">
                    <span className={team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </span>
                  </td>
                  <td className="text-center py-1.5 font-bold">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
