import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { predictionSetsAPI } from '@/services/api';
import { Plus, Trash2, Eye, Edit2, Trophy, Lock } from 'lucide-react';
import type { PredictionSet } from '@/types';
import { usePredictionStatus } from '@/hooks/usePredictionStatus';

interface CompletionStatus {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
}

export default function MyPredictions(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [predictionSets, setPredictionSets] = useState<PredictionSet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if predictions are open
  const { status: predictionStatus } = usePredictionStatus();
  const predictionsOpen = predictionStatus?.isOpen ?? true;

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [selectedSet, setSelectedSet] = useState<PredictionSet | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [newMode, setNewMode] = useState<'positions' | 'scores'>('positions');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadPredictionSets();
  }, []);

  const loadPredictionSets = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await predictionSetsAPI.getAll();
      setPredictionSets(response.data);
    } catch (err) {
      setError(t('errors.loadingFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const response = await predictionSetsAPI.create(newName.trim(), newMode);
      setShowCreateDialog(false);
      setNewName('');
      setNewMode('positions');
      // Navigate to start making predictions with the new set
      navigate(`/repechajes?setId=${response.data.id}`);
    } catch (err) {
      setError(t('errors.savingFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedSet) return;
    setSaving(true);
    try {
      await predictionSetsAPI.delete(selectedSet.id);
      setShowDeleteDialog(false);
      setSelectedSet(null);
      loadPredictionSets();
    } catch (err) {
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (set: PredictionSet): void => {
    setSelectedSet(set);
    setShowDeleteDialog(true);
  };

  const getCompletionStatus = (set: PredictionSet): CompletionStatus => {
    const groupComplete = parseInt(String(set.group_count || 0)) >= 48; // 12 grupos * 4 equipos
    const playoffComplete = parseInt(String(set.playoff_count || 0)) >= 6;
    const thirdComplete = !!set.third_places;
    const knockoutComplete = parseInt(String(set.knockout_count || 0)) >= 32;

    if (groupComplete && playoffComplete && thirdComplete && knockoutComplete) {
      return { label: t('predictions.complete'), variant: 'default' };
    }
    if (set.group_count || set.playoff_count || set.third_places || set.knockout_count) {
      return { label: t('predictions.inProgress'), variant: 'secondary' };
    }
    return { label: t('predictions.notStarted'), variant: 'outline' };
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('nav.myPredictions')}</h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('nav.myPredictions')}</h1>
        <Button onClick={() => setShowCreateDialog(true)} disabled={!predictionsOpen}>
          {!predictionsOpen && <Lock className="w-4 h-4 mr-2" />}
          {predictionsOpen && <Plus className="w-4 h-4 mr-2" />}
          {t('predictions.newPrediction')}
        </Button>
      </div>

      {/* Predictions Closed Warning */}
      {!predictionsOpen && (
        <Alert variant="destructive" className="mb-6">
          <Lock className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>{t('predictions.closed')}.</strong> {t('predictions.closedDesc')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {predictionSets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">{t('predictions.noPredictions')}</h3>
            <p className="text-muted-foreground mb-4">
              {predictionsOpen
                ? t('predictions.createFirst')
                : t('predictions.closed')}
            </p>
            <Button onClick={() => setShowCreateDialog(true)} disabled={!predictionsOpen}>
              {!predictionsOpen && <Lock className="w-4 h-4 mr-2" />}
              {predictionsOpen && <Plus className="w-4 h-4 mr-2" />}
              {t('predictions.createPrediction')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {predictionSets.map((set) => {
            const status = getCompletionStatus(set);
            return (
              <Card key={set.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{set.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {t('predictions.created')} {new Date(set.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="flex items-center gap-1">
                      <span className={parseInt(String(set.playoff_count || 0)) >= 6 ? 'text-green-600' : 'text-gray-400'}>
                        {parseInt(String(set.playoff_count || 0)) >= 6 ? '✓' : '○'}
                      </span>
                      <span>{t('playoffs.title')}: {set.playoff_count || 0}/6</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={parseInt(String(set.group_count || 0)) >= 48 ? 'text-green-600' : 'text-gray-400'}>
                        {parseInt(String(set.group_count || 0)) >= 48 ? '✓' : '○'}
                      </span>
                      <span>{t('nav.groups')}: {Math.floor(parseInt(String(set.group_count || 0)) / 4)}/12</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={set.third_places ? 'text-green-600' : 'text-gray-400'}>
                        {set.third_places ? '✓' : '○'}
                      </span>
                      <span>{t('thirdPlaces.title')}: {set.third_places ? 8 : 0}/8</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={parseInt(String(set.knockout_count || 0)) >= 32 ? 'text-green-600' : 'text-gray-400'}>
                        {parseInt(String(set.knockout_count || 0)) >= 32 ? '✓' : '○'}
                      </span>
                      <span>Bracket: {set.knockout_count || 0}/32</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="default"
                      size="sm"
                      asChild
                    >
                      <Link to={`/prediccion/${set.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        {t('common.view')}
                      </Link>
                    </Button>
                    {predictionsOpen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/repechajes?setId=${set.id}`}>
                          <Edit2 className="w-4 h-4 mr-1" />
                          {t('common.edit')}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(set)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('predictions.newPrediction')}</DialogTitle>
            <DialogDescription>
              {t('predictions.nameDescription')}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={t('predictions.namePlaceholder')}
            value={newName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
          />

          {/* Mode selector */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium">{t('predictions.modeLabel')}</label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="positions"
                  checked={newMode === 'positions'}
                  onChange={() => setNewMode('positions')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{t('predictions.modePositions')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('predictions.modePositionsDesc')}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="scores"
                  checked={newMode === 'scores'}
                  onChange={() => setNewMode('scores')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{t('predictions.modeScores')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('predictions.modeScoresDesc')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? t('common.creating') : t('predictions.createAndStart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('predictions.deletePrediction')}</DialogTitle>
            <DialogDescription>
              {t('predictions.deleteConfirm', { name: selectedSet?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
