import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import TopBar from '@/components/TopBar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Playoffs from '@/pages/Playoffs';
import Predictions from '@/pages/Predictions';
import ThirdPlaces from '@/pages/ThirdPlaces';
import Knockout from '@/pages/Knockout';
import PredictionsScores from '@/pages/PredictionsScores';
import Leaderboard from '@/pages/Leaderboard';
import Groups from '@/pages/Groups';
import MyPredictions from '@/pages/MyPredictions';
import PredictionDetail from '@/pages/PredictionDetail';
import Account from '@/pages/Account';
import Admin from '@/pages/Admin';

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Componente para rutas publicas (redirige si ya esta logueado)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas publicas */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/ranking" element={<Leaderboard />} />

      {/* Rutas protegidas */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/repechajes" element={<ProtectedRoute><Playoffs /></ProtectedRoute>} />
      <Route path="/grupos" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
      <Route path="/grupos-marcadores" element={<ProtectedRoute><PredictionsScores /></ProtectedRoute>} />
      <Route path="/terceros" element={<ProtectedRoute><ThirdPlaces /></ProtectedRoute>} />
      <Route path="/eliminatorias" element={<ProtectedRoute><Knockout /></ProtectedRoute>} />
      <Route path="/mis-predicciones" element={<ProtectedRoute><MyPredictions /></ProtectedRoute>} />
      <Route path="/prediccion/:id" element={<ProtectedRoute><PredictionDetail /></ProtectedRoute>} />
      <Route path="/mis-grupos" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/cuenta" element={<ProtectedRoute><Account /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <TopBar />
          <div className="pt-14">
            <AppRoutes />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
