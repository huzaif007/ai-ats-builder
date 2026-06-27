import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Dashboard(){
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const response = await api.get('/api/resumes');
        setResumes(response.data);
      } catch (error) {
        console.error("Error fetching resumes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Prevents the click from opening the resume link
    
    // Quick confirmation dialog to prevent accidental clicks
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      // Call the backend to delete from MongoDB
      await api.delete(`/api/resumes/${id}`);
      
      // Instantly remove it from the dashboard UI without reloading the page
      setResumes(prevResumes => prevResumes.filter(resume => resume._id !== id));
    } catch (error) {
      console.error("Error deleting resume:", error);
      alert("Failed to delete the resume.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] bg-zinc-50">
        <div className="text-sm tracking-widest uppercase text-zinc-400 font-medium animate-pulse">
          Loading Data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="max-w-6xl mx-auto">

        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">My Resumes</h1>
          <p className="text-zinc-500 mt-2 text-sm">Manage and analyze your PDF resumes and exported LinkedIn profiles.</p>
        </div>

        {resumes.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-zinc-200/80 text-center shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No resumes found</h3>
            <p className="text-zinc-500 mb-6 text-sm">Upload your first PDF resume or LinkedIn export to get started.</p>
            <Link
              to="/upload"
              className="inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer"
            >
              Upload Resume
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              
              <Link
                to={`/resume/${resume._id}`}
                key={resume._id}
                // 'relative' added here so the absolute delete button stays inside the card
                className="relative bg-white p-6 rounded-2xl border border-zinc-200/80 flex flex-col justify-between hover:shadow-md hover:border-zinc-300 transition-all duration-200 cursor-pointer group"
              >
                
                {/* DELETE BUTTON */}
                <button 
                  onClick={(e) => handleDelete(e, resume._id)}
                  className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                  title="Delete Resume"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div>
                  {/* Added pr-8 so long titles don't slide under the delete button */}
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-600 transition-colors line-clamp-1 pr-8">
                    {resume.title}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1.5 font-medium uppercase tracking-wider">
                    {new Date(resume.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-500">ATS Score</span>

                  {/* Minimalist Pill Badges */}
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset
                    ${resume.atsScore >= 70 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                      resume.atsScore >= 40 ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                      'bg-rose-50 text-rose-700 ring-rose-600/20'}`}
                  >
                    {resume.atsScore || 0} / 100
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}