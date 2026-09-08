import { NativeApp } from '@jjcp/app/native';

export default function App() {
  return <NativeApp webUrl={process.env.EXPO_PUBLIC_WEB_URL} />;
}
