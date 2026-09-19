import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Button, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Card, Description, Screen, Title } from '../components';

/**
 * 음성 다리(명세 20.4).
 *
 * 지금 방식: **WebView 가 직접 마이크를 잡는다.** `mediaCapturePermissionGrantType` 으로 같은 호스트의
 * `getUserMedia` 요청을 자동 허용하면 iOS(WKWebView)·Android WebView 모두 웹과 똑같은 코드로
 * 16kHz PCM 을 만들어 서버 WebSocket 에 보낼 수 있다. 화면 코드와 오류 처리를 한 벌만 두면 되어
 * 네이티브 녹음기를 따로 만들지 않았다.
 *
 * 다리를 열어 두는 이유: 기기 사정으로 WebView 캡처가 막히면 네이티브 녹음기를 끼워 넣을 수 있게 한다.
 *   웹 → 네이티브: START_SPEECH · STOP_SPEECH
 *   네이티브 → 웹: NATIVE_READY · SPEECH_CAPABLE · PARTIAL_TRANSCRIPT · FINAL_TRANSCRIPT · ERROR · PUSH_TOKEN
 * 네이티브 녹음기가 생기면 `SPEECH_CAPABLE {capable:true}` 를 보내는 것만으로 웹 캡처를 대신한다.
 * 푸시 토큰도 이 다리로 넘긴다(웹은 스스로 얻을 수 없다).
 */
const BRIDGE_SETUP = `
  window.__JJCP_NATIVE__ = { platform: '${Platform.OS}' };
  true;
`;

type BridgeMessage = { type?: string };

export function WebViewScreen({ webUrl }: { webUrl?: string }) {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || failed) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failed]);

  /** 네이티브 → 웹. 웹의 `listenToNative` 가 받는 모양으로 보낸다. */
  const sendToWeb = useCallback((message: Record<string, unknown>) => {
    const payload = JSON.stringify(message).replace(/'/g, "\\'");
    webView.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: '${payload}' })); true;`,
    );
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
      } catch {
        return;
      }
      switch (message.type) {
        case 'START_SPEECH':
        case 'STOP_SPEECH':
          // 아직 네이티브 녹음기가 없다. 웹 캡처를 쓰라고 분명히 알려 준다.
          sendToWeb({
            type: 'ERROR',
            code: 'STREAMING_UNAVAILABLE',
            message: '이 앱에서는 화면 안에서 직접 듣고 있어요.',
          });
          break;
        default:
          break;
      }
    },
    [sendToWeb],
  );

  if (!webUrl || !/^https?:\/\//i.test(webUrl)) {
    return (
      <Screen>
        <Card>
          <Title>웹 주소 설정이 필요합니다</Title>
          <Description>apps/native/.env에 EXPO_PUBLIC_WEB_URL을 설정해 주세요.</Description>
        </Card>
      </Screen>
    );
  }

  if (failed) {
    return (
      <Screen>
        <Card>
          <Title>화면을 불러오지 못했습니다</Title>
          <Description>네트워크 연결을 확인한 뒤 다시 시도해 주세요.</Description>
          <Button
            title="다시 시도"
            onPress={() => {
              setCanGoBack(false);
              setAttempt((value) => value + 1);
              setFailed(false);
            }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <WebView
      key={attempt}
      ref={webView}
      source={{ uri: webUrl }}
      startInLoadingState
      renderLoading={() => (
        <Screen>
          <ActivityIndicator accessibilityLabel="불러오는 중" />
        </Screen>
      )}
      // 마이크: 같은 호스트면 자동 허용, 다른 곳이면 사용자에게 묻는다(iOS 15+/Android).
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      // 마이크 권한 팝업이 떠도 웹 화면이 살아 있어야 한다.
      javaScriptEnabled
      domStorageEnabled
      injectedJavaScriptBeforeContentLoaded={BRIDGE_SETUP}
      onMessage={onMessage}
      onLoadEnd={() => sendToWeb({ type: 'NATIVE_READY', platform: Platform.OS })}
      onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
      onError={() => setFailed(true)}
    />
  );
}
