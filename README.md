> 구조 정리: 화면은 `packages/app/src/screens`, 공통 UI는 `components`, 요청 상태는 `hooks`와 TanStack Query에서 관리합니다. `features` 폴더는 제거했습니다. [현재 구조·캐시 정책](../docs/ARCHITECTURE.md)을 참고하세요.

# 우리 아이 생각친구, 티키 · JJCP

npm workspaces 기반의 Vite 웹 + Expo React Native WebView 모노레포입니다.
기본 화면은 로컬 백엔드의 `/api/v1`을 사용해 로그인·대화·활동·책장·단어·공유·보호자 관리를 연결합니다.
화면별 실제 호출 목록과 외부 서비스가 필요한 항목은 [화면별 API 연결 현황](../docs/SCREEN_API_REVIEW.md)을 확인합니다.

## 현재 연결 상태 (2026-09-18)

- 기본 데이터는 서버 DB에 저장합니다. 목데이터는 로그인 화면의 예시 둘러보기로 구분합니다.
- 인증 쿠키 복원, 접근 토큰 갱신, 계정별 조회 캐시, 수정 버전 충돌·오류·재시도를 처리합니다.
- 음성 파일 인식·소켓 자막·메시지 읽기는 API에 연결했으며 실제 사용에는 서버의 공급자 키와 권한이 필요합니다.
- 로컬 보호자 테스트 확인은 `/profile`, 공유 승인·권한·알림 설정도 같은 화면에서 이용합니다.
- 책 편집·단어 퀴즈·주제 분류·상담 기록·내려받기·삭제 예약은 서버와 연결되어 있습니다.
- 운영 DB·배포에는 반영하지 않았습니다. 아래 9월 17일 진행표와 첫 탐구 v2 설명은 기존 체험 구현의 이력입니다. 현재 기본 화면은 서버 카탈로그의 활동 단계를 사용합니다.

- 🌐 **웹 배포 (Netlify)**: <https://think-kids.netlify.app>
- 🔗 **백엔드 API (Vercel)**: <https://think-forest-backend.vercel.app> (Swagger: `/docs`)

## 지금까지 진행한 내용 (2026-09-17 기준)

| 영역                  | 내용                                                                                                                                     | 상태                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 디자인 & 반응형       | 모바일·태블릿 최적화 레이아웃 전면 개편, Pretendard 가변 폰트 적용, 온보딩과 첫 만남 대화 통합                                           | ✅ 배포 완료                |
| 첫 탐구 v2 (실제 AI)  | **헷갈리는 생각 친구 가르치기** — 예측·확신도 → 친구 생각 → 공정한 실험 설계 → 증거로 설득 → 새 예측 검사 → 사고 기술 (실제 OpenAI 연동) | ✅ 실시간 AI 연동·배포 완료 |
| 배포 & SPA 라우팅     | Netlify 배포 및 새로고침 404 방지 `_redirects` 설정, 프로덕션 기본 API 주소를 Vercel 백엔드로 자동 연결                                  | ✅ 배포 완료                |
| API 연결층            | API 클라이언트 주입 구조, 타입, 도메인 요청 함수, TanStack Query 훅                                                                      | ✅                          |
| 기록                  | v2 탐구는 점수 없이 사고 기술로 저장, 리포트 점수 집계에서 제외, v1 기록·초안 호환                                                       | ✅                          |
| 대화형 체험 화면      | 생각 친구 대화(`/talk`), 첫 만남 대화(`/first-talk`), 단어 보관함(`/words`), 친구 이야기(`/community`) 목업 화면, 난이도 표시 제거       | ✅ 화면 · ⬜ 백엔드 미연결  |
| 음성 입력             | 대화 화면은 브라우저 음성 인식(목업), 첫 탐구는 버튼 자리만 있음. 백엔드 음성 API 준비됨                                                 | ⬜ 백엔드 연결 필요         |
| 백엔드 대화 엔진 연결 | `/talks`·`/onboarding`·단어·공유 API 는 준비됨, 위 화면과 아직 연결 안 함                                                                | ⬜                          |

**알려진 과제** — 대화형 목업 화면을 백엔드 API(`/talks`, `/onboarding`, 단어·공유·음성)로 연결, 온보딩의 "실제 AI 연결 없음" 안내 문구 갱신, 실험 그림 크기(태블릿), 실제 OpenAI 호출·실기기 검증.
화면 표시는 난이도를 없앴지만 생각숲·실험실·마음극장의 진행 조건(`lib/learning.ts`)에는 글쓰기 분량 확인이 아직 남아 있습니다.

## 구조

```text
apps/
  web/                 # Vite 설정, React 진입점, react-router-dom 라우터
  native/              # Expo 설정, 환경 변수, 네이티브 진입점
packages/
  app/src/
    api/               # HTTP 클라이언트, 백엔드 계약 타입·요청 함수(inquiry.ts 포함)
    components/        # @emotion/native 공통 UI
    hooks/             # TanStack Query 훅(useShadowMission 등)
    screens/           # 화면
    components/        # 공통 UI와 화면 구성 요소
    data/              # 체험 데이터
    lib/               # 학습 규칙과 로컬 저장
    types/             # 도메인 타입
    navigation/        # API 화면 라우팅
    native/            # WebView 셸, 로딩/오류 처리, Android 뒤로 가기
    providers/         # ThemeProvider, QueryClientProvider, ApiClientProvider
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

### 1. 웹 실행 (로컬 백엔드 연결)

백엔드를 8000 포트에서 실행합니다. `apps/web/.env`의 `VITE_API_BASE_URL`을 비워 두면 Vite가 `/api/v1` 요청을 `127.0.0.1:8000`으로 전달합니다. 개발·빌드 모두 운영 서버에 자동 연결하지 않습니다.

```sh
npm install
npm run dev
```

웹 개발 서버: <http://127.0.0.1:5173>

- 다른 백엔드를 쓸 경우에만 `VITE_API_BASE_URL`을 명시합니다. 별도 출처에서는 인증 쿠키·CORS 설정도 맞아야 합니다.
- 5173 포트를 다른 프로젝트가 사용하면 `npm run dev --workspace @jjcp/web -- --port 5175`처럼 별도 포트를 지정합니다.

### 2. 로컬 백엔드 실행

기본 화면의 저장·조회에 필요합니다. DB·환경변수 준비는 [로컬 SQLite 안내](../docs/LOCAL_SQLITE.md)를 확인합니다.

```sh
# backend 폴더에서 (Windows는 .venv\Scripts\Activate.ps1)
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --no-access-log
```

### 3. 첫 탐구 해 보기

1. <http://127.0.0.1:5173/adventures/lab/first-inquiry> → **시작 준비하고 모험 떠나기**
2. 처음이면 시작 안내 4단계와 첫 질문 3개를 마치고 돌아옵니다.
3. 아래 [첫 탐구 v2](#첫-탐구-v2--헷갈리는-생각-친구-가르치기) 흐름대로 진행합니다.

### 같은 와이파이의 다른 기기에서 보기

```sh
ipconfig getifaddr en0                                     # 예: 172.30.1.66
# 백엔드: CORS_ORIGINS="http://172.30.1.66:5173" uvicorn app.main:app --host 0.0.0.0 --port 8010
VITE_API_BASE_URL=http://172.30.1.66:8010 npm run dev      # 웹은 이미 0.0.0.0 으로 열립니다
```

다른 기기에서 `http://172.30.1.66:5173`으로 접속합니다. `127.0.0.1`은 다른 기기에서
그 기기 자신을 가리키므로 API 주소에는 반드시 와이파이 IP를 씁니다. 공용 와이파이에서는 켜 두지 마세요.

### 네이티브 앱

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
PR 전에 `npm run check`를 통과시킵니다.

## 브랜치 전략 (Git Flow)

| 브랜치                                             | 용도                           | 만드는 곳 → 합치는 곳          |
| -------------------------------------------------- | ------------------------------ | ------------------------------ |
| `main`                                             | 배포·제출 기준                 | —                              |
| `develop`                                          | 다음 배포를 모으는 통합 브랜치 | —                              |
| `feature/<기능>`                                   | 새 기능                        | `develop` → `develop`          |
| `fix/<내용>`                                       | 버그 수정                      | `develop` → `develop`          |
| `docs/<내용>` · `chore/<내용>` · `refactor/<내용>` | 문서 · 설정 · 구조 개선        | `develop` → `develop`          |
| `release/<버전>`                                   | 배포 준비                      | `develop` → `main` + `develop` |
| `hotfix/<내용>`                                    | 배포 후 긴급 수정              | `main` → `main` + `develop`    |

- `main`·`develop`에 직접 커밋하지 않고 PR로 합칩니다.
- 브랜치 이름은 영어 소문자와 `-`를 씁니다. 예: `feature/talk-screen`, `fix/report-empty-chart`
- 앞 기능에 기대는 기능은 앞 브랜치를 base로 **이어 쌓은 PR**로 올리고 차례로 합칩니다.

**첫 탐구 v2 PR 병합 순서**

1. `chore/api-layer-integration` — `feat/backend-api-layer`(API 클라이언트·훅)를 develop 기준으로 통합
2. `feature/shadow-inquiry-state` — v2 상태 모델·그림자 계산·API 요청 함수·테스트
3. `feature/shadow-inquiry-ui` — 탐구 화면·사고 기술 카드·책장/리포트 연결
4. `docs/readme-guide` — 이 README

## 커밋 규칙

`<gitmoji> <type>: <한국어 요약>` — 예: `✨ feat: 친구 설득 화면 추가`

| gitmoji | type       | 쓰는 때     |
| ------- | ---------- | ----------- |
| ✨      | `feat`     | 새 기능     |
| 🐛      | `fix`      | 버그 수정   |
| 💄      | `style`    | UI·스타일   |
| ♻️      | `refactor` | 구조 개선   |
| ✅      | `test`     | 테스트      |
| 📝      | `docs`     | 문서        |
| 🔧      | `chore`    | 설정·의존성 |
| 🔀      | `merge`    | 브랜치 병합 |

## 화면과 학습 흐름

| 경로                                | 화면                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `/`                                 | 오늘의 모험, 진행 중 활동 이어하기, 최근 발자국                 |
| `/welcome`                          | 서비스 소개                                                     |
| `/onboarding`                       | 아이 소개 → 관심사·보호자 → 이용 안내 → 아이와의 약속           |
| `/diagnosis`, `/diagnosis/result`   | 첫 질문 3개, 답변에 따른 시작 분량 안내                         |
| `/adventures`, `/adventures/:track` | 3개 영역의 활동 목록·검색·필터                                  |
| `/adventures/:track/:activityId`    | 모험 소개, 전체 진행 단계, 시작하기                             |
| `/talk`                             | 생각 친구 대화(주제 질문 → 선택·이유 → 문장으로 정리), 목업     |
| `/first-talk`                       | 첫 만남 대화(별명·소속과 학년·좋아하는 것·키우고 싶은 힘), 목업 |
| `/words`                            | 단어 보관함과 단어 퀴즈, 목업                                   |
| `/community`                        | 친구들의 이야기와 공유 범위 안내, 목업                          |
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

`lib/learning.ts`의 순수 상태 전이 함수가 진행 조건을 검사합니다. 생각숲·실험실·마음극장은
글쓰기 최소 분량, 실험 관찰, 이야기 선택·감정·대본 확인 조건을 통과해야 진행합니다.

## 첫 탐구 v2 — 헷갈리는 생각 친구 가르치기

홈의 **첫 탐구 시작하기** 또는 `/adventures/lab/first-inquiry`에서 시작합니다.
AI는 답을 주지 않고, 아이가 생각해야 풀리는 상황을 만듭니다. 그림자 길이 계산과
설득 판정은 백엔드 규칙이 하고, 프론트는 백엔드 계산표(`/missions/shadow`)로만 그림을 그립니다.

| 단계            | 아이가 하는 일                                                                | 연결 API                                         |
| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 1 처음 생각     | 예측(길어져/짧아져/그대로/모르겠어), 이유(글·예시), 확신도. 최소 글자 수 없음 | —                                                |
| 2 친구 생각     | 친구가 이해한 내 생각 확인, 친구의 다른 생각 듣기                             | `POST /inquiry/interpret`                        |
| 3 공정한 실험   | 바꿀 것을 직접 골라 A·B 비교. 여러 개를 같이 바꾸면 질문 → 힌트 → 설명        | `GET /missions/shadow`                           |
| 4 친구 가르치기 | 실험 카드로 설득, 지금 내 생각·확신도, 친구의 새 예측 검사                    | `POST /inquiry/teach`, `POST /inquiry/challenge` |
| 5 처음과 지금   | 처음·지금 생각, 실험 카드, 사고 기술 5종(점수 없음), 확인된 사실              | —                                                |

- 상태 로직: `lib/thinking.ts`(이벤트·진행 조건·사고 기술), `lib/shadow.ts`(변인·비교 도우미)
- 화면: `screens/ThinkingInquiryScreen.tsx`, `components/ThinkingParts.tsx`, `components/ThinkingComparison.tsx`
- 사고 기술은 기록된 행동으로만 정합니다: 예측과 이유 · 공정한 비교 · 증거로 설득 · 증거에 맞춘 생각 · 새 상황 적용
  (`혼자 해냈어요` / `질문을 듣고` / `설명을 듣고` / `이번에는 보이지 않았어요`)
- AI 대사면 `생각 친구 · AI`, 규칙 대사면 `생각 친구 · 준비된 대사`로 표시합니다.
- 진행 중이던 v1 초안은 기존 `InquiryScreen.tsx`로 이어서 진행하고, v1 기록도 책장에서 그대로 보입니다.

## 목데이터와 저장

`data/catalog.ts`에 활동 10개, `data/mock.ts`에 예시 기록 9개가 있습니다.
예시 기록은 화면에 표시하고 직접 작성한 기록과 별도로 필터링합니다. 예시 기록은
자동 난이도 조정과 직접 완료 횟수에 포함하지 않습니다.

`VillageProvider`가 화면에서 공유하는 상태와 저장을 담당합니다. 저장 키는
`jaram_village_react_v1`이며 서비스 이름 변경 뒤에도 기존 기록을 보존하기 위해 유지합니다. 기존 HTML의 저장소와는 분리되어 있습니다. 입력 중인 문장,
학습 단계, 시작 안내, 진단 응답을 복원합니다. 기본 보관기간은 90일이고 다음 로드 시
기간이 지난 기록을 정리합니다. 첫 탐구 v2 기록(`thinking`)은 점수(`rubric`) 없이 저장하고
리포트의 점수 그래프·표에서 제외합니다.

첫 탐구 외 활동은 아직 규칙과 템플릿을 사용하고 사람 검수도 미완료로 표시합니다. 점수는 문장에 대한
체험용 참고값이며 능력·발달 평가가 아닙니다. 보호자 산수 게이트는 화면 잠금 체험이므로 실제
서비스 출시 시 서버 인증과 동의 관리가 필요합니다.

## API

자람마을 백엔드(`Think-Forest-Backend`, FastAPI)에 연결되어 있습니다.

- 백엔드 주소는 `VITE_API_BASE_URL`로 주입합니다(`apps/web/.env.example`). `apps/web/src/main.tsx`가
  이 값을 읽어 `<AppProviders apiBaseUrl={...}>`로 넘기고, `ApiClientProvider`가 요청 함수를 컨텍스트로 제공합니다.
- **타입**: `api/types.ts`(초기 기능), `api/inquiry.ts`(첫 탐구). 백엔드 `app/schemas/*`를 바꾸면 함께 고칩니다.
- **요청 함수**: `api/endpoints.ts` — `scoreRubric`, `generateScript`, `createLabActivity` 등,
  `api/inquiry.ts` — `getShadowMission`, `interpretThought`, `teachFriend`, `requestChallenge`
- **훅**: `@jjcp/app/hooks` — `useShadowMission`, `useRubricScore`, `useScriptGeneration` 등

```tsx
import { useShadowMission } from '@jjcp/app/hooks';

function Mission() {
  const mission = useShadowMission();
  // mission.data?.table → 24개 조합 그림자 길이표
}
```

모든 AI 응답에는 `ai: boolean`과 `error: string | null`이 들어옵니다. 첫 탐구 응답에는
`source: 'ai' | 'fallback'`도 들어오며 화면 표시를 여기에 맞춥니다.
생각 친구 대화 엔진(`/talks`, 첫 만남 대화, 단어·공유·음성)의 API는 백엔드 `/docs`에서 볼 수 있습니다.

참고: [Vite](https://vite.dev/guide/),
[@emotion/native](https://emotion.sh/docs/%40emotion/native),
[Expo WebView](https://docs.expo.dev/versions/latest/sdk/webview/).

## 초기 검증 참고

`npm audit`에서 Expo의 `xcode → uuid` 하위 의존성으로 인한 중간 등급 경고 10건이
보고됩니다. 자동 수정 제안은 Expo 46으로의 다운그레이드를 포함하므로 적용하지
않았습니다. Expo의 호환 가능한 업데이트에서 해결 여부를 확인해야 합니다.

우리 아이 생각친구, 티키 화면은 경로별로 지연 로딩합니다.
네이티브 번들 생성 검사는 실제 기기에서의 WebView 실행 검증을 대신하지 않습니다.
