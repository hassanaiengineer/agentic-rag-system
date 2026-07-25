import { api } from './apiClient';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  documents: number;
  chunks: number;
}

export interface RagConfig {
  fusion_alpha: number;
  retrieval_top_k: number;
  chunk_size_tokens: number;
  chunk_overlap_tokens: number;
  grader_enabled: boolean;
  max_iterations: number;
}

export interface Analytics {
  total_queries: number;
  total_users: number;
  active_users: number;
  avg_latency_ms: number;
  total_documents: number;
  total_chunks: number;
  intent_breakdown: { intent: string; count: number }[];
  daily_queries: { day: string; count: number }[];
  recent_queries: {
    query: string;
    intent: string;
    latency_ms: number;
    num_sources: number;
    user_email: string;
    created_at: string;
  }[];
  tenants: { email: string; tenant_id: string; documents: number; chunks: number }[];
}

export interface InspectResult {
  query: string;
  fusion_alpha: number;
  available_chunks: number;
  semantic: { rank: number; label: string; distance: number | null; preview: string }[];
  keyword: { rank: number; label: string; bm25_score: number; preview: string }[];
  fused: {
    label: string;
    semantic_rank: number | null;
    keyword_rank: number | null;
    semantic_contrib: number;
    keyword_contrib: number;
    fused_score: number;
  }[];
}

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => (await api.get('/admin/users')).data,
  setUserActive: async (id: string, is_active: boolean) =>
    (await api.patch(`/admin/users/${id}`, { is_active })).data,
  deleteUser: async (id: string) => (await api.delete(`/admin/users/${id}`)).data,
  getAnalytics: async (): Promise<Analytics> => (await api.get('/admin/analytics')).data,
  getConfig: async (): Promise<RagConfig> => (await api.get('/admin/config')).data,
  updateConfig: async (patch: Partial<RagConfig>): Promise<RagConfig> =>
    (await api.put('/admin/config', patch)).data,
  inspect: async (query: string, tenant_id: string, top_k = 10): Promise<InspectResult> =>
    (await api.post('/admin/retrieval-inspect', { query, tenant_id, top_k })).data,
};
