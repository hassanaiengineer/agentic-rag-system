import React from 'react';
import { Code2, Mail, ExternalLink, Briefcase, Bot, Database, Rocket, Sparkles } from 'lucide-react';

export const DeveloperProfile: React.FC = () => {
  return (
    <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-slate-50/50 overflow-y-auto hidden xl:block">
      <div className="p-4 border-b border-slate-200 sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Meet the Developer
        </h3>
      </div>
      
      <div className="p-5 space-y-6">
        {/* Header Profile */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 rotate-3 hover:rotate-0 transition-all duration-300">
            <span className="text-2xl font-bold text-white">HK</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Hassan Khan 👋</h2>
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-1.5">AI Engineer</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold tracking-wide">RAG Systems</span>
          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold tracking-wide">LLM Chatbots</span>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold tracking-wide">AI Agents</span>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold tracking-wide">Python Backends</span>
        </div>

        <hr className="border-slate-200" />

        {/* Value Proposition */}
        <div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
            I build production-grade AI systems that help businesses scale and automate.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Database className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Chat securely with private data</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Bot className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Custom LLMs, Chatbots & Agents</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Code2 className="w-4 h-4 text-violet-500 shrink-0" />
              <span>Automate complex workflows</span>
            </li>
            <li className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Rocket className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Deploy scalable AI solutions</span>
            </li>
          </ul>
        </div>

        {/* Connect Section */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            🤝 Let's Connect
          </h4>
          <a 
            href="mailto:hassanaiengineer@gmail.com" 
            className="flex items-center gap-3 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors group"
          >
            <div className="w-8 h-8 bg-slate-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center transition-colors border border-slate-100 group-hover:border-blue-100">
              <Mail className="w-4 h-4" />
            </div>
            hassanaiengineer@gmail.com
          </a>
          <a 
            href="https://www.upwork.com/freelancers/~016ca6a619d9683838" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-xs font-semibold text-slate-600 hover:text-green-600 transition-colors group"
          >
            <div className="w-8 h-8 bg-slate-50 group-hover:bg-green-50 rounded-xl flex items-center justify-center transition-colors border border-slate-100 group-hover:border-green-100">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="flex-1">Hire me on Upwork</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </div>
  );
};
