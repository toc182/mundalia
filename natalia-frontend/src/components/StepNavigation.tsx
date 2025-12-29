import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface StepNavigationProps {
  onBack?: () => void;
  onNext: () => void;
  isComplete: boolean;
  saving?: boolean;
  size?: ButtonSize;
  showBack?: boolean;
  nextLabel?: string;
  savingLabel?: string;
  backLabel?: string;
  showFinish?: boolean;
  finishLabel?: string;
  disabled?: boolean;
}

export function StepNavigation({
  onBack,
  onNext,
  isComplete,
  saving = false,
  size = 'default',
  showBack = true,
  nextLabel = 'Siguiente',
  savingLabel = 'Guardando...',
  backLabel = 'Atrás',
  showFinish = false,
  finishLabel = 'Finalizar',
  disabled = false,
}: StepNavigationProps): JSX.Element {
  const buttonLabel = saving ? savingLabel : (showFinish ? finishLabel : nextLabel);

  return (
    <div className="flex justify-between items-center">
      {showBack && onBack ? (
        <Button variant="outline" onClick={onBack} size={size} disabled={saving}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </Button>
      ) : (
        <div /> // Placeholder for flex spacing
      )}
      <Button
        onClick={onNext}
        disabled={!isComplete || saving || disabled}
        size={size}
      >
        {buttonLabel}
        {!saving && <ChevronRight className="ml-1 h-4 w-4" />}
      </Button>
    </div>
  );
}

export default StepNavigation;
