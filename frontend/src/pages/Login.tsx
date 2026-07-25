import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { FileText, Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@rag.ai');
  const [password, setPassword] = useState('demo123');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const useDemo = (which: 'demo' | 'admin') => {
    setMode('login');
    setEmail(which === 'demo' ? 'demo@rag.ai' : 'admin@rag.ai');
    setPassword(which === 'demo' ? 'demo123' : 'admin123');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: brand / marketing panel */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight italic">RAG.ai</span>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Chat with your documents.<br />
            <span className="text-blue-400">Grounded. Cited. Instant.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            An agentic Retrieval-Augmented Generation platform — hybrid search, self-correcting
            retrieval, and real-time streamed answers with page-level citations.
          </p>
          <div className="space-y-4">
            {[
              { icon: Sparkles, text: 'Agentic self-correcting retrieval (LangGraph)' },
              { icon: Zap, text: 'Hybrid dense + sparse search with Reciprocal Rank Fusion' },
              { icon: ShieldCheck, text: 'Multi-tenant isolation — your docs stay yours' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          Built by Hassan Khan · AI Engineer
        </p>
      </div>

      {/* Right: auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight italic text-slate-900">RAG.ai</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-8">
            {mode === 'login'
              ? 'Sign in to your document workspace.'
              : 'Start chatting with your documents in seconds.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center mb-3">
              Try a demo account
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => useDemo('demo')}
                className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-all"
              >
                Demo user
              </button>
              <button
                onClick={() => useDemo('admin')}
                className="flex-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-all"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
