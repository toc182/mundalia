import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/services/api';
import type { User } from '@/types';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (credential: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  updateUser: (user: User) => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar token al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('natalia_token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data);
        } catch {
          localStorage.removeItem('natalia_token');
          localStorage.removeItem('natalia_user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;

      localStorage.setItem('natalia_token', token);
      localStorage.setItem('natalia_user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (err: unknown) {
      console.error('[AUTH] login error:', err);
      const error = err as { response?: { data?: { error?: string; message?: string } } };
      const message = error.response?.data?.error || error.response?.data?.message || 'Error al iniciar sesion';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
    setError(null);
    try {
      const response = await authAPI.register(name, email, password);
      const { token, user } = response.data;

      localStorage.setItem('natalia_token', token);
      localStorage.setItem('natalia_user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Error al registrarse';
      setError(message);
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (credential: string): Promise<AuthResult> => {
    setError(null);
    try {
      const response = await authAPI.googleLogin(credential);
      const { token, user } = response.data;

      localStorage.setItem('natalia_token', token);
      localStorage.setItem('natalia_user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (err: unknown) {
      console.error('[AUTH] Google login error:', err);
      const error = err as { response?: { data?: { error?: string } } };
      const message = error.response?.data?.error || 'Error al iniciar sesion con Google';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = (): void => {
    localStorage.removeItem('natalia_token');
    localStorage.removeItem('natalia_user');
    setUser(null);
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
    localStorage.setItem('natalia_user', JSON.stringify(updatedUser));
  };

  const clearError = (): void => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      loading,
      error,
      clearError,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
