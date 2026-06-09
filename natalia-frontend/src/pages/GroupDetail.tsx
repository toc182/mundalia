import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { groupsAPI, predictionSetsAPI } from '@/services/api';
import type { GroupDetails, GroupLeaderboardEntry, LinkablePrediction } from '@/services/api';
import { usePredictionStatus } from '@/hooks/usePredictionStatus';
import { ArrowLeft, Copy, Check, Trophy, Plus, Link2, X, Users, Lock } from 'lucide-react';

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function GroupDetail(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { status: predictionStatus } = usePredictionStatus();
  const predictionsOpen = predictionStatus?.isOpen ?? true;

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [leaderboard, setLeaderboard] = useState<GroupLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [copied, setCopied] = useState<boolean>(false);

  // Link existing dialog
  const [linkOpen, setLinkOpen] = useState<boolean>(false);
  const [linkable, setLinkable] = useState<LinkablePrediction[]>([]);
  const [loadingLinkable, setLoadingLinkable] = useState<boolean>(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Create prediction dialog
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newMode, setNewMode] = useState<'positions' | 'scores'>('positions');
  const [creating, setCreating] = useState<boolean>(false);

  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const flash = (type: 'success' | 'error', text: string): void => {
    setMessage({ type, text });
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadAll = async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailsRes, lbRes] = await Promise.all([
        groupsAPI.getDetails(id),
        groupsAPI.getLeaderboard(id),
      ]);
      setGroup(detailsRes.data);
      setLeaderboard(lbRes.data);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error('Error loading group:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadLeaderboard = async (): Promise<void> => {
    if (!id) return;
    try {
      const lbRes = await groupsAPI.getLeaderboard(id);
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error('Error reloading leaderboard:', err);
    }
  };

  const copyCode = (): void => {
    if (!group) return;
    navigator.clipboard.writeText(group.code);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const openLinkDialog = async (): Promise<void> => {
    if (!id) return;
    setLinkOpen(true);
    setLoadingLinkable(true);
    try {
      const res = await groupsAPI.getLinkable(id);
      setLinkable(res.data);
    } catch (err) {
      console.error('Error loading linkable predictions:', err);
      setLinkable([]);
    } finally {
      setLoadingLinkable(false);
    }
  };

  const handleLink = async (publicId: string): Promise<void> => {
    if (!id) return;
    setLinkingId(publicId);
    try {
      await groupsAPI.linkPrediction(id, publicId);
      await reloadLeaderboard();
      setLinkOpen(false);
      flash('success', t('privateGroups.predictionLinked'));
    } catch (err: any) {
      if (err.response?.status === 409) {
        flash('error', t('privateGroups.alreadyLinkedError'));
      } else if (err.response?.status === 403) {
        flash('error', t('privateGroups.predictionsClosed'));
      } else {
        flash('error', t('privateGroups.linkError'));
      }
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlink = async (publicId: string): Promise<void> => {
    if (!id) return;
    try {
      await groupsAPI.unlinkPrediction(id, publicId);
      setLeaderboard(prev => prev.filter(e => e.public_id !== publicId));
      flash('success', t('privateGroups.predictionUnlinked'));
    } catch (err: any) {
      if (err.response?.status === 403) {
        flash('error', t('privateGroups.predictionsClosed'));
      } else {
        flash('error', t('privateGroups.linkError'));
      }
    }
  };

  const handleCreateForGroup = async (): Promise<void> => {
    if (!id || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await predictionSetsAPI.create(newName.trim(), newMode);
      const publicId = res.data.public_id;
      await groupsAPI.linkPrediction(id, publicId);
      const route = newMode === 'scores' ? '/grupos-marcadores' : '/grupos';
      navigate(`${route}?setId=${publicId}`);
    } catch (err) {
      flash('error', t('privateGroups.createError'));
      setCreating(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (notFound) {
    return <Navigate to="/mis-grupos" />;
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

  if (!group) return <Navigate to="/mis-grupos" />;

  const unlinkedCount = linkable.filter(p => !p.is_linked).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/mis-grupos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        {t('privateGroups.backToGroups')}
      </Link>

      {message.text && (
        <Alert className="mb-4" variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {group.member_count} {t('privateGroups.members')}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-mono hover:bg-muted/80 transition-colors"
            >
              {group.code}
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        {predictionsOpen && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openLinkDialog}>
              <Link2 className="h-4 w-4 mr-2" />
              {t('privateGroups.linkPrediction')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('privateGroups.createForGroup')}
            </Button>
          </div>
        )}
      </div>

      {!predictionsOpen && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
          <Lock className="h-4 w-4 shrink-0" />
          {t('privateGroups.predictionsClosed')}
        </div>
      )}

      {/* Ranking */}
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-yellow-500" />
        {t('privateGroups.groupRanking')}
      </h2>

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-1">{t('privateGroups.noLinkedPredictions')}</p>
            {predictionsOpen && (
              <>
                <p className="text-sm text-muted-foreground mb-4">{t('privateGroups.noLinkedPredictionsDesc')}</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={openLinkDialog}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {t('privateGroups.linkPrediction')}
                  </Button>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('privateGroups.createForGroup')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.public_id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${entry.is_mine ? 'bg-primary/10 border-primary/30' : 'bg-card'}`}
            >
              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                index === 2 ? 'bg-amber-600 text-amber-100' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{entry.prediction_name}</span>
                  {!entry.is_complete && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {t('privateGroups.incomplete')}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate block">{entry.owner_name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold">{entry.total_points}</span>
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </div>
              {entry.is_mine && predictionsOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  title={t('privateGroups.unlink')}
                  onClick={() => handleUnlink(entry.public_id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link existing dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('privateGroups.linkDialogTitle')}</DialogTitle>
            <DialogDescription>{t('privateGroups.linkDialogDesc')}</DialogDescription>
          </DialogHeader>
          {loadingLinkable ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : unlinkedCount === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {t('privateGroups.noPredictionsToLink')}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {linkable.filter(p => !p.is_linked).map(pred => (
                <div key={pred.public_id} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                  <span className="font-medium truncate">{pred.name}</span>
                  <Button
                    size="sm"
                    disabled={linkingId === pred.public_id}
                    onClick={() => handleLink(pred.public_id)}
                  >
                    {t('privateGroups.link')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create prediction dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('privateGroups.createForGroup')}</DialogTitle>
            <DialogDescription>{t('privateGroups.createForGroupDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="predName">{t('privateGroups.groupName') /* generic name label */}</Label>
              <Input
                id="predName"
                placeholder={t('predictions.namePlaceholder')}
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('privateGroups.mode')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newMode === 'positions' ? 'default' : 'outline'}
                  onClick={() => setNewMode('positions')}
                >
                  {t('predictions.modePositions')}
                </Button>
                <Button
                  type="button"
                  variant={newMode === 'scores' ? 'default' : 'outline'}
                  onClick={() => setNewMode('scores')}
                >
                  {t('predictions.modeScores')}
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={creating || !newName.trim()}
              onClick={handleCreateForGroup}
            >
              {creating ? t('common.creating') : t('predictions.createAndStart')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
