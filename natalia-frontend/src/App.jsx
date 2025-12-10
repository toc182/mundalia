import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Home from '@/pages/Home';
import Playoffs from '@/pages/Playoffs';
import Predictions from '@/pages/Predictions';
import ThirdPlaces from '@/pages/ThirdPlaces';
import Knockout from '@/pages/Knockout';
import Leaderboard from '@/pages/Leaderboard';
import Groups from '@/pages/Groups';
import MyPredictions from '@/pages/MyPredictions';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/repechajes" element={<Playoffs />} />
            <Route path="/grupos" element={<Predictions />} />
            <Route path="/terceros" element={<ThirdPlaces />} />
            <Route path="/eliminatorias" element={<Knockout />} />
            <Route path="/mis-predicciones" element={<MyPredictions />} />
            <Route path="/ranking" element={<Leaderboard />} />
            <Route path="/mis-grupos" element={<Groups />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
