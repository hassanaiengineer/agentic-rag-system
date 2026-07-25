import { api } from './apiClient';

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'voice.wav');
  const res = await api.post<{ text: string }>('/transcribe', form);
  return res.data.text || '';
}
