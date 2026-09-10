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

자람마을 백엔드(`../backend`, FastAPI)에 연결되어 있습니다.

- 백엔드 주소는 `apps/web/.env` 의 `VITE_API_BASE_URL` 로 주입합니다
  (`apps/web/.env.example` 참고, 기본값 `http://127.0.0.1:8000`). `apps/web/src/main.tsx`
  가 이 값을 읽어 `<AppProviders apiBaseUrl={...}>` 로 넘기고, `ApiClientProvider` 가
  `createApiClient` 로 요청 함수를 만들어 컨텍스트로 제공합니다. 그래서 `@jjcp/app`
  패키지는 Vite 환경변수에 묶이지 않습니다.
- **타입**: `packages/app/src/api/types.ts` 가 백엔드 `app/schemas/*` 계약(camelCase)을
  그대로 옮긴 것입니다. 백엔드 스키마를 바꾸면 이 파일도 함께 고칩니다.
- **도메인 함수**: `packages/app/src/api/endpoints.ts` — `scoreRubric`, `generateScript`,
  `getScriptLibrary`, `createLabActivity`, `summarizeReport`, `assessDiagnostic`,
  `getTechPanel`, `getHealth`. 순수 함수로 `request` 를 인자로 받습니다.
- **훅**: `@jjcp/app/hooks` — 읽기는 `useQuery`(`useHealth`, `useScriptLibrary`,
  `useScriptLibraryItem`, `useTechPanel`), 생성/채점은 `useMutation`
  (`useDiagnosticAssess`, `useRubricScore`, `useScriptGeneration`, `useLabActivity`,
  `useReportSummary`).

```tsx
import { useRubricScore } from '@jjcp/app/hooks';

function RetellGate() {
  const score = useRubricScore();
  // score.mutate({ question, answer, child, consent: { guardian: true } })
  // 응답의 res.ai 로 "실제 AI / 파라메트릭 렌더링" 배지를 바꾼다
}
```

모든 AI 응답에는 `ai: boolean` 과 `error: string | null` 이 들어옵니다. 마음극장 대본은
실패해도 HTTP 200 으로 `{ ai:false, safe:false }` 가 오므로 `onError` 가 아니라 응답 본문을
확인합니다. 서버 응답의 런타임 검증(zod 등)은 계약이 안정되면 추가합니다.

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
