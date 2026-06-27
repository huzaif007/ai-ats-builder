import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Upload(){
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate(); // This lets us programmatically change pages

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Clear status if they pick a new file
    if (status) setStatus('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      setStatus('Please provide a title and select a JSON file.');
      return;
    }

    setIsLoading(true);
    setStatus('Parsing file locally...');

    // Native FileReader API
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const rawJsonData = JSON.parse(event.target.result);
        setStatus('File parsed. Analyzing and saving to database...');

        const response = await axios.post('http://localhost:5001/api/resumes', {
          title: title,
          linkedinData: rawJsonData
        });

        if (response.status === 201) {
          setStatus('Success! Redirecting to dashboard...');
          // Automatically route the user back to the dashboard after 1 second
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setStatus('Error parsing JSON or connecting to server.');
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-zinc-50 font-sans">

      {/* Back to Dashboard Link */}
      <div className="w-full max-w-md mb-6">
        <Link to="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors inline-flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-zinc-200/80 p-8">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">Upload Profile</h1>
          <p className="text-sm text-zinc-500">Import your LinkedIn data export to generate an ATS-friendly resume.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Resume Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all text-sm text-zinc-900 placeholder:text-zinc-400"
              placeholder="e.g., Senior Frontend Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">LinkedIn Export (.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full text-sm text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:transition-colors file:cursor-pointer cursor-pointer border border-zinc-200 rounded-xl p-1 bg-zinc-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {isLoading ? 'Processing...' : 'Analyze & Save'}
          </button>
        </form>

        {/* Status Message Display */}
        {status && (
          <div className={`mt-6 p-4 rounded-xl text-center text-sm font-medium ${status.includes('Error') || status.includes('Please') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}