// 티키가 한 말 읽어주기(명세 20.4 `POST /speech/synthesis`).
//
// - 아이가 버튼을 눌렀을 때만 소리를 낸다. 저절로 재생하지 않는다.
// - 서버 음성이 안 되면 브라우저 `speechSynthesis` 로 대신 읽는다.
// - 받은 음성은 한 번 듣고 버린다. 저장하지 않는다(명세 20.5).

import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesizeSpeech } from '../api/v1/endpoints';
import { useAuth } from '../providers/AuthProvider';
import { voiceMessage } from './protocol';

function speakWithBrowser(text: string, onNotice: (message: string) => void): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  if (typeof SpeechSynthesisUtterance === 'undefined') return false;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.startsWith('ko'));
  const speech = new SpeechSynthesisUtterance(text);
  if (voice) speech.voice = voice;
  speech.lang = 'ko-KR';
  speech.rate = 0.9;
  speech.onerror = () => onNotice('소리를 내지 못했어요. 화면의 글로 함께 읽어 볼까요?');
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
  return true;
}

/**
 * `speak` 는 반드시 아이의 버튼 누름(사용자 동작) 안에서 불러야 브라우저가 소리를 막지 않는다.
 * `messageId` 를 주면 서버가 그 메시지 본문을 읽어 준다(텍스트를 보내지 않아도 된다).
 */
export function useReadAloud(onNotice: (message: string) => void) {
  const { client } = useAuth();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const onNoticeRef = useRef(onNotice);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  const release = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      release();
      window.speechSynthesis?.cancel();
    };
  }, [release]);

  const speak = useCallback(
    async (key: string, body: { messageId?: string; text?: string; conversationId?: string }) => {
      if (speakingId === key) {
        release();
        window.speechSynthesis?.cancel();
        setSpeakingId(null);
        return;
      }
      release();
      window.speechSynthesis?.cancel();
      setSpeakingId(key);
      try {
        const blob = await synthesizeSpeech(client, body);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          release();
          setSpeakingId(null);
        };
        audio.onerror = () => {
          release();
          setSpeakingId(null);
          onNoticeRef.current(voiceMessage('TYPING_ONLY'));
        };
        await audio.play();
      } catch {
        // 서버 읽어주기가 막혔다. 브라우저 목소리로 대신 읽는다.
        const spoken = speakWithBrowser(body.text ?? '', onNoticeRef.current);
        setSpeakingId(null);
        if (!spoken) onNoticeRef.current('지금은 읽어 줄 수 없어요. 화면의 글을 함께 읽어 볼까요?');
      }
    },
    [client, release, speakingId],
  );

  return { speak, speakingId };
}
