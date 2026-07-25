import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

/**
 * Renders an assistant message as formatted markdown.
 * Elements are styled explicitly (no @tailwindcss/typography dependency)
 * so lists, bold, code, tables and links render cleanly in the chat bubble.
 */
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-base font-bold text-slate-900 mb-2 mt-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mb-2 mt-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-900 mb-1 mt-1">{children}</h3>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">
            {children}
          </a>
        ),
        code: ({ className, children }) => {
          const isBlock = (className || '').includes('language-');
          if (isBlock) {
            return (
              <code className="block bg-slate-100 text-slate-800 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre">
                {children}
              </code>
            );
          }
          return <code className="bg-slate-100 text-slate-800 rounded px-1.5 py-0.5 text-[0.85em] font-mono">{children}</code>;
        },
        pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-600 my-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border border-slate-200 rounded-lg">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-50 font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
        hr: () => <hr className="my-3 border-slate-200" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
