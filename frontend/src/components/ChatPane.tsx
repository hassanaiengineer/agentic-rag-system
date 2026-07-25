import React, { useEffect, useRef } from 'react';
import { useUIStore, Source } from '../store/useUIStore';
import { Bot, User, Copy, ThumbsUp, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThinkingTimeline } from './ThinkingTimeline';
import { MarkdownMessage } from './MarkdownMessage';

const SourceChips: React.FC<{ sources: Source[] }> = ({ sources }) => {
  const selectDocument = useUIStore((s) => s.selectDocument);
  const jumpToPage = useUIStore((s) => s.jumpToPage);

  return (
    <div className="flex flex-wrap gap-1.5 ml-1 mt-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-center mr-1">
        Sources
      </span>
      {sources.map((s, idx) => (
        <button
          key={`${s.document}-${s.page_number}-${idx}`}
          onClick={() => {
            selectDocument(s.document);
            jumpToPage(s.page_number || 1);
          }}
          title={s.text}
          className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm max-w-[220px]"
        >
          <FileText className="w-3 h-3 shrink-0 text-blue-500" />
          <span className="truncate">{s.document}</span>
          <span className="text-slate-400 shrink-0">· p{s.page_number}</span>
        </button>
      ))}
    </div>
  );
};

export const ChatPane: React.FC = () => {
  const messages = useUIStore((state) => state.messages);
  const isStreaming = useUIStore((state) => state.isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mb-2">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Intelligence at your fingertips
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed font-medium">
            Upload your technical docs, policies, or research. I'll analyze them and provide cited
            answers in real-time.
          </p>
        </div>
      ) : (
        messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm',
                msg.role === 'user' ? 'bg-white border-slate-200' : 'bg-blue-600 border-blue-500'
              )}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-slate-600" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div className={cn('flex flex-col gap-2 min-w-0', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                )}
              >
                {msg.content ? (
                  msg.role === 'assistant' ? (
                    <MarkdownMessage content={msg.content} />
                  ) : (
                    msg.content
                  )
                ) : isStreaming && i === messages.length - 1 ? (
                  <div className="flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                ) : null}
              </div>

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourceChips sources={msg.sources} />
              )}

              {msg.role === 'assistant' && msg.content && (
                <div className="flex items-center gap-3 ml-1">
                  <button
                    onClick={() => navigator.clipboard?.writeText(msg.content)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {isStreaming && (
        <div className="max-w-4xl mx-auto pl-12">
          <ThinkingTimeline />
        </div>
      )}
    </div>
  );
};
