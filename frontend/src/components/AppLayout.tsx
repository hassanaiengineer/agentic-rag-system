import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Search, Command, Bell, Share2, Check, Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { DeveloperModal } from './DeveloperModal';

export const AppLayout: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search workspace..."
                className="w-full bg-slate-100/50 border-transparent focus:bg-white focus:border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm outline-none transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50 group-focus-within:opacity-0 transition-opacity pointer-events-none">
                <Command className="w-3 h-3" />
                <span className="text-[10px] font-bold">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDevOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Meet the Developer
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </header>

        <Outlet />
      </div>

      <DeveloperModal open={devOpen} onClose={() => setDevOpen(false)} />
    </div>
  );
};
