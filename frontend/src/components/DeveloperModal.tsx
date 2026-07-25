import React from 'react';
import { Code2, Mail, ExternalLink, Briefcase, Bot, Database, Rocket, X } from 'lucide-react';

interface DeveloperModalProps {
  open: boolean;
  onClose: () => void;
}

const BADGES = ['RAG Systems', 'LLM Chatbots', 'AI Agents', 'Python Backends'];

const VALUE_PROPS = [
  { icon: Database, text: 'Chat securely with private data' },
  { icon: Bot, text: 'Custom LLMs, Chatbots & Agents' },
  { icon: Code2, text: 'Automate complex workflows' },
  { icon: Rocket, text: 'Deploy scalable AI solutions' },
];

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header banner */}
        <div className="bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-800 px-6 pt-10 pb-16 text-center relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
          <div className="relative w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-900/40 rotate-3">
            <span className="text-2xl font-bold text-white">HK</span>
          </div>
        </div>

        <div className="px-6 pb-6 -mt-8">
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-slate-900">Hassan Khan 👋</h2>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-1">
              AI Engineer
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {BADGES.map((b) => (
              <span
                key={b}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold tracking-wide"
              >
                {b}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium text-center mb-4">
            I build production-grade AI systems that help businesses scale and automate — from
            secure document intelligence to custom agents.
          </p>

          <ul className="grid grid-cols-2 gap-2.5 mb-6">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2 text-[11px] text-slate-700 font-medium bg-slate-50 rounded-xl px-3 py-2.5"
              >
                <Icon className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          {/* Contact links */}
          <div className="space-y-2">
            <a
              href="mailto:hassanaiengineer@gmail.com"
              className="flex items-center gap-3 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-xl px-3 py-2.5 transition-all group"
            >
              <div className="w-8 h-8 bg-slate-50 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <span className="flex-1">hassanaiengineer@gmail.com</span>
            </a>
            <a
              href="https://www.upwork.com/freelancers/~016ca6a619d9683838"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-xs font-semibold text-slate-700 hover:text-green-600 bg-white border border-slate-200 hover:border-green-200 rounded-xl px-3 py-2.5 transition-all group"
            >
              <div className="w-8 h-8 bg-slate-50 group-hover:bg-green-50 rounded-lg flex items-center justify-center transition-colors">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="flex-1">Hire me on Upwork</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
