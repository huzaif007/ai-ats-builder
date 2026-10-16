import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './context/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ResumeView from './pages/ResumeView';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] bg-zinc-50">
        <div className="text-sm tracking-widest uppercase text-zinc-400 font-medium animate-pulse">
          Checking your account…
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

function App(){
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Unable to sign out:', error);
    }
  };

  return (
      <div className="min-h-screen bg-zinc-50">

        {/* Minimalist Navigation Bar */}
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold tracking-tight text-zinc-900">
            ATS<span className="text-zinc-400 font-normal">Builder</span>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                Dashboard
              </Link>
              <Link to="/upload" className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">
                Upload Profile
              </Link>
              <button type="button" onClick={handleLogout} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              Sign in
            </Link>
          )}
        </nav>

        {/* Page Routing */}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <AuthPage mode="signup" />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/resume/:id" element={<ProtectedRoute><ResumeView /></ProtectedRoute>} />
        </Routes>

      </div>
  );
}

export default App;