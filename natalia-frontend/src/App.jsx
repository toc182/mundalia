import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Playoffs from '@/pages/Playoffs';
import Predictions from '@/pages/Predictions';
import Leaderboard from '@/pages/Leaderboard';
import Groups from '@/pages/Groups';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/playoffs" element={<Playoffs />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/groups" element={<Groups />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
