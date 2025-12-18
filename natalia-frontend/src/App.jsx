import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import TopBar from '@/components/TopBar';

// Eagerly loaded pages (critical path)
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

// Lazy loaded pages (code splitting)
const Playoffs = lazy(() => import('@/pages/Playoffs'));
const Predictions = lazy(() => import('@/pages/Predictions'));
const ThirdPlaces = lazy(() => import('@/pages/ThirdPlaces'));
const Knockout = lazy(() => import('@/pages/Knockout'));
const PredictionsScores = lazy(() => import('@/pages/PredictionsScores'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Groups = lazy(() => import('@/pages/Groups'));
const MyPredictions = lazy(() => import('@/pages/MyPredictions'));
const PredictionDetail = lazy(() => import('@/pages/PredictionDetail'));
const Account = lazy(() => import('@/pages/Account'));
const Admin = lazy(() => import('@/pages/Admin'));

// Loading spinner for lazy loaded components
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    </div>
  );
}

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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
