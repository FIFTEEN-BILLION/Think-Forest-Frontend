import { createBrowserRouter } from 'react-router-dom';
import { HomeScreen, NotFoundScreen, VillageRoot } from '@jjcp/app/screens';

const parent = () => import('@jjcp/app/village/ParentScreen');
const library = () => import('@jjcp/app/village/LibraryScreen');
const experience = () => import('@jjcp/app/village/ExperienceScreen');
const login = () => import('@jjcp/app/village/LoginScreen');
// 보호자 화면(F3). ProtectedParentScreen 안에서만 열리므로 GuardianProvider 를 함께 쓴다.
const guardianConsent = () => import('@jjcp/app/village/guardian/ConsentScreen');
const guardianLinks = () => import('@jjcp/app/village/guardian/LinksScreen');
const guardianInvite = () => import('@jjcp/app/village/guardian/InviteAcceptScreen');
const guardianShare = () => import('@jjcp/app/village/guardian/ShareApprovalScreen');
const guardianProgress = () => import('@jjcp/app/village/guardian/ProgressScreen');
const guardianSafety = () => import('@jjcp/app/village/guardian/SafetyScreen');
const guardianConsultation = () => import('@jjcp/app/village/guardian/ConsultationScreen');
const adventures = async () => ({
  Component: (await import('@jjcp/app/village/AdventureScreen')).AdventureScreen,
});

export const router = createBrowserRouter([
  {
    path: '/',
    Component: VillageRoot,
    hydrateFallbackElement: (
      <div className="route-loading" role="status">
        우리 아이 생각친구, 티키를 열고 있어요…
      </div>
    ),
    ErrorBoundary: NotFoundScreen,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'adventures', lazy: adventures },
      { path: 'adventures/:track', lazy: adventures },
      { path: 'adventures/:track/:activityId', lazy: adventures },
      { path: 'login', lazy: async () => ({ Component: (await login()).LoginScreen }) },
      {
        // 서버 대화(티키와 첫인사·티키와 이야기)만 로그인이 필요하다.
        lazy: async () => ({ Component: (await login()).RequireAuth }),
        children: [
          {
            path: 'talk',
            lazy: async () => ({
              Component: (await import('@jjcp/app/village/ConversationScreen')).ConversationScreen,
            }),
          },
          {
            path: 'first-talk',
            lazy: async () => ({
              Component: (await import('@jjcp/app/village/FirstTalkScreen')).FirstTalkScreen,
            }),
          },
        ],
      },
      {
        path: 'words',
        lazy: async () => ({
          Component: (await import('@jjcp/app/village/WordsScreen')).WordsScreen,
        }),
      },
      {
        path: 'community',
        lazy: async () => ({
          Component: (await import('@jjcp/app/village/CommunityScreen')).CommunityScreen,
        }),
      },
      {
        path: 'community/:id',
        lazy: async () => ({ Component: (await experience()).CommunityStoryScreen }),
      },
      {
        path: 'story-share',
        lazy: async () => ({ Component: (await experience()).ShareStoryScreen }),
      },
      {
        path: 'topics/new',
        lazy: async () => ({ Component: (await experience()).CustomTopicScreen }),
      },
      {
        path: 'session/:track',
        lazy: async () => ({
          Component: (await import('@jjcp/app/village/SessionScreen')).SessionScreen,
        }),
      },
      { path: 'complete/:id', lazy: async () => ({ Component: (await library()).CompleteScreen }) },
      { path: 'shelf', lazy: async () => ({ Component: (await library()).LibraryScreen }) },
      {
        path: 'shelf/:id',
        lazy: async () => ({ Component: (await library()).RecordDetailScreen }),
      },
      {
        path: 'report',
        lazy: async () => ({
          Component: (await import('@jjcp/app/village/ReportScreen')).ReportScreen,
        }),
      },
      {
        lazy: async () => ({ Component: (await parent()).ProtectedParentScreen }),
        children: [
          { path: 'profile', lazy: async () => ({ Component: (await parent()).ProfileScreen }) },
          { path: 'tech', lazy: async () => ({ Component: (await parent()).TechScreen }) },
          { path: 'data', lazy: async () => ({ Component: (await parent()).DataScreen }) },
          {
            path: 'guardian/consent',
            lazy: async () => ({ Component: (await guardianConsent()).GuardianConsentScreen }),
          },
          {
            path: 'guardian/links',
            lazy: async () => ({ Component: (await guardianLinks()).GuardianLinksScreen }),
          },
          {
            path: 'guardian/invite',
            lazy: async () => ({ Component: (await guardianInvite()).GuardianInviteAcceptScreen }),
          },
          {
            path: 'guardian/invite/:token',
            lazy: async () => ({ Component: (await guardianInvite()).GuardianInviteAcceptScreen }),
          },
          {
            path: 'guardian/share',
            lazy: async () => ({ Component: (await guardianShare()).GuardianShareScreen }),
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
