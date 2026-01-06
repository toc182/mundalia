import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import { statsAPI, type CommunityStats as CommunityStatsType } from '@/services/api';

export default function CommunityStats(): JSX.Element | null {
  const { t } = useTranslation();
  const [stats, setStats] = useState<CommunityStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await statsAPI.getCommunityStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error loading community stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  // Don't show if no data or still loading
  if (loading || !stats || stats.totalPredictions === 0) {
    return null;
  }

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">{t('stats.communityTitle')}</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Champions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {t('stats.topChampions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topChampions.slice(0, 5).map((team, index) => (
                <div key={team.teamId} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <img
                    src={team.flagUrl}
                    alt={team.teamCode}
                    className="w-8 h-5 object-cover rounded shadow-sm"
                  />
                  <span className="flex-1 font-medium">{team.teamName}</span>
                  <div className="text-right">
                    <span className="font-bold text-primary">{team.percentage}%</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({team.pickCount})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Finalists */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              {t('stats.topFinalists')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topFinalists.slice(0, 5).map((team, index) => (
                <div key={team.teamId} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <img
                    src={team.flagUrl}
                    alt={team.teamCode}
                    className="w-8 h-5 object-cover rounded shadow-sm"
                  />
                  <span className="flex-1 font-medium">{team.teamName}</span>
                  <div className="text-right">
                    <span className="font-bold text-primary">{team.percentage}%</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({team.pickCount})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controversial Groups */}
      {stats.controversialGroups.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-orange-500" />
              {t('stats.controversialGroups')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {stats.controversialGroups.map(group => (
                <div key={group.group} className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-bold text-center mb-3">
                    {t('groups.group')} {group.group}
                  </h4>
                  <div className="space-y-2">
                    {group.teams.slice(0, 4).map((team, idx) => {
                      const totalVotes = group.teams.reduce((sum, t) => sum + t.pos1, 0);
                      const percentage = totalVotes > 0 ? Math.round((team.pos1 / totalVotes) * 100) : 0;
                      return (
                        <div key={team.teamId} className="flex items-center gap-2 text-sm">
                          <img
                            src={team.flagUrl}
                            alt={team.teamCode}
                            className="w-6 h-4 object-cover rounded"
                          />
                          <span className="flex-1 truncate">{team.teamName}</span>
                          <span className="font-medium text-xs text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3">
              {t('stats.controversialDesc')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Total predictions count */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        {t('stats.basedOn', { count: stats.totalPredictions })}
      </p>
    </div>
  );
}
