import React, { useRef, useState } from 'react';
import { useStreamingChat } from '../hooks/useStreamingChat';
import { Send, Hash, Mic, Square, Loader2 } from 'lucide-react';
import { WavRecorder } from '../lib/wavRecorder';
import { transcribeAudio } from '../services/voice';
import { cn } from '../lib/utils';

type VoiceState = 'idle' | 'recording' | 'transcribing';

export const QueryInput: React.FC = () => {
  const [query, setQuery] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const { sendMessage } = useStreamingChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    sendMessage(query);
    setQuery('');
  };

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const recorder = new WavRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setVoiceState('recording');
    } catch {
      setVoiceError('Microphone access denied. Enable it in your browser settings.');
      setVoiceState('idle');
    }
  };

  const stopAndTranscribe = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setVoiceState('transcribing');
    try {
      const blob = recorder.stop();
      recorderRef.current = null;
      const text = await transcribeAudio(blob);
      if (text.trim()) {
        sendMessage(text.trim()); // voice search: transcribe → ask straight away
        setQuery('');
      } else {
        setVoiceError("Didn't catch that — try speaking again.");
      }
    } catch {
      setVoiceError('Transcription failed. Please try again.');
    } finally {
      setVoiceState('idle');
    }
  };

  const toggleVoice = () => {
    if (voiceState === 'idle') startRecording();
    else if (voiceState === 'recording') stopAndTranscribe();
  };

  const placeholder =
    voiceState === 'recording'
      ? 'Listening… tap the stop button when you finish'
      : voiceState === 'transcribing'
        ? 'Transcribing your voice…'
        : 'Ask anything about your documents…';

  return (
    <div className="p-4 bg-white border-t border-slate-200">
      <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Hash className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={voiceState !== 'idle'}
          placeholder={placeholder}
          className="block w-full pl-11 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:opacity-70"
        />

        <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1.5">
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleVoice}
            disabled={voiceState === 'transcribing'}
            title={voiceState === 'recording' ? 'Stop and transcribe' : 'Ask with your voice'}
            className={cn(
              'h-full aspect-square flex items-center justify-center rounded-xl transition-all',
              voiceState === 'recording'
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : voiceState === 'transcribing'
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
            )}
          >
            {voiceState === 'transcribing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : voiceState === 'recording' ? (
              <Square className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!query.trim() || voiceState !== 'idle'}
            className="h-full px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {voiceError ? (
        <p className="mt-2 text-center text-[11px] text-red-500 font-medium">{voiceError}</p>
      ) : (
        <p className="mt-2 text-center text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          {voiceState === 'recording'
            ? '● Recording — powered by Gemini speech-to-text'
            : 'AI-Powered Document Intelligence · Type or 🎙 speak'}
        </p>
      )}
    </div>
  );
};
