import { createBrowserRouter } from 'react-router-dom';
import { HomeScreen, NotFoundScreen, VillageRoot } from '@jjcp/app/screens';

const parent = () => import('@jjcp/app/screens/ParentScreen');
const library = () => import('@jjcp/app/screens/LibraryScreen');
const experience = () => import('@jjcp/app/screens/ExperienceScreen');
const adventures = async () => ({
  Component: (await import('@jjcp/app/screens/AdventureScreen')).AdventureScreen,
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
      {
        path: 'talk',
        lazy: async () => ({
          Component: (await import('@jjcp/app/screens/ConversationScreen')).ConversationScreen,
        }),
      },
      {
        path: 'first-talk',
        lazy: async () => ({
          Component: (await import('@jjcp/app/screens/FirstTalkScreen')).FirstTalkScreen,
        }),
      },
      {
        path: 'words',
        lazy: async () => ({
          Component: (await import('@jjcp/app/screens/WordsScreen')).WordsScreen,
        }),
      },
      {
        path: 'community',
        lazy: async () => ({
          Component: (await import('@jjcp/app/screens/CommunityScreen')).CommunityScreen,
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
          Component: (await import('@jjcp/app/screens/SessionScreen')).SessionScreen,
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
          Component: (await import('@jjcp/app/screens/ReportScreen')).ReportScreen,
        }),
      },
      {
        lazy: async () => ({ Component: (await parent()).ProtectedParentScreen }),
        children: [
          { path: 'profile', lazy: async () => ({ Component: (await parent()).ProfileScreen }) },
          { path: 'tech', lazy: async () => ({ Component: (await parent()).TechScreen }) },
          { path: 'data', lazy: async () => ({ Component: (await parent()).DataScreen }) },
        ],
      },
      { path: '*', Component: NotFoundScreen },
    ],
  },
]);
