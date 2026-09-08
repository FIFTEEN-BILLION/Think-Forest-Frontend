# JJCP

npm workspaces 기반의 Vite 웹 + Expo React Native WebView 모노레포입니다.

## 구조

```text
apps/
  web/                 # Vite 설정, React 진입점, react-router-dom 라우터
  native/              # Expo 설정, 환경 변수, 네이티브 진입점
packages/
  app/src/
    api/               # HTTP 클라이언트, TanStack Query 설정
    components/        # @emotion/native 공통 UI
    hooks/             # 공통 훅
    native/            # WebView 셸, 로딩/오류 처리, Android 뒤로 가기
    providers/         # ThemeProvider, QueryClientProvider
    screens/           # 실제 화면
    styles/            # 테마, Emotion 타입, 웹 전역 스타일
    types/             # 공통 타입
legacy/                # Git, 린트, 포맷 대상에서 제외
```

화면과 비즈니스 로직은 `packages/app/src`에 작성합니다. `apps/web/src/router.tsx`는
공통 화면을 가져와 경로만 연결합니다. 웹은 `react-native`를 `react-native-web`으로
매핑해 `@emotion/native` 스타일을 렌더링합니다.

네이티브 앱은 웹 서버의 화면을 WebView로 엽니다. 공통 화면 코드를 네이티브에서
별도로 렌더링하는 구조는 아니며, 웹 배포와 네이티브 앱 배포는 각각 필요합니다.
`@jjcp/app/native` 진입점을 분리해 네이티브 전용 모듈이 웹 빌드에 섞이지 않게 했습니다.

## 실행

Node.js 22.13 이상 및 npm 10 이상을 사용합니다. 의존성 잠금 파일을 포함합니다.

```sh
npm ci
npm run dev
```

웹 개발 서버: <http://localhost:5173>

다른 터미널에서 네이티브 앱을 실행합니다.

1. `apps/native/.env.example`을 같은 폴더의 `.env`로 복사합니다.
2. `EXPO_PUBLIC_WEB_URL`에 기기에서 접속 가능한 웹 주소를 설정합니다.
3. `npm run dev:native`를 실행하고 Expo Go 또는 시뮬레이터로 엽니다.

| 실행 환경              | 개발 웹 주소                  |
| ---------------------- | ----------------------------- |
| Android 에뮬레이터     | `http://10.0.2.2:5173`        |
| iOS 시뮬레이터 (macOS) | `http://localhost:5173`       |
| 실제 기기              | `http://컴퓨터의-LAN-IP:5173` |

실제 기기는 컴퓨터와 같은 네트워크에 연결해야 합니다. 방화벽에서 개발 서버 포트를
허용해야 할 수 있습니다. 환경 변수를 바꾸면 Expo 개발 서버를 다시 시작합니다.
Windows에서는 iOS 시뮬레이터를 실행할 수 없습니다.

배포 시 `EXPO_PUBLIC_WEB_URL`을 배포된 HTTPS 웹 주소로 지정합니다.
`EXPO_PUBLIC_` 환경 변수는 앱에 포함되므로 비밀 키를 저장하지 않습니다.
BrowserRouter를 사용하므로 웹 호스팅에 모든 화면 경로를 `index.html`로 보내는
SPA fallback 설정이 필요합니다.

## 검사 및 빌드

```sh
npm run check          # TypeScript + ESLint + Prettier 검사
npm run format         # 포맷 적용
npm run lint:fix       # 자동 수정 가능한 린트 오류 수정
npm run build          # 웹 프로덕션 빌드 → apps/web/dist
npm run preview        # 웹 빌드 미리보기
npm run android        # Expo + Android 실행
npm run ios            # Expo + iOS 실행 (macOS)
```

타입 검사는 TypeScript, 코드 규칙은 ESLint, 형식은 Prettier가 담당합니다.

## API

`AppProviders`에 TanStack Query가 연결되어 있습니다. API 주소와 명세는 아직
정해지지 않았으므로 실제 요청은 하지 않습니다. `api/`에 도메인별 요청 함수를,
`hooks/`에 `useQuery` 및 `useMutation` 훅을 추가합니다.

```ts
import { createApiClient } from '@jjcp/app/api';
import { useQuery } from '@tanstack/react-query';

const request = createApiClient('https://api.example.com');

type Item = { id: string; name: string };

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: ({ signal }) => request<Item[]>('/items', { signal }),
  });
}
```

요청 함수의 제네릭은 컴파일 시점 타입입니다. 서버 응답의 런타임 검증은 API 명세가
정해졌을 때 추가합니다. JSON 본문을 보낼 때는 `Content-Type: application/json`과
`JSON.stringify`를 지정합니다. 204 응답은 `request<void>`로 사용합니다.

참고: [Vite](https://vite.dev/guide/),
[@emotion/native](https://emotion.sh/docs/%40emotion/native),
[Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/).

## 초기 검증 참고

`npm audit`에서 Expo의 `xcode → uuid` 하위 의존성으로 인한 중간 등급 경고 10건이
보고됩니다. 자동 수정 제안은 Expo 46으로의 다운그레이드를 포함하므로 적용하지
않았습니다. Expo의 호환 가능한 업데이트에서 해결 여부를 확인해야 합니다.

초기 웹 번들은 압축 전 약 597 kB로 Vite의 500 kB 경고 기준을 넘습니다.
화면이 늘어날 때 라우트별 지연 로딩과 번들 분리를 적용할 수 있습니다.
네이티브 번들 생성 검사는 실제 기기에서의 WebView 실행 검증을 대신하지 않습니다.
