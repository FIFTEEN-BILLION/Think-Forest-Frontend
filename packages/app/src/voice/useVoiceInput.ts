// 실시간 음성 입력(명세 20절). 대화 화면의 마이크 버튼이 부른다.
//
// 흐름
//   마이크 허락 → POST /speech/stream-tickets → wss 연결 → START →
//   16kHz mono PCM s16le 조각(40ms) 전송 → PARTIAL_TRANSCRIPT 자막 →
//   STOP → FINAL_TRANSCRIPT 를 **입력창에만** 넣는다. 자동으로 보내지 않는다.
//
// 막혔을 때 차례
//   1) 실시간 스트리밍
//   2) 같은 발화를 MediaRecorder 로 함께 녹음해 두었다가 POST /speech/transcriptions 로 한 번 재시도
//   3) 그래도 안 되면 글로 쓰기(브라우저 음성 인식은 캡처 자체가 안 되는 기기에서만 마지막 수단)
//
// 보관: 중간 자막과 소리는 어디에도 저장하지 않는다. 끝나면 버퍼를 비운다(명세 20.5).

import { useCallback, useEffect, useRef, useState } from 'react';
import { V1Error } from '../api/v1/client';
import { createSpeechStreamTicket, transcribeRecording } from '../api/v1/endpoints';
import type { SpeechStreamTicket } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { createFrameBuffer, createResampler, peakLevel } from './pcm';
import type { VoiceAction, VoiceState } from './protocol';
import {
  initialVoiceState,
  parseServerFrame,
  reduceVoice,
  shouldRetryWithRecording,
  streamSocketUrl,
  voiceMessage,
} from './protocol';
import { isNativeSpeechCapable, listenToNative, postToNative } from './nativeBridge';
import { setVoiceSession } from './session';

/** 명세 20.3 — 한 발화는 60초까지, 50초쯤 부드럽게 마무리를 안내한다. */
export const MAX_UTTERANCE_SECONDS = 60;
export const WARN_UTTERANCE_SECONDS = 50;
/** STOP 뒤 최종 문장을 기다리는 시간. 넘으면 끊긴 것으로 본다. */
const FINAL_TIMEOUT_MS = 12000;
/** 이보다 조용하면 무음으로 본다(마이크 음소거·먼 거리). */
const SILENCE_PEAK = 0.012;
const WORKLET_URL = '/voice/pcm-worklet.js';
const WORKLET_NAME = 'jjcp-pcm-capture';

export interface VoiceInputOptions {
  conversationId?: string;
  questionId?: string;
  /** 캡처 자체가 불가능한 기기에서 브라우저 음성 인식을 마지막 수단으로 쓸지. 기본 true. */
  allowBrowserRecognition?: boolean;
}

interface BrowserRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function micErrorCode(error: unknown): string {
  const name = (error as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'MIC_DENIED';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'MIC_MISSING';
  if (name === 'NotReadableError' || name === 'AbortError') return 'MIC_BUSY';
  return 'MIC_UNSUPPORTED';
}

/** 서버 오류를 화면 코드로 옮긴다. 인증 오류는 화면 가드가 처리하므로 그대로 올린다. */
function ticketErrorCode(error: unknown): string {
  if (!(error instanceof V1Error)) return 'NETWORK_ERROR';
  if (error.status === 0) return 'NETWORK_ERROR';
  if (error.code === 'CONSENT_REQUIRED' || error.code === 'RATE_LIMITED') return error.code;
  if (error.status === 503)
    return error.code === 'SPEECH_UNAVAILABLE' ? error.code : 'STREAMING_UNAVAILABLE';
  return error.code;
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const wanted = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return wanted.find((type) => MediaRecorder.isTypeSupported?.(type));
}

/**
 * 마이크 버튼 하나로 듣기를 켜고 끈다.
 * `setText` 는 확정 문장이 나왔을 때만 부른다(중간 자막은 입력창에 넣지 않는다).
 */
export function useVoiceInput(
  setText: (text: string) => void,
  onNotice: (message: string) => void,
  options: VoiceInputOptions = {},
) {
  const { client } = useAuth();
  const [listening, setListening] = useState(false);

  const stateRef = useRef<VoiceState>(initialVoiceState);
  const startedAtRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const timersRef = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);
  const limitsArmedRef = useRef(false);
  const armLimitsRef = useRef<(() => void) | null>(null);
  const peakRef = useRef(0);
  const finishedRef = useRef(false);
  const recoveredRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // 콜백과 설정은 최신 값을 쓰되, 훅을 다시 만들지 않도록 ref 에 담아 둔다.
  const setTextRef = useRef(setText);
  const onNoticeRef = useRef(onNotice);
  const optionsRef = useRef(options);
  useEffect(() => {
    setTextRef.current = setText;
    onNoticeRef.current = onNotice;
    optionsRef.current = options;
  }, [onNotice, options, setText]);

  const publish = useCallback((next: VoiceState) => {
    stateRef.current = next;
    const elapsed = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : 0;
    setVoiceSession({ ...next, elapsedSeconds: elapsed });
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    tickRef.current = null;
    limitsArmedRef.current = false;
  }, []);

  /** PCM 조각 만들기를 멈춘다. 마이크 스트림은 녹음 재시도를 위해 남겨 둔다. */
  const stopWorklet = useCallback(() => {
    nodeRef.current?.port.postMessage('stop');
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    void contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
  }, []);

  /** 소리를 잡던 것들을 모두 내려놓는다. 버퍼는 남기지 않는다. */
  const teardownCapture = useCallback(() => {
    stopWorklet();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [stopWorklet]);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (!socket) return;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      socket.close();
  }, []);

  const finish = useCallback(
    (next: VoiceState) => {
      finishedRef.current = true;
      clearTimers();
      teardownCapture();
      closeSocket();
      recorderRef.current = null;
      chunksRef.current = [];
      abortRef.current = null;
      setListening(false);
      publish(next);
      if (next.finalText) setTextRef.current(next.finalText);
      if (next.notice && (next.noticeKind === 'error' || next.finalText === ''))
        onNoticeRef.current(next.notice);
    },
    [clearTimers, closeSocket, publish, teardownCapture],
  );

  /** 녹음해 둔 소리를 파일로 한 번 더 보낸다(명세 20.3). 한 발화에 한 번만. */
  const recoverWithRecording = useCallback(
    async (reasonCode: string) => {
      const recorder = recorderRef.current;
      const recorded = await new Promise<Blob | null>((resolve) => {
        if (!recorder || recoveredRef.current) return resolve(null);
        recoveredRef.current = true;
        if (recorder.state === 'inactive') {
          resolve(
            chunksRef.current.length
              ? new Blob(chunksRef.current, { type: recorder.mimeType })
              : null,
          );
          return;
        }
        recorder.onstop = () =>
          resolve(
            chunksRef.current.length
              ? new Blob(chunksRef.current, { type: recorder.mimeType })
              : null,
          );
        recorder.stop();
      });
      if (!recorded || recorded.size === 0) {
        finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: reasonCode }));
        return;
      }
      publish(reduceVoice(stateRef.current, { type: 'RECOVER' }));
      teardownCapture();
      closeSocket();
      try {
        const extension = recorded.type.includes('mp4')
          ? 'm4a'
          : recorded.type.includes('ogg')
            ? 'ogg'
            : 'webm';
        const result = await transcribeRecording(client, recorded, `speech.${extension}`);
        finish(reduceVoice(stateRef.current, { type: 'RECOVERED', text: result.text }));
      } catch (error) {
        // 여기서 끝이다. 다시 "녹음해 볼게요" 라고 하지 않고 서버가 준 사유를 그대로 보여 준다.
        const code = error instanceof V1Error ? error.code : 'NETWORK_ERROR';
        const message = error instanceof V1Error ? error.message : undefined;
        finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code, message }));
      }
    },
    [client, closeSocket, finish, publish, teardownCapture],
  );

  const apply = useCallback(
    (action: VoiceAction) => {
      if (finishedRef.current) return;
      const next = reduceVoice(stateRef.current, action);
      if (next === stateRef.current) return;
      if (next.phase === 'done') {
        finish(next);
        return;
      }
      if (next.phase === 'error') {
        const code = next.errorCode ?? 'TYPING_ONLY';
        if (shouldRetryWithRecording(code) && !recoveredRef.current) {
          const stillSpeaking =
            recorderRef.current?.state === 'recording' && stateRef.current.phase === 'listening';
          if (stillSpeaking) {
            // 아이가 아직 말하는 중이다. 녹음만 이어 가고 멈출 때 파일로 한 번 보낸다.
            stopWorklet();
            closeSocket();
            publish({
              ...stateRef.current,
              notice: voiceMessage(code, next.notice),
              noticeKind: 'warning',
            });
            armLimitsRef.current?.();
            return;
          }
          void recoverWithRecording(code);
          return;
        }
        finish(next);
        return;
      }
      publish(next);
    },
    [closeSocket, finish, publish, recoverWithRecording, stopWorklet],
  );

  /** 마지막 수단: 브라우저 음성 인식. 마이크 캡처 자체가 안 되는 기기에서만 쓴다. */
  const startBrowserRecognition = useCallback(
    (fallbackCode: string) => {
      const view = window as typeof window & {
        SpeechRecognition?: new () => BrowserRecognition;
        webkitSpeechRecognition?: new () => BrowserRecognition;
      };
      const Recognition = view.SpeechRecognition ?? view.webkitSpeechRecognition;
      if (optionsRef.current.allowBrowserRecognition === false || !Recognition) {
        finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: fallbackCode }));
        return;
      }
      const instance = new Recognition();
      recognitionRef.current = instance;
      instance.lang = 'ko-KR';
      instance.interimResults = true;
      instance.continuous = false;
      instance.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        publish({ ...stateRef.current, phase: 'listening', partial: text, stablePrefix: '' });
      };
      instance.onend = () => {
        const text = stateRef.current.partial.trim();
        recognitionRef.current = null;
        finish(
          text
            ? reduceVoice(stateRef.current, { type: 'RECOVERED', text })
            : reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: 'NO_SPEECH_DETECTED' }),
        );
      };
      instance.onerror = () => {
        recognitionRef.current = null;
        finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: fallbackCode }));
      };
      publish({
        ...stateRef.current,
        phase: 'listening',
        notice: '이 기기에서는 간단 듣기로 들을게요.',
        noticeKind: 'hint',
      });
      instance.start();
    },
    [finish, publish],
  );

  const stop = useCallback(() => {
    if (finishedRef.current) return;
    if (stateRef.current.phase === 'preparing') {
      // 아직 준비 중이면 그냥 그만둔다(오류가 아니다).
      abortRef.current?.abort();
      finish({ ...initialVoiceState });
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    if (isNativeSpeechCapable()) {
      postToNative({ type: 'STOP_SPEECH' });
      apply({ type: 'STOP' });
      return;
    }
    apply({ type: 'STOP' });
    clearTimers();
    // 남은 소리 꼬리까지 보내고 STOP 을 알린다.
    nodeRef.current?.port.postMessage('stop');
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'STOP' }));
    if (peakRef.current < SILENCE_PEAK && !stateRef.current.partial) {
      // 아무 소리도 없었으면 서버 답을 기다리지 않고 바로 알려 준다.
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: 'SILENT' }));
      return;
    }
    if (!socket) {
      // 접속권이 막혀 녹음만 하던 경우. 기다리지 않고 바로 파일로 보낸다.
      void recoverWithRecording('STREAMING_UNAVAILABLE');
      return;
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    timersRef.current.push(
      window.setTimeout(
        () => apply({ type: 'LOCAL_ERROR', code: 'DISCONNECTED' }),
        FINAL_TIMEOUT_MS,
      ),
    );
  }, [apply, clearTimers, finish, recoverWithRecording]);

  /** 듣는 동안 흐른 시간을 알리고, 50초에 안내하고, 60초에 스스로 마친다. */
  const armUtteranceLimits = useCallback(() => {
    if (limitsArmedRef.current) return;
    limitsArmedRef.current = true;
    timersRef.current.push(
      window.setTimeout(() => {
        publish({
          ...stateRef.current,
          notice: voiceMessage('UTTERANCE_ENDING_SOON'),
          noticeKind: 'warning',
        });
      }, WARN_UTTERANCE_SECONDS * 1000),
      window.setTimeout(() => stop(), MAX_UTTERANCE_SECONDS * 1000),
    );
    tickRef.current = window.setInterval(() => publish(stateRef.current), 1000);
  }, [publish, stop]);
  useEffect(() => {
    armLimitsRef.current = armUtteranceLimits;
  }, [armUtteranceLimits]);

  const openSocket = useCallback(
    (ticket: SpeechStreamTicket) =>
      new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(streamSocketUrl(ticket.webSocketUrl, ticket.ticket));
        socket.binaryType = 'arraybuffer';
        socketRef.current = socket;
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'START', streamId: ticket.streamId }));
          resolve(socket);
        };
        socket.onerror = () => reject(new Error('socket'));
        socket.onclose = () => apply({ type: 'CLOSED' });
        socket.onmessage = (event) => {
          const frame = parseServerFrame(event.data);
          if (frame) apply({ type: 'FRAME', frame });
        };
      }),
    [apply],
  );

  const start = useCallback(async () => {
    finishedRef.current = false;
    recoveredRef.current = false;
    limitsArmedRef.current = false;
    peakRef.current = 0;
    chunksRef.current = [];
    startedAtRef.current = Date.now();
    setListening(true);
    apply({ type: 'PREPARE' });

    // 1) 마이크. 접속권보다 먼저 받아야 30초 만료 안에 연결할 수 있다.
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined')
        throw Object.assign(new Error('unsupported'), { name: 'UnsupportedError' });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      const code = micErrorCode(error);
      if (code === 'MIC_UNSUPPORTED') {
        startBrowserRecognition(code);
        return;
      }
      finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code }));
      return;
    }
    streamRef.current = stream;

    // 2) 같은 발화를 파일로도 받아 둔다. 스트리밍이 막히면 이 녹음을 한 번 보낸다(명세 20.3).
    const mimeType = pickRecorderMime();
    if (mimeType) {
      try {
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.start(1000);
        recorderRef.current = recorder;
      } catch {
        recorderRef.current = null;
      }
    }

    // 3) 접속권(1회용) → WebSocket
    let ticket: SpeechStreamTicket;
    try {
      abortRef.current = new AbortController();
      ticket = await createSpeechStreamTicket(
        client,
        {
          conversationId: optionsRef.current.conversationId,
          questionId: optionsRef.current.questionId,
        },
        abortRef.current.signal,
      );
    } catch (error) {
      if (error instanceof V1Error && error.status === 401) {
        finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code: 'TYPING_ONLY' }));
        return;
      }
      const code = ticketErrorCode(error);
      if (shouldRetryWithRecording(code)) {
        // 접속권 자체가 막혔다. 끝까지 녹음하고 멈출 때 파일로 보낸다.
        publish(reduceVoice(stateRef.current, { type: 'OPEN' }));
        publish({ ...stateRef.current, notice: voiceMessage(code), noticeKind: 'warning' });
        armUtteranceLimits();
        return;
      }
      finish(reduceVoice(stateRef.current, { type: 'LOCAL_ERROR', code }));
      return;
    }

    let socket: WebSocket;
    try {
      socket = await openSocket(ticket);
    } catch {
      void recoverWithRecording('STREAMING_UNAVAILABLE');
      return;
    }
    if (finishedRef.current) return;
    apply({ type: 'OPEN' });

    // 4) 소리를 16kHz PCM 조각으로 바꿔 계속 보낸다.
    try {
      const context = new AudioContext();
      contextRef.current = context;
      await context.audioWorklet.addModule(WORKLET_URL);
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, WORKLET_NAME);
      nodeRef.current = node;
      const resampler = createResampler(context.sampleRate);
      const frames = createFrameBuffer();
      node.port.onmessage = (event: MessageEvent<{ samples: Float32Array }>) => {
        const samples = event.data?.samples;
        if (!samples) return;
        const level = peakLevel(samples);
        if (level > peakRef.current) peakRef.current = level;
        if (socket.readyState !== WebSocket.OPEN) return;
        frames.push(resampler.process(samples)).forEach((frame) => socket.send(frame));
      };
      source.connect(node);
      // 마이크 소리가 스피커로 되돌아가지 않도록 소리 크기 0 으로 목적지에 잇는다.
      // (일부 브라우저는 목적지까지 이어져 있어야 워클릿이 돈다.)
      const mute = context.createGain();
      mute.gain.value = 0;
      node.connect(mute);
      mute.connect(context.destination);
    } catch {
      void recoverWithRecording('STREAMING_UNAVAILABLE');
      return;
    }
    if (!finishedRef.current) armUtteranceLimits();
  }, [
    apply,
    armUtteranceLimits,
    client,
    finish,
    openSocket,
    publish,
    recoverWithRecording,
    startBrowserRecognition,
  ]);

  const listen = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    if (isNativeSpeechCapable()) {
      // 네이티브 녹음기가 준비된 셸에서는 캡처를 네이티브에 맡긴다(명세 20.4).
      finishedRef.current = false;
      startedAtRef.current = Date.now();
      setListening(true);
      apply({ type: 'PREPARE' });
      postToNative({ type: 'START_SPEECH', locale: 'ko-KR' });
      apply({ type: 'OPEN' });
      return;
    }
    void start();
  }, [apply, listening, start, stop]);

  // 네이티브가 자막·최종 문장을 보내 주는 경우(명세 20.4).
  useEffect(
    () =>
      listenToNative((message) => {
        if (message.type === 'PARTIAL_TRANSCRIPT')
          apply({
            type: 'FRAME',
            frame: {
              type: 'PARTIAL_TRANSCRIPT',
              sequence: message.sequence ?? stateRef.current.sequence + 1,
              text: message.text,
              stablePrefix: message.stablePrefix ?? '',
            },
          });
        else if (message.type === 'FINAL_TRANSCRIPT')
          apply({
            type: 'FRAME',
            frame: {
              type: 'FINAL_TRANSCRIPT',
              streamId: '',
              text: message.text,
              confidence: message.confidence ?? 0,
              durationMs: message.durationMs ?? null,
            },
          });
        else if (message.type === 'ERROR')
          apply({ type: 'LOCAL_ERROR', code: message.code, message: message.message });
      }),
    [apply],
  );

  // 화면을 떠나면 마이크·연결·버퍼를 모두 정리한다.
  useEffect(
    () => () => {
      finishedRef.current = true;
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
      recognitionRef.current?.stop();
      abortRef.current?.abort();
      nodeRef.current?.disconnect();
      void contextRef.current?.close().catch(() => undefined);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      socketRef.current?.close();
      socketRef.current = null;
      chunksRef.current = [];
    },
    [],
  );

  return { listening, listen, stop };
}
