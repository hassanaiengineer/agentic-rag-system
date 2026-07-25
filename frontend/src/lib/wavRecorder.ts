// Records microphone audio and encodes it as a 16-bit PCM mono WAV blob.
// We deliberately produce WAV (not the browser-default webm/opus) because Gemini's
// audio input accepts WAV/MP3/OGG/FLAC but not webm.

function mergeBuffers(chunks: Float32Array[], total: number): Float32Array {
  const result = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export class WavRecorder {
  private ctx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffers: Float32Array[] = [];
  private length = 0;
  private sampleRate = 44100;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.buffers = [];
    this.length = 0;

    this.processor.onaudioprocess = (e) => {
      const channel = e.inputBuffer.getChannelData(0);
      this.buffers.push(new Float32Array(channel));
      this.length += channel.length;
    };

    // Route through a muted gain node so the processor fires without echoing to speakers.
    const silent = this.ctx.createGain();
    silent.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(silent);
    silent.connect(this.ctx.destination);
  }

  stop(): Blob {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());

    const merged = mergeBuffers(this.buffers, this.length);
    const wav = encodeWav(merged, this.sampleRate);

    this.ctx?.close();
    this.ctx = null;
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.buffers = [];
    this.length = 0;

    return new Blob([wav], { type: 'audio/wav' });
  }

  abort(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.ctx = null;
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.buffers = [];
    this.length = 0;
  }
}
