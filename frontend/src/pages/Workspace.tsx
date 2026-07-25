import React from 'react';
import { PdfViewer } from '../components/PdfViewer';
import { ChatPane } from '../components/ChatPane';
import { QueryInput } from '../components/QueryInput';

export const Workspace: React.FC = () => {
  return (
    <main className="flex-1 flex min-h-0 animate-in fade-in duration-300">
      {/* Left: document preview */}
      <div className="w-[45%] min-w-[320px] border-r border-slate-200 hidden md:block">
        <PdfViewer />
      </div>

      {/* Right: chat */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <ChatPane />
        <QueryInput />
      </div>
    </main>
  );
};
