import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { ChatPane } from './components/ChatPane';
import { QueryInput } from './components/QueryInput';
import { DeveloperProfile } from './components/DeveloperProfile';
import { AboutPage } from './components/AboutPage';
import { Search, Command, Bell, Share2 } from 'lucide-react';
import { useUIStore } from './store/useUIStore';

const queryClient = new QueryClient();

const MainWorkspace = () => {
  const view = useUIStore((state) => state.view);

  if (view === 'about') {
    return <AboutPage />;
  }

  return (
    <main className="flex-1 flex min-h-0 animate-in fade-in duration-300">
      {/* Chat Section */}
      <div className="flex-1 flex flex-col relative min-w-0 border-r border-slate-50">
        <ChatPane />
        <QueryInput />
      </div>

      {/* Developer Profile Sidebar */}
      <DeveloperProfile />
    </main>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative">
          {/* Topbar */}
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
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <Bell className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </header>

          {/* Workspace Body or About Page */}
          <MainWorkspace />
        </div>
      </div>
    </QueryClientProvider>
  );
};

export default App;
