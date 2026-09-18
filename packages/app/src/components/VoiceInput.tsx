import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { errorMessage, json } from '../api/requestOptions';
import { useBackend } from '../providers/BackendProvider';
import { useApiUrl } from '../api/ApiClientProvider';

export function VoiceInput({
  sessionId,
  questionId,
  onText,
}: {
  sessionId: string;
  questionId?: string;
  onText: (text: string) => void;
}) {
  const { request } = useBackend();
  const apiUrl = useApiUrl();
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const transcript = useMutation({
    mutationFn: (form: FormData) =>
      request<{ text: string }>('speech/transcriptions', { method: 'POST', body: form }),
    gcTime: 0,
  });
  const ticketRequest = useMutation({
    mutationFn: () =>
      request<{ ticket: string; webSocketUrl: string }>(
        'speech/stream-tickets',
        json({
          conversationId: sessionId,
          questionId,
          locale: 'ko-KR',
          audio: { encoding: 'PCM_S16LE', sampleRate: 16000, channels: 1 },
        }),
      ),
    gcTime: 0,
  });
  const pending = connecting || transcript.isPending || ticketRequest.isPending;
  const failure = error || (transcript.error ? errorMessage(transcript.error) : '');
  const release = useRef<() => void>(() => {});
  const stop = useRef<() => void>(() => {});
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      release.current();
    };
  }, []);
  const begin = async () => {
    if (active) {
      stop.current();
      return;
    }
    setError('');
    transcript.reset();
    ticketRequest.reset();
    setConnecting(true);
    let media: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('이 환경에서는 마이크를 사용할 수 없어요. 글로 입력해 주세요.');
      media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true },
      });
      const stream = media;
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (live && questionId) {
        const ticket = await ticketRequest.mutateAsync();
        if (!mounted.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const context = new AudioContext({ sampleRate: 16000 });
        if (context.sampleRate !== 16000) {
          await context.close();
          throw new Error('실시간 입력 대신 녹음 입력을 사용해 주세요.');
        }
        const worklet = URL.createObjectURL(
          new Blob(
            [
              `class Capture extends AudioWorkletProcessor { process(inputs) { const samples=inputs[0]?.[0]; if(samples) this.port.postMessage(samples); return true; } } registerProcessor('voice-capture',Capture);`,
            ],
            { type: 'text/javascript' },
          ),
        );
        try {
          await context.audioWorklet.addModule(worklet);
        } finally {
          URL.revokeObjectURL(worklet);
        }
        if (!mounted.current) {
          await context.close();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const socketUrl = new URL(apiUrl(ticket.webSocketUrl), window.location.href);
        socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        socketUrl.searchParams.set('ticket', ticket.ticket);
        const socket = new WebSocket(socketUrl);
        const input = context.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(context, 'voice-capture');
        const mute = context.createGain();
        mute.gain.value = 0;
        let sending = true;
        let closed = false;
        let timeout = 0;
        const cleanup = () => {
          if (closed) return;
          closed = true;
          sending = false;
          window.clearTimeout(timeout);
          input.disconnect();
          node.disconnect();
          mute.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          if (context.state !== 'closed') void context.close().catch(() => {});
          socket.close();
        };
        release.current = cleanup;
        stop.current = () => {
          sending = false;
          input.disconnect();
          stream.getTracks().forEach((track) => track.stop());
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'STOP' }));
          setActive(false);
          setConnecting(true);
        };
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'START' }));
          input.connect(node);
          node.connect(mute);
          mute.connect(context.destination);
          node.port.onmessage = (event: MessageEvent<Float32Array>) => {
            if (!sending || socket.readyState !== WebSocket.OPEN) return;
            if (socket.bufferedAmount > 256000) {
              setError('연결이 느려 녹음을 멈췄어요.');
              stop.current();
              return;
            }
            const bytes = new ArrayBuffer(event.data.length * 2);
            const view = new DataView(bytes);
            event.data.forEach((sample, i) =>
              view.setInt16(i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true),
            );
            socket.send(bytes);
          };
          setActive(true);
          setConnecting(false);
          timeout = window.setTimeout(() => stop.current(), 59000);
        };
        socket.onmessage = (event) => {
          const message = JSON.parse(String(event.data)) as {
            type: string;
            text?: string;
            message?: string;
          };
          if (message.text) onText(message.text);
          if (message.type === 'FINAL_TRANSCRIPT' || message.type === 'ERROR') {
            if (message.type === 'ERROR') setError(message.message ?? '다시 말해 주세요.');
            cleanup();
            setActive(false);
            setConnecting(false);
          }
        };
        socket.onerror = () => {
          setError('음성 연결에 실패했어요. 녹음 입력으로 다시 시도해 주세요.');
          cleanup();
          setActive(false);
          setConnecting(false);
        };
        socket.onclose = () => {
          cleanup();
          setActive(false);
          setConnecting(false);
        };
      } else {
        if (typeof MediaRecorder === 'undefined')
          throw new Error('녹음을 지원하지 않는 브라우저예요. 글로 입력해 주세요.');
        const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) =>
          MediaRecorder.isTypeSupported(type),
        );
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        let discard = false;
        const timeout = window.setTimeout(() => stop.current(), 59000);
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        release.current = () => {
          discard = true;
          window.clearTimeout(timeout);
          if (recorder.state !== 'inactive') recorder.stop();
          stream.getTracks().forEach((track) => track.stop());
        };
        stop.current = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        recorder.onstop = () => {
          window.clearTimeout(timeout);
          stream.getTracks().forEach((track) => track.stop());
          setActive(false);
          if (discard) return;
          const form = new FormData();
          const type = recorder.mimeType.split(';')[0] || 'audio/webm';
          form.append('file', new Blob(chunks, { type }), `voice.${type.split('/')[1]}`);
          form.append('conversationId', sessionId);
          transcript.mutate(form, {
            onSuccess: (r) => {
              if (mounted.current && !discard) onText(r.text);
            },
          });
        };
        recorder.start();
        setActive(true);
        setConnecting(false);
      }
    } catch (e) {
      media?.getTracks().forEach((track) => track.stop());
      setError(errorMessage(e));
      setConnecting(false);
    }
  };
  return (
    <div className="voice-input">
      <button className="btn light" disabled={pending} onClick={() => void begin()}>
        {active ? '녹음 마치기' : pending ? '음성을 처리하고 있어요…' : '마이크로 입력'}
      </button>
      {questionId && (
        <label>
          <input
            type="checkbox"
            checked={live}
            disabled={active || pending}
            onChange={(e) => setLive(e.target.checked)}
          />{' '}
          실시간 글자 보기
        </label>
      )}
      {failure && <p role="alert">{failure}</p>}
      <small>인식한 문장을 확인하고 보내 주세요. 음성은 저장하지 않아요.</small>
    </div>
  );
}
