import { useMutation } from '@tanstack/react-query';
import { ChoiceControl } from './ChoiceControl';
import { useEffect, useRef, useState } from 'react';
import { errorMessage, json } from '../api/requestOptions';
import { useBackend } from '../providers/BackendProvider';
import { useApiUrl } from '../api/ApiClientProvider';
import { useServerQuery } from '../hooks/useServerApi';
import type { Model } from '../api/schema';
import { captureSamples, createSpeechEndDetector } from '../audio/voiceCapture';

export function VoiceInput({
  sessionId,
  questionId,
  onText,
  disabled = false,
}: {
  sessionId: string;
  questionId?: string;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const { request, profileId } = useBackend();
  const settings = useServerQuery<Model<'SettingsResponse'>>(
    profileId ? `profiles/${profileId}/settings` : null,
  );
  const voiceDisabled = settings.data?.settings.voiceEnabled === false;
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
  const starting = useRef(false);
  const begin = async () => {
    if (active) {
      stop.current();
      return;
    }
    if (starting.current || disabled || voiceDisabled) return;
    starting.current = true;
    setError('');
    transcript.reset();
    ticketRequest.reset();
    setConnecting(true);
    let media: MediaStream | null = null;
    let closeCapture = () => {};
    let timer = 0;
    let disposed = false;
    let listening = false;
    const cleanup = () => {
      disposed = true;
      listening = false;
      starting.current = false;
      window.clearTimeout(timer);
      closeCapture();
      media?.getTracks().forEach((track) => track.stop());
    };
    const finishUI = () => {
      if (mounted.current) {
        setActive(false);
        setConnecting(false);
      }
    };
    release.current = cleanup;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('이 환경에서는 마이크를 사용할 수 없어요. 글로 입력해 주세요.');
      media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const stream = media;
      if (!mounted.current || disposed) {
        cleanup();
        return;
      }
      const detectEnd = createSpeechEndDetector();
      const checkEnd = (samples: Float32Array) => {
        const reason = detectEnd(samples);
        if (!reason) return;
        if (reason === 'no-speech') {
          setError('목소리를 듣지 못했어요. 마이크를 다시 눌러 주세요.');
          release.current();
          finishUI();
        } else stop.current();
      };
      if (live) {
        const ticket = await ticketRequest.mutateAsync();
        if (!mounted.current || disposed) {
          cleanup();
          return;
        }
        const socketUrl = new URL(
          /^wss?:\/\//.test(ticket.webSocketUrl)
            ? ticket.webSocketUrl
            : apiUrl(ticket.webSocketUrl),
          window.location.href,
        );
        socketUrl.protocol = ['https:', 'wss:'].includes(socketUrl.protocol) ? 'wss:' : 'ws:';
        socketUrl.searchParams.set('ticket', ticket.ticket);
        const socket = new WebSocket(socketUrl);
        let finalReceived = false;
        let packet: number[] = [];
        release.current = () => {
          cleanup();
          socket.close();
        };
        const fail = (message: string) => {
          if (disposed) return;
          if (mounted.current) setError(message);
          release.current();
          finishUI();
        };
        const flush = () => {
          if (!packet.length || socket.readyState !== WebSocket.OPEN) return;
          const bytes = new ArrayBuffer(packet.length * 2);
          const view = new DataView(bytes);
          packet.forEach((sample, i) =>
            view.setInt16(i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true),
          );
          socket.send(bytes);
          packet = [];
        };
        stop.current = () => {
          if (!listening || disposed) return;
          listening = false;
          window.clearTimeout(timer);
          closeCapture();
          stream.getTracks().forEach((track) => track.stop());
          flush();
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'STOP' }));
          setActive(false);
          setConnecting(true);
          timer = window.setTimeout(
            () => fail('음성 응답이 늦어지고 있어요. 다시 시도해 주세요.'),
            30000,
          );
        };
        timer = window.setTimeout(
          () => fail('음성 연결이 늦어지고 있어요. 다시 시도해 주세요.'),
          10000,
        );
        socket.onopen = async () => {
          try {
            if (disposed) return;
            window.clearTimeout(timer);
            socket.send(JSON.stringify({ type: 'START' }));
            closeCapture = await captureSamples(stream, (samples) => {
              if (!listening || disposed || socket.readyState !== WebSocket.OPEN) return;
              if (socket.bufferedAmount > 256000) {
                fail('연결이 느려 녹음을 멈췄어요. 다시 시도해 주세요.');
                return;
              }
              packet.push(...samples);
              if (packet.length >= 1600) flush();
              checkEnd(samples);
            });
            if (!mounted.current || disposed) {
              closeCapture();
              return;
            }
            listening = true;
            setActive(true);
            setConnecting(false);
            timer = window.setTimeout(() => stop.current(), 59000);
          } catch (error) {
            fail(errorMessage(error));
          }
        };
        socket.onmessage = (event) => {
          if (disposed || !mounted.current) return;
          try {
            const message = JSON.parse(String(event.data)) as {
              type: string;
              text?: string;
              message?: string;
            };
            if (message.text) onText(message.text);
            if (message.type === 'FINAL_TRANSCRIPT') {
              finalReceived = true;
              release.current();
              finishUI();
            } else if (message.type === 'ERROR') {
              fail(message.message ?? '다시 말해 주세요.');
            }
          } catch {
            fail('음성 응답을 읽지 못했어요. 다시 시도해 주세요.');
          }
        };
        socket.onerror = () => fail('음성 연결에 실패했어요. 녹음 입력으로 다시 시도해 주세요.');
        socket.onclose = () => {
          if (!disposed && !finalReceived) fail('음성 연결이 끊겼어요. 다시 말해 주세요.');
        };
      } else {
        if (typeof MediaRecorder === 'undefined')
          throw new Error('녹음을 지원하지 않는 브라우저예요. 글로 입력해 주세요.');
        const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((type) =>
          MediaRecorder.isTypeSupported(type),
        );
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        release.current = () => {
          cleanup();
          if (recorder.state !== 'inactive') recorder.stop();
        };
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        stop.current = () => {
          if (!listening || disposed) return;
          listening = false;
          window.clearTimeout(timer);
          closeCapture();
          if (recorder.state !== 'inactive') recorder.stop();
        };
        recorder.onstop = () => {
          const discard = disposed || !mounted.current;
          cleanup();
          if (discard) return;
          finishUI();
          const form = new FormData();
          const type = recorder.mimeType.split(';')[0] || 'audio/webm';
          form.append('file', new Blob(chunks, { type }), `voice.${type.split('/')[1]}`);
          form.append('conversationId', sessionId);
          transcript.mutate(form, {
            onSuccess: (r) => {
              if (mounted.current) onText(r.text);
            },
          });
        };
        recorder.onerror = () => {
          if (!mounted.current) return;
          setError('녹음에 실패했어요. 다시 시도해 주세요.');
          release.current();
          finishUI();
        };
        closeCapture = await captureSamples(stream, (samples) => {
          if (listening && !disposed) checkEnd(samples);
        });
        if (!mounted.current || disposed) {
          closeCapture();
          cleanup();
          return;
        }
        recorder.start();
        listening = true;
        setActive(true);
        setConnecting(false);
        timer = window.setTimeout(() => stop.current(), 59000);
      }
    } catch (e) {
      release.current();
      if (mounted.current) setError(errorMessage(e));
      finishUI();
    }
  };
  return (
    <div className="voice-input">
      <button
        className="btn light"
        disabled={pending || ((voiceDisabled || disabled) && !active)}
        onClick={() => void begin()}
      >
        {active ? '녹음 마치기' : pending ? '음성을 처리하고 있어요…' : '마이크로 입력'}
      </button>
      <ChoiceControl
        label="실시간 글자 보기"
        variant="switch"
        checked={live}
        disabled={active || pending || disabled}
        onChange={(e) => setLive(e.target.checked)}
      />
      {active && (
        <p role="status">듣고 있어요{live ? ' · 인식되는 글자를 입력란에 표시해요.' : '…'}</p>
      )}
      {failure && <p role="alert">{failure}</p>}
      {voiceDisabled && <p>보호자 설정에서 음성 사용이 꺼져 있어요. 글로 입력해 주세요.</p>}
      <small>
        말을 마치고 1.5초 쉬면 자동으로 녹음을 마쳐요. 인식한 문장을 확인하고 보내 주세요.
      </small>
    </div>
  );
}
