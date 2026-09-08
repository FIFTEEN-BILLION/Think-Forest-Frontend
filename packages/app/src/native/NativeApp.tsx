import { ThemeProvider } from '@emotion/react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { WebViewScreen } from './WebViewScreen';
import { theme } from '../styles/theme';

export function NativeApp({ webUrl }: { webUrl?: string }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <SafeAreaView style={styles.container}>
          <WebViewScreen webUrl={webUrl} />
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
