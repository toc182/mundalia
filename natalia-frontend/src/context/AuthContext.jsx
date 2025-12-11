import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar token al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('natalia_token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          // El endpoint /users/me devuelve el usuario directamente, no envuelto en { user: ... }
          setUser(response.data);
        } catch (err) {
          // Token invalido o expirado
          localStorage.removeItem('natalia_token');
          localStorage.removeItem('natalia_user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    console.log('[AUTH] login attempt:', email);
    try {
      const response = await authAPI.login(email, password);
      console.log('[AUTH] login response:', response.data);
      const { token, user } = response.data;

      localStorage.setItem('natalia_token', token);
      localStorage.setItem('natalia_user', JSON.stringify(user));
      setUser(user);
      console.log('[AUTH] login success, user set:', user);

      return { success: true };
    } catch (err) {
      console.error('[AUTH] login error:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Error al iniciar sesion';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const response = await authAPI.register(name, email, password);
      const { token, user } = response.data;

      localStorage.setItem('natalia_token', token);
      localStorage.setItem('natalia_user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Error al registrarse';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('natalia_token');
    localStorage.removeItem('natalia_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('natalia_user', JSON.stringify(updatedUser));
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      login,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
