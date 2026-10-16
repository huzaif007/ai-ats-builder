import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post(`/api/auth/${isSignup ? 'signup' : 'login'}`, { email, password });
      await refreshUser();
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Unable to create an account right now. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center p-6 bg-zinc-50">
      <section className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-zinc-200/80 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-zinc-500 mb-7">
          {isSignup
            ? 'Your account keeps your resumes private from other users.'
            : 'Sign in to access your resumes.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 12 : undefined}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/20 text-sm"
            />
            {isSignup && (
              <p className="text-xs text-zinc-400 mt-2">Use at least 12 characters.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:bg-zinc-300"
          >
            {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-zinc-500 mt-6 text-center">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link
            to={isSignup ? '/login' : '/signup'}
            className="font-medium text-zinc-900 hover:underline"
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
