# API v1 기능을 main 구조 위로 옮긴 기록

## 통합 화면 브랜치와의 병합 (2026-09-19)

아래 본문은 main에 이식했을 당시의 기록이다. `feat/hyunsu-frontend`에 main
`daae667`을 병합한 현재 구조는 다음과 같다.

- ReaderScreens·LearningScreens·ActivityScreens·ParentScreens의 통합 화면을 유지한다.
  삭제된 개별 화면과 그 전용 컴포넌트, VillageProvider는 되살리지 않는다.
- `VITE_USE_API=false`는 같은 화면에 목데이터를 제공한다. 새 보호자 화면과
  AuthProvider도 주입된 요청 경로를 공유하여 목 모드에서 네트워크로 우회하지 않는다.
- main의 API v1 엔드포인트·타입·테스트, 보호자 전용 경로, 알림, 음성 모듈과
  네이티브 브리지를 반영한다. 기존 대화 화면의 VoiceInput은 유지한다.
- AuthProvider가 인증 세션과 갱신을 소유하고, BackendProvider는 같은 세션을 이용한다.
  전체 화면의 BackendGate와 프로필 전환 시 재마운트 정책도 유지한다.
- 전역 계정 저장 안내·로그아웃 배너 및 정리된 미사용 스타일은 복원하지 않는다.

---

`origin/main` 의 뼈대·인프라를 그대로 두고 `origin/develop` 의 JJCP API v1 기능 전부를 얹었다.
두 갈래는 `78d0123` 에서 갈라졌다. main 은 한 명이 화면을 통째로 다시 쓴 갈래(`99a5422`),
develop 은 API v1 기능 30 커밋이다.

- 기준 브랜치: `feature/api-v1-on-main-structure` (base `origin/main` = `b084298`)
- 확인: `npm run check`(typecheck·lint·prettier·test 133개) 통과, `npm run build` 통과
- 런타임 확인: 백엔드(`uvicorn`, 8000) + `npm run dev:web` 으로 `/login` → 개발용 로그인 →
  `/first-talk` → `/talk` → `/guardian/links` → `/` → `/shelf` 까지 콘솔 오류 없이 열린다.

## 1. 파일 배치 규칙

develop 의 `features/village/**` 는 main 의 평평한 배치로 옮겼다. 깊이가 4단계에서 2단계로
줄어든 만큼 상대 경로를 다시 썼다(`../../../api/v1/...` → `../api/v1/...`).

| develop (옛 배치)                            | main 배치(이번 결과)                | 개수                      |
| -------------------------------------------- | ----------------------------------- | ------------------------- |
| `features/village/components/*`              | `src/components/*`                  | 23                        |
| `features/village/screens/*.tsx`             | `src/screens/*.tsx`                 | 15                        |
| `features/village/screens/guardian/*`        | `src/screens/guardian/*`            | 7 (신규)                  |
| `features/village/data/*`                    | `src/data/*`                        | 4                         |
| `features/village/lib/*` (useStepFocus 제외) | `src/lib/*`                         | 6                         |
| `features/village/lib/useStepFocus.ts`       | `src/hooks/useStepFocus.ts`         | 1 (내용 동일)             |
| `features/village/state/VillageProvider.tsx` | `src/providers/VillageProvider.tsx` | 1                         |
| `features/village/types.ts`                  | `src/types/village.ts`              | 1 (내용 동일)             |
| `features/village/voice/*`                   | `src/voice/*`                       | 6 (신규)                  |
| `apps/web/public/voice/pcm-worklet.js`       | 같은 자리                           | 1 (신규)                  |
| `providers/AuthProvider.tsx`                 | 같은 자리                           | 1 (신규)                  |
| `api/v1/{endpoints,types}.ts`                | 같은 자리                           | 2 (develop 판이 상위집합) |
| `native/WebViewScreen.tsx`                   | 같은 자리                           | 1 (develop 판이 상위집합) |
| `scripts/{f1,f2,guardian,voice}.test.mjs`    | 같은 자리                           | 4 (신규)                  |

경로 치환 규칙은 다음 네 줄이 전부다.

- `'../../../` → `'../` (guardian 은 `'../../../../` → `'../../`)
- `'../types'` → `'../types/village'`
- `'../state/VillageProvider'` → `'../providers/VillageProvider'`
- `'../lib/useStepFocus'` → `'../hooks/useStepFocus'`

**develop 전용 파일 20개는 전부 들어왔다.** 빠뜨린 파일은 없다
(`ConsentScreen`·`ConsultationScreen`·`InviteAcceptScreen`·`LinksScreen`·`ProgressScreen`·
`SafetyScreen`·`ShareApprovalScreen`·`LibraryParts`·`LibraryBooks`·`LibraryServerStory`·
`WordParts`·`CommunityParts`·`HomeSections`·`ActivityCatalog`·`ActivitySync`·
`ActivitySessionBar`·`TopicCategoryBar`·`NotificationBell`·`ShareStoryPanel`·`GuardianParts`).

## 2. main 에서 그대로 지킨 것

- 서버 계층 전부: `providers/BackendProvider.tsx`, `hooks/useServerApi.ts`,
  `api/serverCache.ts`, `api/serverKeys.ts`, `api/schema.ts`, `api/requestOptions.ts`,
  `components/BackendGate.tsx`, `components/QueryFeedback.tsx`.
- main 전용 컴포넌트·훅: `ManagementPanels`, `ProgressChart`, `ChoiceControl`, `VoiceInput`,
  `contentAppearance`, `dialogs`, `ApiHomeView`, `data/home.ts`, `audio/voiceCapture.ts`,
  `hooks/{useConversation,useThinkingApi}.ts`, `types/{backend,conversation}.ts`,
  `styles/{home.css,server.css}`.
- 묶음 모듈 이름(`ActivityScreens`·`LearningScreens`·`ParentScreens`·`ReaderScreens`)과
  `Server*` export 이름, `packages/app` 의 `exports` 맵(`./screens/*`).
- `api/client.ts`(`resolveApiUrl`·blob 응답 처리가 develop 판보다 많다), `lib/navigation.ts`
  (`safeNext` 에 `/topics/new` 가 더 있다), `apps/web/vite.config.ts`, `apps/web/.env.example`,
  `styles/web.css`(`home.css`·`server.css` import 포함).

## 3. main 에서 바꾼 것과 이유

| 파일                                                                        | 바꾼 내용                                                                                                                                                                         | 이유                                                                                                                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `screens/{ActivityScreens,LearningScreens,ParentScreens,ReaderScreens}.tsx` | 화면 본문(약 2,900줄)을 걷어내고 API v1 판을 다시 내보내는 껍데기로                                                                                                               | 같은 화면을 두 벌 두지 않기 위해서. main 라우터가 쓰던 `Server*` 이름은 그대로 살아 있다                                                                             |
| `providers/AppProviders.tsx`                                                | `AuthProvider` 를 넣고 그 안에 `BackendProvider` 를 둠, `v1BaseUrl` prop 추가                                                                                                     | 세션 주인을 하나로 두기 위해서                                                                                                                                       |
| `providers/BackendProvider.tsx`                                             | 자체 `refresh` 호출을 걷어내고 `auth.client.refresh()`·`getSession()` 을 쓰도록. 개발용 로그인·로그아웃도 `AuthProvider` 에 위임. `me` 질의는 `auth.status !== 'loading'` 일 때만 | 두 프로바이더가 같은 HttpOnly refresh 쿠키로 각자 refresh 하면, 서버가 refresh 토큰을 돌려 발급할 때 서로의 세션을 끊는다. 전송 계층·`Backend` 인터페이스는 그대로다 |
| `components/AppLayout.tsx`                                                  | develop 판(VillageProvider·`useAuth`·NotificationBell)을 바탕으로, main 의 `/data`·`/tech` 바로가기를 `side-utility` 로 되살리고 로그아웃 버튼 추가                               | develop 화면 22곳이 `useVillage` 를 쓰므로 `VillageProvider` 마운트가 필수. 로그아웃은 main 의 `BackendStatus` 에만 있던 기능이라 되살렸다                           |
| `apps/web/src/router.tsx`                                                   | main 경로 전부 + `/guardian/*` 8개 + `/complete/:id` 분리. `/talk`·`/first-talk` 를 `RequireAuth` 로 감쌈                                                                         | 두 라우터의 합집합                                                                                                                                                   |
| `apps/web/src/main.tsx`                                                     | `AppProviders` 에 `v1BaseUrl="/api/v1"` 전달                                                                                                                                      | v1 클라이언트는 같은 출처여야 refresh 쿠키가 붙는다                                                                                                                  |
| `scripts/{path,thinking,village}.test.mjs`                                  | main 판 유지(로더 root 가 이미 `packages/app/src`)                                                                                                                                | 새 배치에 맞다                                                                                                                                                       |
| `scripts/{f1,voice}.test.mjs`                                               | 로더 경로를 `features/village/...` → 새 배치로                                                                                                                                    | 파일이 옮겨졌다                                                                                                                                                      |

### `Server*` ↔ API v1 화면 대응

| main 이름                                                                    | 이번 본문                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `ReaderScreens.ServerHome`                                                   | `HomeScreen`                                                          |
| `ReaderScreens.ServerLibrary` / `ServerRecord` / `ServerComplete`            | `LibraryScreen` / `RecordDetailScreen` / `CompleteScreen`             |
| `ReaderScreens.ServerCommunity` / `ServerCommunityStory`                     | `CommunityScreen` / `ExperienceScreen.CommunityStoryScreen`           |
| `ReaderScreens.ServerWords` / `ServerShare` / `ServerTopics`                 | `WordsScreen` / `ShareStoryScreen` / `CustomTopicScreen`              |
| `LearningScreens.ServerTalk` / `ServerFirstTalk`                             | `ConversationScreen` / `FirstTalkScreen`                              |
| `LearningScreens.ServerAdventures` / `ServerActivity`                        | `AdventureScreen` / `SessionScreen`                                   |
| `ParentScreens.ServerProfile` / `ServerData` / `ServerTech` / `ServerReport` | `ParentScreen.{ProfileScreen,DataScreen,TechScreen}` / `ReportScreen` |
| `ActivityScreens.ActivityCatalog` / `ApiActivity`                            | `AdventureScreen` / `SessionScreen`                                   |

## 4. 레거시 훅(`useServerApi`)이 남은 자리

v1 클라이언트로 옮겨 붙인 화면에는 `useServerApi` 가 한 군데도 남지 않았다.
`useServerApi`·`BackendProvider` 를 쓰는 코드는 아래 **라우팅되지 않는** main 전용 파일뿐이다.
지우지 않고 그대로 뒀다.

`components/{BackendGate,ManagementPanels,VoiceInput,ProgressChart,ChoiceControl,QueryFeedback,contentAppearance,dialogs}.tsx`,
`screens/ApiHomeView.tsx`, `hooks/{useServerApi,useConversation,useThinkingApi}.ts`,
`data/{home,experience}.ts`, `types/conversation.ts`, `audio/voiceCapture.ts`,
`navigation/ServerRoutes.tsx`, `lib/navigation.ts`.

- `audio/voiceCapture.ts` 와 `lib/navigation.ts` 는 화면에서 안 쓰지만
  `scripts/{voice-capture,village}.test.mjs` 가 검사한다.
- `data/experience.ts` 의 `TODAY_TOPICS` 는 develop 이 `GET /home` 추천으로 바꾸며 지웠다.
  남은 `WORDS`·`COMMUNITY_STORIES` 도 지금은 아무도 안 쓴다(단어·친구 이야기 모두 서버 연결).

## 5. 의도적으로 제외

| 대상                                                               | 이유                                                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| develop `packages/app/package.json` 의 `"./village/*"` export      | `features/village` 디렉터리 자체가 사라졌다. main 의 `"./screens/*"` 가 `screens/guardian/*` 까지 덮는다                    |
| develop `apps/web/vite.config.ts` 의 레거시 `/api` → Vercel 프록시 | main 은 `/api`·`/api/v1` 을 같은 로컬 대상으로 보낸다. 로컬 개발에 더 맞다                                                  |
| develop `apps/web/src/main.tsx` 의 프로덕션 하드코딩 백엔드 주소   | main 은 환경변수로만 지정한다                                                                                               |
| develop `.env.example`                                             | main 판이 더 최신(`VITE_DEV_API_TARGET` 설명 포함)                                                                          |
| develop `api/client.ts`                                            | main 판이 상위집합(`resolveApiUrl`, blob 응답)                                                                              |
| develop `lib/navigation.ts`                                        | main 판이 상위집합(`/topics/new` 허용)                                                                                      |
| main 의 `Server*` 화면 본문 약 2,900줄                             | develop 의 API v1 판으로 대체. 같은 화면을 두 벌 둘 수 없다. 되살리려면 `origin/main:packages/app/src/screens/*Screens.tsx` |
| main `AppLayout` 의 서버 설정·프로필 전환 UI                       | 테마는 `VillageProvider`(로컬 저장), 프로필 전환은 `GuardianParts.GuardianProfilePicker` 가 맡는다                          |
| main `AppLayout` 의 전역 `BackendGate` 래핑                        | develop 의 `RequireAuth` 방식(필요한 화면만)으로 바꿨다                                                                     |

## 6. 남은 위험

1. **로그인 요구 범위가 줄었다.** main 은 `BackendGate` 로 모든 화면에 로그인을 요구했고,
   지금은 `/talk`·`/first-talk` 만 막는다. 과제 지시대로지만 제품 판단이 필요하다.
   되돌리려면 `AppLayout` 의 `<Outlet/>` 을 `<BackendGate>` 로 감싸면 된다.
2. **`scopeId` 기반 화면 리마운트가 없어졌다.** main 은 `<div className="api-page" key={backend.scopeId}>`
   로 아이 프로필이 바뀔 때 화면을 통째로 다시 그렸다. 지금은 각 화면이 알아서 처리한다.
3. **CSS 4개 클래스가 비어 있다**: `.notification-bell`, `.ai-message`, `.chat-voice-subtitle`,
   `.save-word`. develop 에도 없던 것이라 이번 이식으로 생긴 문제는 아니다
   (두 갈래의 `village.css`·`inquiry.css` 는 바이트까지 같고 `web.css` 는 import 두 줄만 다르다).
4. **`BackendProvider` 는 지금 어느 화면도 쓰지 않는다.** 마운트만 되어 `me` 를 한 번 읽는다.
   레거시 경로를 되살릴 계획이 없다면 나중에 지울 후보다.
5. **`.env.example` 의 `VITE_DEV_API_TARGET` 이 `http://localhost:8010`** 이다.
   로컬 백엔드를 8000 으로 띄우면 값을 바꿔야 한다.
6. `safeNext`(외부 `next` 파라미터 검증)를 쓰던 main 화면이 사라졌다. v1 판 화면이 같은 검증을
   하는지 따로 확인하지 않았다.
