import { createContext, useContext, useState, useEffect } from 'react';
import { mockUser } from '@/data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // DEV MODE: Auto-login para desarrollo (quitar cuando esté listo)
  const [user, setUser] = useState(mockUser);
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   // Check for saved user in localStorage
  //   const savedUser = localStorage.getItem('natalia_user');
  //   if (savedUser) {
  //     setUser(JSON.parse(savedUser));
  //   }
  //   setLoading(false);
  // }, []);

  const login = (email, password) => {
    // Mock login - in production this would call the API
    const user = { ...mockUser, email };
    localStorage.setItem('natalia_user', JSON.stringify(user));
    setUser(user);
    return { success: true };
  };

  const register = (name, email, password) => {
    // Mock register - in production this would call the API
    const user = { ...mockUser, name, email };
    localStorage.setItem('natalia_user', JSON.stringify(user));
    setUser(user);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('natalia_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
