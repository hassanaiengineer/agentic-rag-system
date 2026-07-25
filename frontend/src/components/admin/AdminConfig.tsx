import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, RagConfig } from '../../services/admin';
import { Check, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

const Slider: React.FC<{
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}> = ({ label, hint, min, max, step, value, onChange, format }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-bold text-slate-800">{label}</label>
      <span className="text-sm font-bold text-blue-600 tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{hint}</p>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-blue-600"
    />
  </div>
);

export const AdminConfig: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-config'], queryFn: adminApi.getConfig });
  const [draft, setDraft] = useState<RagConfig | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (patch: RagConfig) => adminApi.updateConfig(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-config'], updated);
      setDraft(updated);
    },
  });

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const dirty = data && JSON.stringify(draft) !== JSON.stringify(data);
  const set = (patch: Partial<RagConfig>) => setDraft({ ...draft, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Tune the live retrieval pipeline. Changes apply immediately to new queries; chunk sizes
          apply to newly uploaded documents.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => data && setDraft(data)}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={() => save.mutate(draft)}
            disabled={!dirty || save.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-40"
          >
            {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {save.isSuccess && !dirty ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Slider
          label="Fusion Alpha (semantic ↔ keyword)"
          hint="Weight of dense semantic search vs. sparse BM25 keyword search in Reciprocal Rank Fusion. 1.0 = pure semantic, 0.0 = pure keyword."
          min={0}
          max={1}
          step={0.05}
          value={draft.fusion_alpha}
          onChange={(v) => set({ fusion_alpha: v })}
          format={(v) => `${Math.round(v * 100)}% / ${Math.round((1 - v) * 100)}%`}
        />
        <Slider
          label="Retrieval Top-K"
          hint="How many chunks each sub-query pulls from the store before fusion and reranking."
          min={1}
          max={20}
          step={1}
          value={draft.retrieval_top_k}
          onChange={(v) => set({ retrieval_top_k: v })}
        />
        <Slider
          label="Chunk Size (tokens)"
          hint="Target size for each indexed chunk. Applies to newly uploaded documents."
          min={500}
          max={700}
          step={10}
          value={draft.chunk_size_tokens}
          onChange={(v) => set({ chunk_size_tokens: v })}
        />
        <Slider
          label="Chunk Overlap (tokens)"
          hint="Overlap between consecutive chunks to preserve context across boundaries."
          min={0}
          max={300}
          step={10}
          value={draft.chunk_overlap_tokens}
          onChange={(v) => set({ chunk_overlap_tokens: v })}
        />
        <Slider
          label="Max Correction Iterations"
          hint="How many times the agent may expand the search and retry when context is graded irrelevant."
          min={0}
          max={4}
          step={1}
          value={draft.max_iterations}
          onChange={(v) => set({ max_iterations: v })}
        />

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
              <label className="text-sm font-bold text-slate-800">Self-Correction Grader</label>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When on, the agent grades retrieved context for relevance and expands the search if it
              falls short. Turn off to always answer from the first retrieval pass.
            </p>
          </div>
          <button
            onClick={() => set({ grader_enabled: !draft.grader_enabled })}
            className={cn(
              'mt-4 self-start relative w-12 h-6 rounded-full transition-all',
              draft.grader_enabled ? 'bg-blue-600' : 'bg-slate-300'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                draft.grader_enabled && 'translate-x-6'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
