import React from 'react';
import { useUIStore } from '../store/useUIStore';
import { ArrowLeft, Rocket, Zap, Shield, Search, BrainCircuit, Code2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const setView = useUIStore((state) => state.setView);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-4xl mx-auto py-12 px-8">
        
        {/* Header / Back Button */}
        <button 
          onClick={() => setView('workspace')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>

        {/* Hero Section */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold uppercase tracking-widest mb-6">
            <SparkleIcon className="w-3.5 h-3.5" />
            Architecture Overview
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Production-Grade Agentic RAG
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            This is not just a standard LLM wrapper. This is an enterprise-ready Document Intelligence system built with self-correcting agents, hybrid retrieval, and strict multi-tenant security.
          </p>
        </div>

        {/* Core Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
              <BrainCircuit className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Agentic Self-Correction</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Powered by LangGraph. Before answering, the agent actively grades the retrieved context. If it deems the context irrelevant, it autonomously routes to an "Expand Search" node, generating new semantic and keyword queries to try again.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
              <Search className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">True Reciprocal Rank Fusion</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Why settle for one search method? This system merges <b>Dense (Semantic)</b> retrieval via ChromaDB with <b>Sparse (Keyword)</b> retrieval via bm25s. It utilizes the industry-standard RRF math formula to rank the absolute best evidence.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-5">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Real-Time Asynchronous Streaming</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              FastAPI backend utilizing Server-Sent Events (SSE). It streams LangGraph node traversals (the "Thinking Timeline") instantly, followed by lightning-fast token streaming from the Gemini 2.5 Flash API.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-5">
              <Shield className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Enterprise Multi-Tenancy</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Strict data isolation. Every uploaded document, vector embedding, and keyword index is hard-partitioned by an X-Tenant-ID header. User A can never accidentally query User B's knowledge base.
            </p>
          </div>

        </div>

        {/* Tech Stack List */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Code2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold tracking-tight">The Technology Stack</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Frontend</h4>
              <ul className="space-y-3">
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> React 18 + Vite</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Tailwind CSS</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Zustand (State)</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> TanStack Query</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Backend API</h4>
              <ul className="space-y-3">
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> FastAPI (Python)</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> LangGraph</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PyMuPDF + Tesseract</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Uvicorn Async Workers</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Data & AI</h4>
              <ul className="space-y-3">
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Google Gemini 2.5 Flash</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" /> ChromaDB (Vectors)</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" /> BM25s (Lexical Search)</li>
                <li className="text-sm font-medium flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Sentence-Transformers</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const SparkleIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
)
