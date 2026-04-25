import { create } from 'zustand';

export interface Source {
  document: string;
  page_number: number;
  text: string;
  score: number;
  section?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface UIState {
  view: 'workspace' | 'about';
  messages: ChatMessage[];
  isStreaming: boolean;
  thinkingStep: 'idle' | 'retrieve' | 'grade_context' | 'expand_search' | 'generate';
  activeSources: Source[];
  tenantId: string;
  setView: (view: 'workspace' | 'about') => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setThinkingStep: (step: UIState['thinkingStep']) => void;
  setSources: (sources: Source[]) => void;
  resetChat: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'workspace',
  messages: [],
  isStreaming: false,
  thinkingStep: 'idle',
  activeSources: [],
  tenantId: 'system_default',
  setView: (view) => set({ view }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastAssistantMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content;
    }
    return { messages: newMessages };
  }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setThinkingStep: (thinkingStep) => set({ thinkingStep }),
  setSources: (activeSources) => set({ activeSources }),
  resetChat: () => set({ messages: [], activeSources: [], thinkingStep: 'idle' }),
}));
