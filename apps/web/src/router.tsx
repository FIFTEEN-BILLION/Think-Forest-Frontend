import { createBrowserRouter } from 'react-router-dom';
import { VillageRoot } from '@jjcp/app/screens';
import { NotFoundScreen } from '@jjcp/app/screens/NotFoundScreen';

// 실제 API와 목데이터는 동일한 화면을 사용한다.
const readers = () => import('@jjcp/app/screens/ReaderScreens');
const learning = () => import('@jjcp/app/screens/LearningScreens');
const parents = () => import('@jjcp/app/screens/ParentScreens');
const login = () => import('@jjcp/app/screens/LoginScreen');
// 보호자 화면(F3). ProtectedParentScreen 안에서만 열리므로 GuardianProvider 를 함께 쓴다.
const guardianConsent = () => import('@jjcp/app/screens/guardian/ConsentScreen');
const guardianLinks = () => import('@jjcp/app/screens/guardian/LinksScreen');
const guardianInvite = () => import('@jjcp/app/screens/guardian/InviteAcceptScreen');
const guardianShare = () => import('@jjcp/app/screens/guardian/ShareApprovalScreen');
const guardianProgress = () => import('@jjcp/app/screens/guardian/ProgressScreen');
const guardianSafety = () => import('@jjcp/app/screens/guardian/SafetyScreen');
const guardianConsultation = () => import('@jjcp/app/screens/guardian/ConsultationScreen');

export const router = createBrowserRouter([
  {
    path: '/',
    Component: VillageRoot,
    ErrorBoundary: NotFoundScreen,
    hydrateFallbackElement: <p role="status">티키를 열고 있어요…</p>,
    children: [
      { index: true, lazy: async () => ({ Component: (await readers()).ServerHome }) },
      { path: 'login', lazy: async () => ({ Component: (await login()).LoginScreen }) },
      { path: 'talk', lazy: async () => ({ Component: (await learning()).ServerTalk }) },
      { path: 'first-talk', lazy: async () => ({ Component: (await learning()).ServerFirstTalk }) },
      ...['adventures', 'adventures/:track', 'adventures/:track/:activityId'].map((path) => ({
        path,
        lazy: async () => ({ Component: (await learning()).ServerAdventures }),
      })),
      {
        path: 'session/:track',
        lazy: async () => ({ Component: (await learning()).ServerActivity }),
      },
      { path: 'shelf', lazy: async () => ({ Component: (await readers()).ServerLibrary }) },
      { path: 'shelf/:id', lazy: async () => ({ Component: (await readers()).ServerRecord }) },
      { path: 'complete/:id', lazy: async () => ({ Component: (await readers()).ServerRecord }) },
      { path: 'words', lazy: async () => ({ Component: (await readers()).ServerWords }) },
      { path: 'community', lazy: async () => ({ Component: (await readers()).ServerCommunity }) },
      {
        path: 'community/:id',
        lazy: async () => ({ Component: (await readers()).ServerCommunity }),
      },
      { path: 'story-share', lazy: async () => ({ Component: (await readers()).ServerShare }) },
      { path: 'topics/new', lazy: async () => ({ Component: (await readers()).ServerTopics }) },
      { path: 'report', lazy: async () => ({ Component: (await parents()).ServerReport }) },
      {
        lazy: async () => ({ Component: (await parents()).ProtectedParentScreen }),
        children: [
          { path: 'profile', lazy: async () => ({ Component: (await parents()).ServerProfile }) },
          { path: 'data', lazy: async () => ({ Component: (await parents()).ServerData }) },
          { path: 'tech', lazy: async () => ({ Component: (await parents()).ServerTech }) },
          {
            path: 'guardian/consent',
            lazy: async () => ({
              Component: (await guardianConsent()).GuardianConsentScreen,
            }),
          },
          {
            path: 'guardian/links',
            lazy: async () => ({ Component: (await guardianLinks()).GuardianLinksScreen }),
          },
          ...['guardian/invite', 'guardian/invite/:token'].map((path) => ({
            path,
            lazy: async () => ({
              Component: (await guardianInvite()).GuardianInviteAcceptScreen,
            }),
          })),
          {
            path: 'guardian/share',
            lazy: async () => ({
              Component: (await guardianShare()).GuardianShareScreen,
            }),
          },
          {
            path: 'guardian/report',
            lazy: async () => ({ Component: (await guardianProgress()).GuardianProgressScreen }),
          },
          {
            path: 'guardian/safety',
            lazy: async () => ({ Component: (await guardianSafety()).GuardianSafetyScreen }),
          },
          {
            path: 'guardian/consultation',
            lazy: async () => ({
              Component: (await guardianConsultation()).GuardianConsultationScreen,
            }),
          },
        ],
      },
      { path: '*', Component: NotFoundScreen },
    ],
  },
]);
