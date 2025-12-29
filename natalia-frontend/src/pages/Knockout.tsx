import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Trophy, Save } from 'lucide-react';
import { useKnockoutData } from '@/hooks/useKnockoutData';
import { MobileKnockoutSlides } from '@/components/knockout/MobileKnockout';
import { FullBracket } from '@/components/knockout/DesktopBracket';
import { predictionsAPI } from '@/services/api';
import type { RoundId, MobileRound, Round } from '@/types/knockout';

export default function Knockout(): React.JSX.Element {
  const navigate = useNavigate();

  // Use custom hook for all data management
  const {
    knockoutPredictions,
    setKnockoutPredictions,
    knockoutScores,
    saved,
    setSaved,
    saving,
    setSaving,
    error,
    setError,
    loading,
    predictionSetName,
    predictionMode,
    setId,
    r32Matches,
    r16Matches,
    qfMatches,
    sfMatches,
    thirdPlace,
    final,
    r32Complete,
    r16Complete,
    qfComplete,
    sfComplete,
    thirdPlaceComplete,
    finalComplete,
    isComplete,
    missingPredictions,
    missingThirdPlaces,
    getTeamById,
    selectWinner,
    handleScoreChange,
    handleSave,
    buildSaveData,
    navTimerRef,
  } = useKnockoutData();

  // Local UI state
  const [activeRound, setActiveRound] = useState<RoundId>('r32');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<boolean>(false);

  // Slide order for mobile navigation
  const slideRoundIds: RoundId[] = ['r32', 'r16', 'qf', 'final'];

  // Handle scroll to detect active round
  const handleScroll = useCallback(() => {
    if (isScrolling.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const slideWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);
    const newRoundId = slideRoundIds[newIndex];

    if (newRoundId && newRoundId !== activeRound) {
      setActiveRound(newRoundId);
    }
  }, [activeRound, slideRoundIds]);

  // Programmatic scroll to specific slide
  const scrollToRound = useCallback((roundId: RoundId) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const index = slideRoundIds.indexOf(roundId);
    if (index === -1) return;

    isScrolling.current = true;
    const slideWidth = container.offsetWidth;
    container.scrollTo({ left: index * slideWidth, behavior: 'smooth' });

    setTimeout(() => {
      isScrolling.current = false;
    }, 300);
  }, [slideRoundIds]);

  // Mobile rounds configuration
  const mobileRounds: MobileRound[] = [
    { id: 'r32', label: 'R32 → R16', count: r32Complete + r16Complete, total: 24, next: 'r16' },
    { id: 'r16', label: 'R16 → QF', count: r16Complete + qfComplete, total: 12, next: 'qf' },
    { id: 'qf', label: 'QF → SF', count: qfComplete + sfComplete, total: 6, next: 'final' },
    { id: 'final', label: 'SF → Final', count: sfComplete + thirdPlaceComplete + finalComplete, total: 4, next: null },
  ];

  // Rounds for desktop
  const rounds: Round[] = [
    { id: 'r32', label: 'Round of 32', count: r32Complete, total: 16, next: 'r16' },
    { id: 'r16', label: 'Round of 16', count: r16Complete, total: 8, next: 'qf' },
    { id: 'qf', label: 'Cuartos', count: qfComplete, total: 4, next: 'sf' },
    { id: 'sf', label: 'Semis', count: sfComplete, total: 2, next: 'final' },
    { id: 'final', label: 'Final', count: thirdPlaceComplete + finalComplete, total: 2, next: null },
  ];

  const currentRound = rounds.find(r => r.id === activeRound);
  const currentMobileRound = mobileRounds.find(r => r.id === activeRound);

  // Previous round mapping for back navigation
  const previousRound: Record<RoundId, RoundId | null> = {
    'r32': null,
    'r16': 'r32',
    'qf': 'r16',
    'sf': 'qf',
    'final': 'qf',
  };

  const handleBack = (): void => {
    const backPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/terceros';
    const backUrl = setId ? `${backPage}?setId=${setId}` : backPage;
    window.scrollTo(0, 0);
    navigate(backUrl);
  };

  const handleFinish = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    localStorage.setItem('natalia_knockout', JSON.stringify(knockoutPredictions));
    if (predictionMode === 'scores') {
      localStorage.setItem('natalia_knockout_scores', JSON.stringify(knockoutScores));
    }

    const nextUrl = setId ? `/prediccion/${setId}` : '/mis-predicciones';

    try {
      await predictionsAPI.saveKnockout(buildSaveData(), parseInt(setId!, 10));
      setSaved(true);
      window.scrollTo(0, 0);
      navigate(nextUrl);
    } catch (err) {
      setError('Error al guardar en servidor - Continuando con guardado local');
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(nextUrl);
      }, 800);
    } finally {
      setSaving(false);
    }
  };

  // Back button component
  const BackButton = ({ size = 'default' }: { size?: 'default' | 'sm' | 'lg' }): React.JSX.Element => {
    const prevRound = previousRound[activeRound];

    const handleClick = (): void => {
      if (prevRound) {
        scrollToRound(prevRound);
      } else {
        handleBack();
      }
    };

    return (
      <Button variant="outline" onClick={handleClick} size={size}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        Atrás
      </Button>
    );
  };

  // Navigation button component
  const NavigationButton = ({ size = 'default' }: { size?: 'default' | 'sm' | 'lg' }): React.JSX.Element => {
    const isLastRound = activeRound === 'final';
    const isDisabled = saving || (isLastRound && !isComplete);

    const handleClick = (): void => {
      if (isLastRound) {
        handleFinish();
      } else if (currentMobileRound?.next) {
        scrollToRound(currentMobileRound.next);
      }
    };

    return (
      <Button onClick={handleClick} disabled={isDisabled} size={size}>
        {saving ? 'Guardando...' : isLastRound ? 'Finalizar' : 'Siguiente'}
        {isLastRound ? (
          <Trophy className="ml-1 h-4 w-4" />
        ) : (
          <ChevronRight className="ml-1 h-4 w-4" />
        )}
      </Button>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Missing predictions redirect
  if (missingPredictions || missingThirdPlaces) {
    const groupsPage = predictionMode === 'scores' ? '/grupos-marcadores' : '/grupos';
    const groupsPageWithSet = setId ? `${groupsPage}?setId=${setId}` : groupsPage;
    const tercerosWith = setId ? `/terceros?setId=${setId}` : '/terceros';

    const redirectTo = predictionMode === 'scores'
      ? groupsPageWithSet
      : (missingPredictions ? groupsPageWithSet : tercerosWith);

    const redirectLabel = predictionMode === 'scores'
      ? 'Grupos (Marcadores)'
      : (missingPredictions ? 'Grupos' : 'Terceros');

    const message = predictionMode === 'scores'
      ? 'Debes completar los marcadores de todos los grupos primero.'
      : (missingPredictions
          ? 'Debes completar las predicciones de grupos primero.'
          : 'Debes seleccionar los 8 mejores terceros lugares primero.');

    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link to={redirectTo}>
            Ir a {redirectLabel}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        {predictionSetName && (
          <div className="text-sm text-muted-foreground mb-1">{predictionSetName}</div>
        )}
        <h1 className="text-2xl font-bold">Eliminatorias</h1>
        <p className="text-sm text-muted-foreground mt-1">Seleccionar los ganadores de partidos de Eliminatoria</p>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
        <BackButton />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKnockoutPredictions({})}
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || Object.keys(knockoutPredictions).length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Guardar
          </Button>
        </div>
        {/* Desktop: always show Finalizar */}
        <div className="hidden lg:block">
          <Button onClick={handleFinish} disabled={saving || !isComplete}>
            {saving ? 'Guardando...' : 'Finalizar'}
            <Trophy className="ml-1 h-4 w-4" />
          </Button>
        </div>
        {/* Mobile: slide navigation */}
        <div className="lg:hidden">
          <NavigationButton />
        </div>
      </div>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>
            Predicciones guardadas correctamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* DESKTOP: Full horizontal bracket */}
      <div className="hidden lg:block">
        <FullBracket
          r32Matches={r32Matches}
          r16Matches={r16Matches}
          qfMatches={qfMatches}
          sfMatches={sfMatches}
          final={final}
          thirdPlace={thirdPlace}
          onSelectWinner={selectWinner}
          getTeamById={getTeamById}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={handleScoreChange}
        />

        {/* Desktop bottom navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <BackButton size="lg" />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setKnockoutPredictions({})}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || Object.keys(knockoutPredictions).length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
          <Button onClick={handleFinish} disabled={saving || !isComplete} size="lg">
            {saving ? 'Guardando...' : 'Finalizar'}
            <Trophy className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* MOBILE: Tabs by round */}
      <div className="lg:hidden">
        {/* Round selector tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {mobileRounds.map(round => (
            <Button
              key={round.id}
              variant={activeRound === round.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => scrollToRound(round.id)}
            >
              {round.label}
            </Button>
          ))}
        </div>

        {/* Scroll-snap container with slides */}
        <MobileKnockoutSlides
          r32Matches={r32Matches}
          r16Matches={r16Matches}
          qfMatches={qfMatches}
          sfMatches={sfMatches}
          final={final}
          thirdPlace={thirdPlace}
          predictionMode={predictionMode}
          knockoutScores={knockoutScores}
          onScoreChange={handleScoreChange}
          onSelectWinner={selectWinner}
          scrollContainerRef={scrollContainerRef}
          handleScroll={handleScroll}
          getTeamById={getTeamById}
        />

        {/* Mobile bottom navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <BackButton size="lg" />
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKnockoutPredictions({})}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || Object.keys(knockoutPredictions).length === 0}
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
          <NavigationButton size="lg" />
        </div>
      </div>
    </div>
  );
}
