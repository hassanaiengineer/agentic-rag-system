const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export type QueryMode = "qa" | "summary" | "insights";

export interface SourceItem {
  document: string;
  chunk_id: number;
  text: string;
  score: number;
  section?: string | null;
  page_number?: number;
}

export interface QueryResponse {
  answer: string;
  mode: QueryMode;
  sources: SourceItem[];
}

export interface UploadResponse {
  message: string;
  document: string;
  chunks_indexed: number;
  processing_path: string;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function queryDocuments(query: string, mode: QueryMode): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listDocuments(): Promise<Array<{ name: string; chunks: number }>> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.documents;
}
