import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ResumeView from './pages/ResumeView';

function App(){
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50">

        {/* Minimalist Navigation Bar */}
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold tracking-tight text-zinc-900">
            ATS<span className="text-zinc-400 font-normal">Builder</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              Dashboard
            </Link>
            <Link to="/upload" className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">
              Upload Profile
            </Link>
          </div>
        </nav>

        {/* Page Routing */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/resume/:id" element={<ResumeView />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;