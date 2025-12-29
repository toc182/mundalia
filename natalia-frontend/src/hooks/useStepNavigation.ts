import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Step {
  path: string;
  label: string;
}

interface UseStepNavigationProps {
  steps: Step[];
  currentStepIndex: number;
  onBeforeNavigate?: () => Promise<boolean> | boolean;
}

interface UseStepNavigationReturn {
  currentStep: Step;
  nextStep: Step | null;
  prevStep: Step | null;
  goToNext: () => Promise<void>;
  goToPrev: () => void;
  goToStep: (index: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  setId: string | null;
}

/**
 * Custom hook for managing step-based navigation in prediction wizard.
 * Handles navigation between steps while preserving setId query parameter.
 *
 * @example
 * const steps = [
 *   { path: '/repechajes', label: 'Repechajes' },
 *   { path: '/grupos', label: 'Grupos' },
 *   { path: '/terceros', label: 'Terceros' },
 *   { path: '/eliminatorias', label: 'Eliminatorias' },
 * ];
 * const { goToNext, goToPrev, isLastStep } = useStepNavigation({ steps, currentStepIndex: 1 });
 */
export function useStepNavigation({
  steps,
  currentStepIndex,
  onBeforeNavigate,
}: UseStepNavigationProps): UseStepNavigationReturn {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const currentStep = steps[currentStepIndex];
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;

  const buildPath = useCallback((path: string): string => {
    return setId ? `${path}?setId=${setId}` : path;
  }, [setId]);

  const goToNext = useCallback(async (): Promise<void> => {
    if (onBeforeNavigate) {
      const canNavigate = await onBeforeNavigate();
      if (!canNavigate) return;
    }
    if (nextStep) {
      navigate(buildPath(nextStep.path));
    }
  }, [nextStep, navigate, buildPath, onBeforeNavigate]);

  const goToPrev = useCallback((): void => {
    if (prevStep) {
      navigate(buildPath(prevStep.path));
    } else {
      navigate('/mis-predicciones');
    }
  }, [prevStep, navigate, buildPath]);

  const goToStep = useCallback((index: number): void => {
    if (index >= 0 && index < steps.length) {
      navigate(buildPath(steps[index].path));
    }
  }, [steps, navigate, buildPath]);

  return {
    currentStep,
    nextStep,
    prevStep,
    goToNext,
    goToPrev,
    goToStep,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    setId,
  };
}

export default useStepNavigation;
