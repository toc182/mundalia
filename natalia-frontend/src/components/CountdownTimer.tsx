import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
}

export default function CountdownTimer({ targetDate, title }: CountdownTimerProps): JSX.Element | null {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return null;
  }

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 backdrop-blur-sm text-white rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg border border-white/30">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-xs sm:text-sm text-white/90 mt-2 uppercase tracking-wide font-medium">{label}</span>
    </div>
  );

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0 shadow-xl">
      <CardContent className="py-6 sm:py-8">
        <h3 className="text-center text-lg sm:text-xl font-semibold mb-4 sm:mb-6">{title || t('home.countdownTitle')}</h3>
        <div className="flex justify-center gap-3 sm:gap-6">
          <TimeBox value={timeLeft.days} label={t('home.days')} />
          <div className="flex items-center text-3xl font-bold text-white/50 -mt-6">:</div>
          <TimeBox value={timeLeft.hours} label={t('home.hours')} />
          <div className="flex items-center text-3xl font-bold text-white/50 -mt-6">:</div>
          <TimeBox value={timeLeft.minutes} label={t('home.minutes')} />
          <div className="flex items-center text-3xl font-bold text-white/50 -mt-6 hidden sm:flex">:</div>
          <div className="hidden sm:block">
            <TimeBox value={timeLeft.seconds} label={t('home.seconds')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
