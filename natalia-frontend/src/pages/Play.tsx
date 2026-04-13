import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function Play(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    // Store group invite code if present
    const groupCode = searchParams.get('group');
    if (groupCode) {
      localStorage.setItem('guest_group_code', groupCode);
    }

    // Enter guest mode — clear any previous guest predictions
    localStorage.setItem('guest_mode', 'true');
    localStorage.removeItem('natalia_predictions');
    localStorage.removeItem('natalia_best_third_places');
    localStorage.removeItem('natalia_knockout');
    localStorage.removeItem('natalia_knockout_scores');

    // Start prediction flow at Groups
    navigate('/grupos', { replace: true });
  }, [loading, isAuthenticated, navigate, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
