import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import AtsTemplate from '../components/AtsTemplate';
import { api } from '../api/client';

export default function ResumeView() {
  const { id } = useParams();
  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: resumeData?.title || 'ATS_Resume',
  });

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const response = await api.get(`/api/resumes/${id}`);
        setResumeData(response.data);
      } catch (error) {
        console.error("Error fetching resume:", error);
      }
    };
    fetchResume();
  }, [id]);

  const handleMatch = async () => {
    if (!jobDescription.trim()) return;

    setIsCalculating(true);
    try {
      const response = await api.post(`/api/resumes/${id}/match`, {
        jobDescription
      });
      
      setMatchResult(response.data);
    } catch (error) {
      console.error("Error calculating match:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!resumeData) {
    return (
      <div className="flex justify-center items-center min-h-[80vh] bg-zinc-50">
        <div className="text-sm tracking-widest uppercase text-zinc-400 font-medium animate-pulse">
          Loading Profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto bg-white px-6 py-4 rounded-2xl shadow-sm border border-zinc-200/80 flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
          </Link>
          <h1 className="font-semibold text-xl tracking-tight text-zinc-900 line-clamp-1">
            {resumeData.title}
          </h1>
        </div>

        <button
          onClick={() => handlePrint()}
          className="bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
        >
          Export PDF
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80 h-fit">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mb-1">ATS Job Matcher</h2>
          <textarea
            className="w-full h-48 p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none resize-none mb-4 text-sm text-zinc-800 placeholder:text-zinc-400 transition-all"
            placeholder="Paste Job Description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>

          <button
            onClick={handleMatch}
            disabled={isCalculating || !jobDescription.trim()}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {isCalculating ? 'Scanning...' : 'Analyze Match'}
          </button>

          {matchResult && (
            <div className="mt-8 pt-6 border-t border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-zinc-500">Match Score</span>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ring-1 ring-inset ${matchResult.matchScore >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {matchResult.matchScore}%
                </div>
              </div>

              {/* FIXED AI INSIGHTS RENDERING */}
              {matchResult.aiFeedback && (
                <div className="space-y-4">
                  <div className="bg-zinc-100/50 p-4 rounded-xl border border-zinc-200/50">
                    <span className="block text-xs font-bold text-zinc-400 uppercase mb-1">Executive Summary</span>
                    <p className="text-sm text-zinc-700 leading-relaxed">
                      {matchResult.aiFeedback.text || matchResult.aiFeedback.feedback || "No feedback provided."}
                    </p>
                  </div>
                  
                  {matchResult.aiFeedback.justification && (
                    <div className="bg-zinc-100/50 p-4 rounded-xl border border-zinc-200/50">
                      <span className="block text-xs font-bold text-zinc-400 uppercase mb-1">Justification</span>
                      <p className="text-sm text-zinc-700 leading-relaxed">{matchResult.aiFeedback.justification}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden flex flex-col">
          <AtsTemplate ref={componentRef} data={resumeData} />
        </div>
      </div>
    </div>
  );
}