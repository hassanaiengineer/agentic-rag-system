import { useUIStore } from '../store/useUIStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useStreamingChat = () => {
  const { 
    addMessage, 
    updateLastAssistantMessage, 
    setStreaming, 
    setThinkingStep, 
    tenantId 
  } = useUIStore();

  const sendMessage = async (query: string) => {
    addMessage({ role: 'user', content: query });
    addMessage({ role: 'assistant', content: '' });
    setStreaming(true);
    setThinkingStep('retrieve');

    try {
      const response = await fetch(`${BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({ query, mode: 'qa' }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'node') {
              setThinkingStep(data.node_name);
            } else if (data.type === 'token') {
              accumulatedAnswer += data.content;
              updateLastAssistantMessage(accumulatedAnswer);
            }
          } catch (e) {
            console.error('Error parsing NDJSON chunk', e);
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
