import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';

export default function AuthCallback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        navigate('/login?error=' + error);
        return;
      }

      if (token) {
        // Store the token
        localStorage.setItem('natalia_token', token);

        try {
          // Fetch user data
          const response = await authAPI.getMe();
          const user = response.data;

          localStorage.setItem('natalia_user', JSON.stringify(user));
          updateUser(user);

          navigate('/');
        } catch {
          localStorage.removeItem('natalia_token');
          navigate('/login?error=auth_failed');
        }
      } else {
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Autenticando...</span>
      </div>
    </div>
  );
}
