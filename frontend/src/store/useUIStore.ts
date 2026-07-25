import { create } from 'zustand';

export interface Source {
  document: string;
  page_number: number;
  text: string;
  score: number;
  section?: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export type ThinkingStep =
  | 'idle'
  | 'classify'
  | 'retrieve'
  | 'grade_context'
  | 'expand_search'
  | 'generate';

interface UIState {
  messages: ChatMessage[];
  isStreaming: boolean;
  thinkingStep: ThinkingStep;

  // Document viewer state (ChatPDF-style split pane).
  selectedDocument: string | null;
  pdfPage: number;

  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setLastAssistantSources: (sources: Source[]) => void;
  setStreaming: (isStreaming: boolean) => void;
  setThinkingStep: (step: ThinkingStep) => void;
  selectDocument: (name: string | null) => void;
  jumpToPage: (page: number) => void;
  resetChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  messages: [],
  isStreaming: false,
  thinkingStep: 'idle',
  selectedDocument: null,
  pdfPage: 1,

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') last.content = content;
      return { messages };
    }),

  setLastAssistantSources: (sources) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') last.sources = sources;
      return { messages };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setThinkingStep: (thinkingStep) => set({ thinkingStep }),
  selectDocument: (selectedDocument) => set({ selectedDocument, pdfPage: 1 }),
  jumpToPage: (pdfPage) => set({ pdfPage }),
  resetChat: () => set({ messages: [], thinkingStep: 'idle' }),
}));
