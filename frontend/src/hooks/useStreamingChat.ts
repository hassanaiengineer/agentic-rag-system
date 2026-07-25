import { useUIStore } from '../store/useUIStore';
import { API_BASE, authHeaders } from '../services/apiClient';

export const useStreamingChat = () => {
  const {
    addMessage,
    updateLastAssistantMessage,
    setLastAssistantSources,
    setStreaming,
    setThinkingStep,
    selectDocument,
    jumpToPage,
  } = useUIStore();

  const sendMessage = async (query: string) => {
    addMessage({ role: 'user', content: query });
    addMessage({ role: 'assistant', content: '' });
    setStreaming(true);
    setThinkingStep('classify');

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ query, mode: 'qa' }),
      });

      if (!response.ok || !response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';
      let buffer = '';

      const handleData = (dataStr: string) => {
        if (dataStr === '[DONE]') return;
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'node') {
            setThinkingStep(data.node_name);
          } else if (data.type === 'sources') {
            setLastAssistantSources(data.sources);
            // Focus the top-cited document/page in the PDF pane.
            if (data.sources?.length) {
              const top = data.sources[0];
              selectDocument(top.document);
              jumpToPage(top.page_number || 1);
            }
          } else if (data.type === 'token') {
            accumulatedAnswer += data.content;
            updateLastAssistantMessage(accumulatedAnswer);
          }
        } catch (e) {
          console.error('Error parsing SSE chunk', e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            if (line.startsWith('data: ')) handleData(line.slice(6).trim());
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      updateLastAssistantMessage('Sorry, something went wrong with the connection.');
    } finally {
      setStreaming(false);
      setThinkingStep('idle');
    }
  };

  return { sendMessage };
};
