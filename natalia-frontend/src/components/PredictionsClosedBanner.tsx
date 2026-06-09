import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { usePredictionStatus } from '@/hooks/usePredictionStatus';

/**
 * Destructive banner shown on prediction-editing pages when predictions are closed
 * (past the global deadline). Renders nothing while loading or when still open.
 */
export default function PredictionsClosedBanner(): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const { status, loading } = usePredictionStatus();

  if (loading || status?.isOpen !== false) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <Lock className="h-4 w-4" />
      <AlertDescription className="ml-2">
        <strong>{t('predictions.closed')}.</strong> {t('predictions.closedDesc')}
        {status?.deadline && (
          <span className="block mt-1 text-sm opacity-90">
            {t('predictions.closedOn')} {new Date(status.deadline).toLocaleDateString(i18n.language, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
