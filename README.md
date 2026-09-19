# 우리 아이 생각친구, 티키 · JJCP

npm workspaces 기반 Vite 웹 + Expo React Native WebView 프로젝트입니다.
화면은 하나만 유지하고 환경변수로 실제 API와 목데이터를 전환합니다.

## 실행과 데이터 모드

Node.js 22.13 이상, npm 10 이상을 사용합니다.

```sh
npm install
npm run dev
```

웹 주소는 <http://localhost:5173>입니다. `apps/web/.env.example`을
같은 폴더의 `.env`로 복사하고 원하는 모드를 설정하세요.

| 설정                          | 동작                                             |
| ----------------------------- | ------------------------------------------------ |
| `VITE_USE_API=true` 또는 생략 | 실제 백엔드 API와 계정 사용                      |
| `VITE_USE_API=false`          | 같은 화면에 예시 데이터를 공급하며 API 호출 없음 |

환경변수 변경 후 개발 서버를 다시 시작해야 합니다. 배포 빌드에 적용하려면 다시 빌드하세요.
API 모드에서 연결 오류가 나더라도 목데이터로 자동 전환하지 않습니다.

### 실제 API

- 기본 API 주소는 `/api`입니다. `/api/v1` 요청은 개발 프록시를 통해 백엔드로 전달합니다.
- `VITE_DEV_API_TARGET`은 개발 프록시 대상입니다. 생략하면 `http://127.0.0.1:8000`이고 예시 설정은 `http://localhost:8010`입니다.
- 별도 출처의 백엔드는 `VITE_API_BASE_URL`로 설정합니다. 인증 쿠키와 CORS도 함께 설정해야 합니다.
- 로컬 테스트 로그인은 `VITE_DEV_LOGIN=true` 및 백엔드 `AUTH_DEV_LOGIN=true`가 필요합니다.
- 음성·AI·카카오 인증은 백엔드의 해당 공급자 설정이 필요합니다.
- 배포 경로와 엔드포인트 목록은 [화면별 API 연결 현황](../docs/SCREEN_API_REVIEW.md)을 참고하세요.

### 목데이터

`packages/app/src/api/mock`이 API와 같은 요청·응답 구조를 제공합니다.
별도의 예시 화면이나 예시 라우트는 없습니다.

- 가상 프로필, 추천 주제, 이야기 3편, 단어 4개, 이야기책, 커뮤니티와 활동 목록을 채웁니다.
- 검색·필터·즐겨찾기·이야기 편집·책 만들기·단어 수정과 퀴즈를 체험할 수 있습니다.
- 대화는 준비된 문장으로 응답하며 완성한 이야기와 활동은 같은 책장에 저장됩니다.
- 프로필과 테마 변경, 활동 요약을 체험할 수 있습니다.
- 변경 내용은 `sessionStorage`의 `jjcp-api-demo-v1`에 보관합니다. 같은 탭에서 새로고침하면 복원되고 탭을 닫으면 초기화됩니다.
- 실제 음성·AI 호출, 보호자 전달, 서버 내보내기와 삭제 예약은 수행하지 않습니다. 오프라인에서 지원하지 않는 작업은 안내를 표시하며 실제 서버에 요청하지 않습니다.
- 예시 계정의 ID와 저장 키는 실제 계정과 분리되어 있습니다. 이전 체험 화면의 `jaram_village_react_v1` 데이터는 삭제하거나 자동 이관하지 않습니다.

## 구조

```text
apps/
  web/src/
    main.tsx             # env 확인과 실제/목 요청 함수 선택
    router.tsx           # 단일 화면 경로
  native/                # Expo 설정과 WebView 진입점
packages/app/src/
  api/
    client.ts            # 실제 HTTP 요청
    mock/                # 같은 계약의 목 요청·예시 데이터
    schema.ts            # 백엔드 OpenAPI 계약 타입
  screens/
    ReaderScreens.tsx    # 홈·책장·단어·커뮤니티·주제
    ApiHomeView.tsx      # 공통 홈 표현
    LearningScreens.tsx  # 대화·첫인사
    ActivityScreens.tsx  # 활동 목록·상세·진행
    ParentScreens.tsx    # 프로필·리포트·데이터·안내
    LoginScreen.tsx
    NotFoundScreen.tsx
  components/            # 공통 UI
  hooks/                 # TanStack Query 조회·변경·캐시
  providers/             # 인증 및 요청 함수 공급
  styles/                # 공통 테마와 화면 스타일
  lib/                   # 학습·시뮬레이션 규칙
  data/                  # 활동 카탈로그와 규칙 데이터
  native/                # WebView 셸
```

새 기능은 기존 화면에 추가하고, 실제 API와 목 응답을 함께 관리합니다.
화면에서 데이터 모드별로 별도 화면 컴포넌트를 만들지 않습니다.
이전의 중복 화면과 `VillageProvider`는 제거했습니다.
학습 규칙·저장 형식의 기존 테스트용 모듈은 유지합니다.

## 화면 경로

| 경로                                                                  | 화면                                        |
| --------------------------------------------------------------------- | ------------------------------------------- |
| `/`                                                                   | 추천 질문·최근 이야기·단어·친구 이야기      |
| `/login`                                                              | 계정 로그인, 목 모드에서는 예시 체험 재시작 |
| `/talk`, `/first-talk`                                                | 대화와 첫인사                               |
| `/adventures`, `/adventures/:track`, `/adventures/:track/:activityId` | 활동 목록·소개                              |
| `/session/:track`                                                     | 활동 진행                                   |
| `/shelf`, `/shelf/:id`, `/complete/:id`                               | 책장·기록 상세                              |
| `/words`                                                              | 단어 보관함·퀴즈                            |
| `/community`, `/community/:id`                                        | 친구 이야기                                 |
| `/story-share`, `/topics/new`                                         | 공유 요청·주제 만들기                       |
| `/profile`                                                            | 아이 프로필·설정·보호자 관리                |
| `/report`                                                             | 활동 발자국·요약                            |
| `/data`, `/tech`                                                      | 기록 관리·서비스 안내                       |

## 네이티브 앱

네이티브 앱은 동일한 웹 화면을 WebView로 엽니다. 데이터 모드도 웹 서버 설정을 따릅니다.
`apps/native/.env.example`을 `.env`로 복사하고 `EXPO_PUBLIC_WEB_URL`에
기기에서 접속 가능한 웹 주소를 넣은 뒤 `npm run dev:native`를 실행하세요.

| 실행 환경          | 개발 웹 주소                  |
| ------------------ | ----------------------------- |
| Android 에뮬레이터 | `http://10.0.2.2:5173`        |
| iOS 시뮬레이터     | `http://localhost:5173`       |
| 실제 기기          | `http://컴퓨터의-LAN-IP:5173` |

실제 기기는 컴퓨터와 같은 네트워크에 연결해야 합니다. Windows에서는 iOS 시뮬레이터를 실행할 수 없습니다.
배포 시 HTTPS 웹 주소를 사용하며, 웹 호스팅에 SPA fallback 설정이 필요합니다.

## 검사 및 빌드

```sh
npm run check      # 타입·린트·형식·테스트
npm run build      # 웹 프로덕션 빌드
npm run preview    # 빌드 미리보기
npm run android
npm run ios
```

`scripts/mock-api.test.mjs`는 서버 호출 차단, 목데이터 변경·복원,
대화와 활동의 책장 저장 및 실제 API 오류 유지 등을 검증합니다.
`node scripts/prune-unused-styles.mjs`는 참조되지 않는 스타일 후보를 보고합니다.
`--write`를 사용한 정리 후에는 모바일·데스크톱·테마별 디자인을 확인해야 합니다.
동적 클래스와 선택자 함수는 보수적으로 보존합니다.

## 협업 규칙

`main`·`develop`에 직접 커밋하지 않고 기능 브랜치와 PR을 사용합니다.
기능은 `feature/<기능>`, 수정은 `fix/<내용>`, 문서·정리는 `docs/<내용>`·`chore/<내용>`으로 구분합니다.
커밋은 `<gitmoji> <type>: <한국어 요약>` 형식을 따릅니다.
