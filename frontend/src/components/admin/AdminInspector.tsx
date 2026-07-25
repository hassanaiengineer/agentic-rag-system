import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi, InspectResult } from '../../services/admin';
import { Database, Hash, Layers, Loader2, Search } from 'lucide-react';

const Column: React.FC<{
  title: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, accent, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-0">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-3 space-y-2 overflow-y-auto max-h-[460px]">{children}</div>
  </div>
);

export const AdminInspector: React.FC = () => {
  const [query, setQuery] = useState('');
  const [tenantId, setTenantId] = useState('system_default');
  const [result, setResult] = useState<InspectResult | null>(null);

  const inspect = useMutation({
    mutationFn: () => adminApi.inspect(query, tenantId),
    onSuccess: setResult,
  });

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) inspect.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          See exactly how dense (semantic) and sparse (BM25) signals combine under Reciprocal Rank
          Fusion. Run a query against any tenant's corpus and compare the three ranked pools.
        </p>
        <form onSubmit={run} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What is the termination clause?"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="tenant_id"
            className="sm:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={inspect.isPending || !query.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 justify-center"
          >
            {inspect.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Inspect
          </button>
        </form>
      </div>

      {inspect.isError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {(inspect.error as any)?.response?.data?.detail || 'Inspection failed.'}
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
            <span>
              Fusion α: <span className="text-blue-600 font-bold">{result.fusion_alpha}</span>
            </span>
            <span>
              Corpus chunks: <span className="text-slate-800 font-bold">{result.available_chunks}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Column title="Semantic (dense)" icon={Database} accent="bg-blue-50 text-blue-600">
              {result.semantic.length === 0 && <p className="text-xs text-slate-400 px-1">No hits.</p>}
              {result.semantic.map((s) => (
                <div key={s.rank} className="p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">#{s.rank} · {s.label}</span>
                    {s.distance != null && (
                      <span className="text-[10px] font-mono text-slate-400">d={s.distance}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">{s.preview}</p>
                </div>
              ))}
            </Column>

            <Column title="Keyword (BM25)" icon={Hash} accent="bg-emerald-50 text-emerald-600">
              {result.keyword.length === 0 && <p className="text-xs text-slate-400 px-1">No hits.</p>}
              {result.keyword.map((s) => (
                <div key={s.rank} className="p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">#{s.rank} · {s.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">bm25={s.bm25_score}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">{s.preview}</p>
                </div>
              ))}
            </Column>

            <Column title="Fused (RRF)" icon={Layers} accent="bg-violet-50 text-violet-600">
              {result.fused.map((f, i) => (
                <div key={i} className="p-2.5 bg-violet-50/40 border border-violet-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">#{i + 1} · {f.label}</span>
                    <span className="text-[10px] font-mono text-violet-700 font-bold">{f.fused_score}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500 font-mono">
                    <span>sem r{f.semantic_rank ?? '—'} ({f.semantic_contrib})</span>
                    <span>kw r{f.keyword_rank ?? '—'} ({f.keyword_contrib})</span>
                  </div>
                </div>
              ))}
            </Column>
          </div>
        </>
      )}
    </div>
  );
};
