# 우리 아이 생각친구, 티키 · JJCP

npm workspaces 기반의 Vite 웹 + Expo React Native WebView 모노레포입니다.
`legacy/v2/index.html`의 디자인과 기능을 화면별 React 컴포넌트로 구현했습니다.
API 없이 시작 안내부터 학습·책장·성장 리포트·보호자 관리까지 체험할 수 있습니다.

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
    features/village/  # 우리 아이 생각친구, 티키 화면, UI, 목데이터, 학습 상태 로직
    native/            # WebView 셸, 로딩/오류 처리, Android 뒤로 가기
    providers/         # ThemeProvider, QueryClientProvider
    screens/           # 실제 화면
    styles/            # 테마, Emotion 타입, 웹 전역 스타일
    types/             # 공통 타입
legacy/                # Git, 린트, 포맷 대상에서 제외
```

화면과 비즈니스 로직은 `packages/app/src`에 작성합니다. `apps/web/src/router.tsx`는
공통 화면을 가져와 경로만 연결하고 화면 묶음을 지연 로딩합니다. 우리 아이 생각친구, 티키는
시맨틱 HTML 기반 React 컴포넌트와 CSS를 사용합니다. 기존 `react-native-web` 매핑과
`@emotion/native` 공통 컴포넌트는 유지합니다.

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
npm run check          # TypeScript + ESLint + Prettier + 학습 로직 검사
npm test               # Node 테스트 러너로 학습·저장·이동 조건 검사
npm run format         # 포맷 적용
npm run lint:fix       # 자동 수정 가능한 린트 오류 수정
npm run build          # 웹 프로덕션 빌드 → apps/web/dist
npm run preview        # 웹 빌드 미리보기
npm run android        # Expo + Android 실행
npm run ios            # Expo + iOS 실행 (macOS)
```

타입 검사는 TypeScript, 코드 규칙은 ESLint, 형식은 Prettier가 담당합니다.

## 화면과 학습 흐름

| 경로                                | 화면                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `/`                                 | 오늘의 모험, 진행 중 활동 이어하기, 최근 발자국                 |
| `/welcome`                          | 서비스 소개                                                     |
| `/onboarding`                       | 아이 소개 → 관심사·보호자 → 이용 안내 → 아이와의 약속           |
| `/diagnosis`, `/diagnosis/result`   | 첫 질문 3개, 답변에 따른 시작 분량 안내                         |
| `/adventures`, `/adventures/:track` | 3개 영역의 활동 목록·검색·필터                                  |
| `/adventures/:track/:activityId`    | 모험 소개, 전체 진행 단계, 시작하기                             |
| `/session/:track`                   | 영역별 학습, 자동 저장과 이어하기                               |
| `/complete/:id`                     | 완료 결과와 책장 연결                                           |
| `/shelf`, `/shelf/:id`              | 기록 검색·영역·출처·즐겨찾기 필터, 응답·이야기 다시 보기        |
| `/report`                           | 기간·출처별 성장 차트, 표, 영역별 활동, 규칙 기반 요약          |
| `/parent-gate`                      | 보호자 화면 잠금 체험                                           |
| `/profile`                          | 아이 정보, 관심사, 학습 분량, 읽어주기, 대본 미리보기, 보관기간 |
| `/tech`                             | AI 연결·검수 현황, 차단 규칙, 안전 로그                         |
| `/data`                             | 기록 열람·JSON 다운로드·예시 채우기·전체 삭제                   |

- 우리 아이 생각친구, 티키: 이야기 → 첫 문장 → 새 단서와 문장 → 생각 정리 → 돌아보기.
- 실험실: 준비 → 예상 쓰기 → 두 조건 관찰 → 설명 쓰기 → 다시 생각하기 → 돌아보기.
  그림자와 저울은 값을 움직이는 시뮬레이션입니다. 자유 주제는 지원되는 주제에 맞춰
  시뮬레이션을 연결하거나 두 관찰을 직접 기록하는 노트를 제공합니다.
- 마음극장: 보호자 키워드 → 대본과 두 분기 확인 → 장면 재생과 행동 선택 →
  감정과 문장 표현 → 돌아보기. 선택 전에는 다음 장면을 진행할 수 없습니다.

`lib/learning.ts`의 순수 상태 전이 함수가 진행 조건을 검사합니다. 버튼 활성화 여부와
별개로 각 글쓰기의 최소 분량, 실험 관찰, 이야기 선택·감정·대본 확인 조건을 통과해야
진행하고 완료 기록을 만들 수 있습니다. 지난 직접 완료 기록으로 다음 활동의 분량을
조정하며, 진행 중 활동은 시작할 때의 분량을 유지합니다.

## 목데이터와 저장

### 첫 탐구 시연

홈의 **첫 탐구 시작하기** 또는 `/adventures/lab/first-inquiry`에서 시작합니다.
첫 방문에는 보호자와 시작 안내·첫 질문을 마친 뒤 활동으로 돌아옵니다.

1. 처음 생각과 이유를 각각 쓰기
2. 체험용 뜻 확인 질문 읽기, 문장 수정 또는 확인
3. 빛을 낮게 / 높게 선택한 뒤 각 조건의 결과 살펴보기
4. 처음 생각 유지 / 수정 / 더 알아보기 선택, 지금 생각과 이유 쓰기
5. 처음·마지막 생각, 확인한 뜻, 두 관찰 결과 비교 및 책장 저장

`lib/inquiry.ts`의 상태 전이 함수가 각 진행 조건을 확인하고, `InquiryScreen.tsx`가
단계별 화면을 표시합니다. 선택만 하고 결과를 보지 않은 경우 다음 단계로 갈 수
없습니다. 세 가지 판단 모두 완료할 수 있습니다. 최초 문장은 뜻을 수정한 뒤에도
보존되며, 관찰 조건과 결과는 완료 화면·책장에서 다시 볼 수 있습니다.

불러오기 상태는 질문을 준비하는 동안 표시합니다. 연결 오류와 재시도는 보호자
기술·안전 패널의 **첫 탐구 검토용 상태 보기**에서 재현합니다. 직접 주소는
`/adventures/lab/first-inquiry?preview=connection-error`입니다. 새 첫 탐구의 뜻 확인
질문에서 한 번 실패하고 **다시 해 보기**를 누르면 정상 진행합니다. 실패·재시도
모두 로컬 목 응답이며 실제 AI 호출은 없습니다. 작성한 문장과 단계는 유지됩니다.

검토자는 모바일에서도 빈 입력 → 뜻 확인 → 두 관찰 → 판단 → 저장 완료를 설명 없이
진행할 수 있는지 확인합니다. 자동 검사는 세 판단 분기, 진행 조건, 취소·재시도,
저장 복원까지 포함하며 실제 아동 사용성 검토를 대신하지 않습니다.

`features/village/data/catalog.ts`에 활동 10개, `data/mock.ts`에 예시 기록 9개가 있습니다.
예시 기록은 화면에 표시하고 직접 작성한 기록과 별도로 필터링합니다. 예시 기록은
자동 난이도 조정과 직접 완료 횟수에 포함하지 않습니다. 리포트에는 포함 여부가
명시되며 직접 작성한 기록만 볼 수도 있습니다.

`VillageProvider`가 화면에서 공유하는 상태와 저장을 담당합니다. 저장 키는
`jaram_village_react_v1`이며 서비스 이름 변경 뒤에도 기존 기록을 보존하기 위해 유지합니다. 기존 HTML의 저장소와는 분리되어 있습니다. 입력 중인 문장,
학습 단계, 시작 안내, 진단 응답을 복원합니다. 기본 보관기간은 90일이고 다음 로드 시
기간이 지난 기록을 정리합니다. 저장 실패는 화면에 알립니다. 전체 삭제 후 다시
접속해도 예시 기록을 자동으로 되살리지 않습니다. 기록 관리에서 다시 채울 수 있습니다.

실제 AI 호출·서버 저장·계정 인증·결제는 연결하지 않았습니다. 피드백과 이야기 준비는
규칙과 템플릿을 사용하고 사람 검수도 미완료로 표시합니다. 점수는 문장에 대한 체험용
참고값이며 능력·발달 평가가 아닙니다. 보호자 산수 게이트는 화면 잠금 체험이므로 실제
서비스 출시 시 서버 인증과 동의 관리가 필요합니다. 읽어주기는 지원 브라우저의
음성 합성을 사용합니다.

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

우리 아이 생각친구, 티키 화면은 경로별로 지연 로딩합니다.
네이티브 번들 생성 검사는 실제 기기에서의 WebView 실행 검증을 대신하지 않습니다.
