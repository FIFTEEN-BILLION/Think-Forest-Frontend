// 네이티브 셸(WebView)과 주고받는 다리(명세 20.4).
//
// 지금은 WebView 가 스스로 `getUserMedia` 로 소리를 잡는다(`WebViewScreen` 이 마이크 권한을 자동 허용한다).
// 그래서 웹 캡처가 기본이고, 이 다리는 두 가지를 위해 열어 둔다.
//   1) 앞으로 네이티브 녹음기를 붙이면 `SPEECH_CAPABLE` 을 알려 웹 캡처를 대신하게 한다.
//   2) 푸시 토큰처럼 웹이 스스로 얻을 수 없는 값을 네이티브가 넘겨준다(명세 21).
//
// 웹 → 네이티브: START_SPEECH · STOP_SPEECH
// 네이티브 → 웹: NATIVE_READY · SPEECH_CAPABLE · PARTIAL_TRANSCRIPT · FINAL_TRANSCRIPT · ERROR · PUSH_TOKEN

export type NativeToWebMessage =
  | { type: 'NATIVE_READY'; platform: 'ios' | 'android' }
  | { type: 'SPEECH_CAPABLE'; capable: boolean }
  | { type: 'PARTIAL_TRANSCRIPT'; sequence?: number; text: string; stablePrefix?: string }
  | { type: 'FINAL_TRANSCRIPT'; text: string; confidence?: number; durationMs?: number }
  | { type: 'ERROR'; code: string; message?: string }
  | { type: 'PUSH_TOKEN'; platform: 'IOS' | 'ANDROID'; pushToken: string; installationId?: string };

export type WebToNativeMessage = { type: 'START_SPEECH'; locale: string } | { type: 'STOP_SPEECH' };

/** 네이티브 셸이 심어 둔 창(`WebViewScreen` 의 injectedJavaScriptBeforeContentLoaded). */
interface BridgeWindow {
  ReactNativeWebView?: { postMessage(payload: string): void };
  __JJCP_NATIVE__?: { platform?: 'ios' | 'android' };
}

const bridgeWindow = (): BridgeWindow | null =>
  typeof window === 'undefined' ? null : (window as unknown as BridgeWindow);

export function isNativeShell(): boolean {
  const view = bridgeWindow();
  return Boolean(view?.ReactNativeWebView && view?.__JJCP_NATIVE__);
}

/** 네이티브 녹음기가 준비됐다고 알려 왔는지. 기본은 아니오 — 웹 캡처를 쓴다. */
let nativeSpeechCapable = false;
export const isNativeSpeechCapable = () => nativeSpeechCapable;

export function postToNative(message: WebToNativeMessage): boolean {
  const view = bridgeWindow();
  if (!view?.ReactNativeWebView) return false;
  view.ReactNativeWebView.postMessage(JSON.stringify(message));
  return true;
}

function parse(data: unknown): NativeToWebMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const body = JSON.parse(data) as { type?: unknown };
    return typeof body?.type === 'string' ? (body as NativeToWebMessage) : null;
  } catch {
    return null;
  }
}

/**
 * 네이티브가 보내는 메시지를 듣는다. 네이티브는 `document`·`window` 양쪽에 message 이벤트를 보낼 수 있어
 * 둘 다 듣는다. 돌려주는 함수를 부르면 구독을 푼다.
 */
export function listenToNative(handler: (message: NativeToWebMessage) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onMessage = (event: Event) => {
    const message = parse((event as MessageEvent).data);
    if (!message) return;
    if (message.type === 'SPEECH_CAPABLE') nativeSpeechCapable = message.capable;
    handler(message);
  };
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
    document.removeEventListener('message', onMessage);
  };
}
