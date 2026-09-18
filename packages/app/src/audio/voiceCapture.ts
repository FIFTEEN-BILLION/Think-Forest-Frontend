export type SpeechEnd = 'silence' | 'no-speech' | 'limit';

/** Use audio time, so delayed rendering cannot cut off a sentence early. */
export function createSpeechEndDetector(sampleRate = 16000) {
  let elapsed = 0;
  let voiced = 0;
  let lastVoice = 0;
  let ended = false;
  return (samples: Float32Array): SpeechEnd | null => {
    if (ended || samples.length === 0) return null;
    const duration = (samples.length * 1000) / sampleRate;
    elapsed += duration;
    const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    if (rms >= 0.015) {
      voiced += duration;
      lastVoice = elapsed;
    }
    const reason =
      elapsed >= 59000
        ? 'limit'
        : voiced >= 200 && elapsed - lastVoice >= 1500
          ? 'silence'
          : voiced < 200 && elapsed >= 8000
            ? 'no-speech'
            : null;
    ended = reason !== null;
    return reason;
  };
}

/** Both upload and streaming use the same microphone/silence detection path. */
export async function captureSamples(
  stream: MediaStream,
  onSamples: (samples: Float32Array) => void,
) {
  const context = new AudioContext({ sampleRate: 16000 });
  let input: MediaStreamAudioSourceNode | undefined;
  let node: AudioWorkletNode | undefined;
  let mute: GainNode | undefined;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    input?.disconnect();
    if (node) node.port.onmessage = null;
    node?.disconnect();
    mute?.disconnect();
    void context.close().catch(() => {});
  };
  const url = URL.createObjectURL(
    new Blob(
      [
        `class Capture extends AudioWorkletProcessor {
          process(inputs) {
            const samples = inputs[0]?.[0];
            if (samples) this.port.postMessage(samples);
            return true;
          }
        }
        registerProcessor('voice-capture', Capture);`,
      ],
      { type: 'text/javascript' },
    ),
  );
  try {
    if (context.sampleRate !== 16000)
      throw new Error('16kHz 마이크 입력을 지원하지 않는 환경이에요.');
    await context.resume();
    await context.audioWorklet.addModule(url);
    input = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, 'voice-capture');
    mute = context.createGain();
    mute.gain.value = 0;
    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (!closed) onSamples(event.data);
    };
    input.connect(node);
    node.connect(mute);
    mute.connect(context.destination);
    return close;
  } catch (error) {
    close();
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
