import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Microscope, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { AdminUsers } from '../components/admin/AdminUsers';
import { AdminAnalytics } from '../components/admin/AdminAnalytics';
import { AdminConfig } from '../components/admin/AdminConfig';
import { AdminInspector } from '../components/admin/AdminInspector';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';

type Tab = 'analytics' | 'users' | 'config' | 'inspector';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'config', label: 'RAG Config', icon: SlidersHorizontal },
  { id: 'inspector', label: 'Retrieval Inspector', icon: Microscope },
];

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('analytics');

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Workspace
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Admin Console</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-400">{user?.email}</div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8 shrink-0">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all',
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {tab === 'analytics' && <AdminAnalytics />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'config' && <AdminConfig />}
          {tab === 'inspector' && <AdminInspector />}
        </div>
      </div>
    </div>
  );
};
