import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminAPI } from '@/services/api';
import { Shield, Trophy, ListOrdered } from 'lucide-react';
import { StatsTab, PlayoffsTab, GroupsTab, KnockoutTab } from '@/components/admin';
import type { AdminStats } from '@/types';
import type { TabItem, RealPlayoffResult, RealGroupMatch, RealGroupStanding, RealKnockoutResult } from '@/types/admin';

export default function Admin(): JSX.Element {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real results from database
  const [realPlayoffs, setRealPlayoffs] = useState<RealPlayoffResult[]>([]);
  const [realGroupMatches, setRealGroupMatches] = useState<RealGroupMatch[]>([]);
  const [realGroupStandings, setRealGroupStandings] = useState<RealGroupStanding[]>([]);
  const [realKnockout, setRealKnockout] = useState<RealKnockoutResult[]>([]);

  // Timer ref for cleanup
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const [statsRes, playoffsRes, matchesRes, standingsRes, knockoutRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPlayoffs(),
        adminAPI.getGroupMatches(),
        adminAPI.getGroupStandings(),
        adminAPI.getKnockout()
      ]);
      setStats(statsRes.data);
      setRealPlayoffs(playoffsRes.data);
      setRealGroupMatches(matchesRes.data);
      setRealGroupStandings(standingsRes.data);
      setRealKnockout(knockoutRes.data);
    } catch {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const showSuccess = (msg: string): void => {
    setSuccess(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  };

  const tabs: TabItem[] = [
    { id: 'stats', label: 'Dashboard', icon: Shield },
    { id: 'playoffs', label: 'Repechajes', icon: Trophy },
    { id: 'groups', label: 'Grupos', icon: ListOrdered },
    { id: 'knockout', label: 'Eliminatorias', icon: Trophy },
  ];

  // Check admin access (after hooks)
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>No tienes acceso a esta pagina.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" />
        Panel de Administracion
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <StatsTab stats={stats} />
      )}

      {activeTab === 'playoffs' && (
        <PlayoffsTab
          realPlayoffs={realPlayoffs}
          onSave={loadData}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}

      {activeTab === 'groups' && (
        <GroupsTab
          realPlayoffs={realPlayoffs}
          realGroupMatches={realGroupMatches}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}

      {activeTab === 'knockout' && (
        <KnockoutTab
          realPlayoffs={realPlayoffs}
          realGroupStandings={realGroupStandings}
          realKnockout={realKnockout}
          onSave={loadData}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}
    </div>
  );
}
