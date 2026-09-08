import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import { Card, Description, Screen, Title } from '../components';

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
      onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
      onError={() => setFailed(true)}
    />
  );
}
