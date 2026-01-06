import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Lock, Clock } from 'lucide-react';
import { predictionSetsAPI, settingsAPI, type PredictionModes } from '@/services/api';
import CountdownTimer from '@/components/CountdownTimer';
import CommunityStats from '@/components/CommunityStats';
import { usePredictionStatus } from '@/hooks/usePredictionStatus';

// World Cup 2026 starts June 11, 2026 at 12:00 Mexico City time (UTC-6)
const WORLD_CUP_START = new Date('2026-06-11T18:00:00Z');

export default function Home(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newMode, setNewMode] = useState<'positions' | 'scores'>('positions');
  const [saving, setSaving] = useState<boolean>(false);
  const [availableModes, setAvailableModes] = useState<PredictionModes>('both');

  // Check if predictions are open
  const { status: predictionStatus, loading: statusLoading } = usePredictionStatus();
  const predictionsOpen = predictionStatus?.isOpen ?? true;

  // Load available prediction modes
  useEffect(() => {
    const loadAvailableModes = async () => {
      try {
        const response = await settingsAPI.getPredictionModes();
        const modes = (response.data as any).modes || 'both';
        setAvailableModes(modes);
        if (modes === 'positions') {
          setNewMode('positions');
        } else if (modes === 'scores') {
          setNewMode('scores');
        }
      } catch (err) {
        console.error('Error loading prediction modes:', err);
      }
    };
    loadAvailableModes();
  }, []);

  // Get locale for date formatting
  const dateLocale = i18n.language === 'zh' ? 'zh-CN' : i18n.language;

  // Abrir modal si viene de menu con ?newPrediction=true
  useEffect(() => {
    if (searchParams.get('newPrediction') === 'true' && predictionsOpen) {
      setShowCreateDialog(true);
      // Limpiar el query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, predictionsOpen]);

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const response = await predictionSetsAPI.create(newName.trim(), newMode);
      setShowCreateDialog(false);
      setNewName('');
      setNewMode('positions');
      navigate(`/repechajes?setId=${response.data.id}`);
    } catch (err) {
      console.error('Error creating prediction set:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">{t('home.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="max-w-2xl mx-auto mb-10">
        <CountdownTimer targetDate={WORLD_CUP_START} title={t('home.countdownTitle')} />
        {/* Predictions deadline info */}
        {!statusLoading && predictionsOpen && predictionStatus?.deadline && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            {t('home.predictionsCloseAt')}{' '}
            <span className="font-medium">
              {new Date(predictionStatus.deadline).toLocaleDateString(dateLocale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </p>
        )}
      </div>

      {/* Predictions Closed Alert */}
      {!statusLoading && !predictionsOpen && (
        <div className="max-w-2xl mx-auto mb-6">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>{t('predictions.closed')}.</strong> {t('predictions.closedDesc')}
              {predictionStatus?.deadline && (
                <span className="block mt-1 text-sm opacity-90">
                  {t('predictions.closedOn')} {new Date(predictionStatus.deadline).toLocaleDateString(dateLocale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Card className={`hover:shadow-lg transition-shadow ${!predictionsOpen ? 'opacity-60' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {!predictionsOpen && <Lock className="h-4 w-4 text-muted-foreground" />}
              {t('home.makePredictions')}
            </CardTitle>
            <CardDescription>
              {predictionsOpen
                ? t('home.makePredictionsDesc')
                : t('predictions.closed')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowCreateDialog(true)}
              disabled={!predictionsOpen || statusLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('home.newPrediction')}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{t('home.viewPredictions')}</CardTitle>
            <CardDescription>
              {t('home.viewPredictionsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/mis-predicciones">{t('nav.myPredictions')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{t('home.viewRanking')}</CardTitle>
            <CardDescription>
              {t('home.viewRankingDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/ranking">{t('nav.ranking')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>{t('home.myGroups')}</CardTitle>
            <CardDescription>
              {t('home.myGroupsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/mis-grupos">{t('nav.groups')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Community Stats */}
      <CommunityStats />

      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">{t('home.pointsSystem')}</h2>
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('home.prediction')}</th>
                  <th className="text-right py-2">{t('common.points')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-muted/30">
                  <td colSpan={2} className="py-2 font-medium text-muted-foreground">{t('home.groupPhase')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.exactPosition')}</td>
                  <td className="text-right font-semibold">3 {t('common.points')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.teamQualifies')}</td>
                  <td className="text-right font-semibold">1 pt</td>
                </tr>
                <tr className="border-b bg-muted/30">
                  <td colSpan={2} className="py-2 font-medium text-muted-foreground">{t('home.knockoutPhase')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.r32Winner')}</td>
                  <td className="text-right font-semibold">1 pt {t('home.each')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.r16Winner')}</td>
                  <td className="text-right font-semibold">2 {t('common.points')} {t('home.each')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.qfWinner')}</td>
                  <td className="text-right font-semibold">4 {t('common.points')} {t('home.each')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.sfWinner')}</td>
                  <td className="text-right font-semibold">6 {t('common.points')} {t('home.each')}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">{t('home.thirdPlace')}</td>
                  <td className="text-right font-semibold">8 {t('common.points')}</td>
                </tr>
                <tr>
                  <td className="py-2">{t('home.champion')}</td>
                  <td className="text-right font-semibold">15 {t('common.points')}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

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
            placeholder={t('predictions.namePlaceholder')}
            value={newName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
          />

          {/* Mode selector - only show if both modes available */}
          {availableModes === 'both' ? (
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
          ) : (
            <div className="pt-2 p-3 rounded-lg bg-muted/50">
              <div className="font-medium">
                {availableModes === 'positions' ? t('predictions.modePositions') : t('predictions.modeScores')}
              </div>
              <div className="text-sm text-muted-foreground">
                {availableModes === 'positions' ? t('predictions.modePositionsDesc') : t('predictions.modeScoresDesc')}
              </div>
            </div>
          )}

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
    </div>
  );
}
