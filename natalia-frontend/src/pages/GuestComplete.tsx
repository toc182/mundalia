import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, UserPlus, Share } from 'lucide-react';
import { getAllGroups } from '@/data/mockData';
import { getTeamById } from '@/utils/predictionHelpers';
import { exportToCanvas } from '@/utils/exportCanvas';
import { finalMatch } from '@/data/knockoutBracket';

export default function GuestComplete(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // Load predictions from localStorage
  const predictions: Record<string, number[]> = JSON.parse(
    localStorage.getItem('natalia_predictions') || '{}'
  );
  const bestThirdPlaces: string[] = JSON.parse(
    localStorage.getItem('natalia_best_third_places') || '[]'
  );
  const knockoutPredictions: Record<string, number> = JSON.parse(
    localStorage.getItem('natalia_knockout') || '{}'
  );

  // Redirect if no data
  useEffect(() => {
    if (Object.keys(predictions).length === 0) {
      navigate('/play', { replace: true });
    }
  }, []);

  // Stats
  const completedGroups = getAllGroups().filter(g => predictions[g]?.length === 4).length;
  const totalKnockout = Object.keys(knockoutPredictions).length;

  // Champion
  const championId = knockoutPredictions[finalMatch.matchId];
  const champion = championId ? getTeamById(championId) : null;

  // Check if Web Share API with files is supported
  const canShareFiles = (): boolean => {
    return navigator.share !== undefined && navigator.canShare !== undefined;
  };

  // Convert data URL to Blob
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const dataUrl = await exportToCanvas({
        predictionName: t('guest.predictionName'),
        predictions,
        knockoutPredictions,
        bestThirdPlaces,
        getTeamById,
      });

      const fileName = 'mundalia_prediction.png';

      // Try Web Share API first (iOS)
      if (canShareFiles()) {
        try {
          const blob = dataUrlToBlob(dataUrl);
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Mundalia' });
            return;
          }
        } catch (shareErr) {
          if ((shareErr as Error).name !== 'AbortError') {
            console.log('Share failed, falling back to download');
          }
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleRegister = (): void => {
    const groupCode = localStorage.getItem('guest_group_code');
    const params = new URLSearchParams({ from: 'guest' });
    if (groupCode) params.set('group', groupCode);
    navigate(`/register?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      {/* Champion Display */}
      {champion && (
        <Card className="mb-6 border-yellow-400 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl">🏆</span>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('guest.yourChampion')}</p>
                <div className="flex items-center gap-3">
                  <img
                    src={champion.flag_url}
                    alt={champion.name}
                    className="w-12 h-8 object-cover rounded shadow"
                  />
                  <span className="text-2xl font-bold">{champion.name}</span>
                </div>
              </div>
              <span className="text-4xl">🏆</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('guest.completeTitle')}</CardTitle>
          <p className="text-muted-foreground">{t('guest.completeSubtitle')}</p>
        </CardHeader>
        <CardContent>
          {/* Progress Summary */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <Badge variant={completedGroups === 12 ? 'default' : 'secondary'}>
              {t('nav.groups')}: {completedGroups}/12
            </Badge>
            <Badge variant={bestThirdPlaces.length === 8 ? 'default' : 'secondary'}>
              {t('thirdPlaces.title')}: {bestThirdPlaces.length}/8
            </Badge>
            <Badge variant={totalKnockout >= 32 ? 'default' : 'secondary'}>
              Bracket: {totalKnockout}/32
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : canShareFiles() ? (
                <Share className="h-4 w-4 mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {canShareFiles() ? t('export.share') : t('export.button')}
            </Button>

            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={handleRegister}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t('guest.createAccount')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('guest.browserWarning')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
