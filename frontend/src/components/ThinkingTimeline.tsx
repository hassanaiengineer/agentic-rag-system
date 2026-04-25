import React from 'react';
import { useUIStore } from '../store/useUIStore';
import { Search, Database, CheckCircle, RefreshCcw, BrainCircuit } from 'lucide-react';
import { cn } from '../lib/utils';

const steps = [
  { id: 'retrieve', label: 'Retrieving context', icon: Database },
  { id: 'grade_context', label: 'Grading relevance', icon: CheckCircle },
  { id: 'expand_search', label: 'Improving search', icon: RefreshCcw },
  { id: 'generate', label: 'Generating answer', icon: BrainCircuit },
];

export const ThinkingTimeline: React.FC = () => {
  const currentStep = useUIStore((state) => state.thinkingStep);
  const isStreaming = useUIStore((state) => state.isStreaming);

  if (currentStep === 'idle' || !isStreaming) return null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agent Strategy</span>
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isPast = steps.findIndex(s => s.id === currentStep) > steps.findIndex(s => s.id === step.id);
          
          return (
            <div 
              key={step.id} 
              className={cn(
                "flex items-center gap-3 transition-all duration-300",
                isActive ? "opacity-100 translate-x-1" : isPast ? "opacity-60" : "opacity-30"
              )}
            >
              <step.icon className={cn(
                "w-4 h-4",
                isActive ? "text-blue-600 animate-pulse" : isPast ? "text-green-600" : "text-slate-400"
              )} />
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-slate-900" : "text-slate-600"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
