import { createBrowserRouter } from 'react-router-dom';
import { VillageRoot } from '@jjcp/app/screens';
import { NotFoundScreen } from '@jjcp/app/screens/NotFoundScreen';
const readers = () => import('@jjcp/app/screens/ReaderScreens');
const learning = () => import('@jjcp/app/screens/LearningScreens');
const parents = () => import('@jjcp/app/screens/ParentScreens');
export const router = createBrowserRouter([
  {
    path: '/',
    Component: VillageRoot,
    ErrorBoundary: NotFoundScreen,
    hydrateFallbackElement: <p role="status">티키를 열고 있어요…</p>,
    children: [
      { index: true, lazy: async () => ({ Component: (await readers()).ServerHome }) },
      {
        path: 'login',
        lazy: async () => ({
          Component: (await import('@jjcp/app/screens/LoginScreen')).LoginScreen,
        }),
      },
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
      ...['shelf/:id', 'complete/:id'].map((path) => ({
        path,
        lazy: async () => ({ Component: (await readers()).ServerRecord }),
      })),
      { path: 'words', lazy: async () => ({ Component: (await readers()).ServerWords }) },
      ...['community', 'community/:id'].map((path) => ({
        path,
        lazy: async () => ({ Component: (await readers()).ServerCommunity }),
      })),
      { path: 'story-share', lazy: async () => ({ Component: (await readers()).ServerShare }) },
      { path: 'topics/new', lazy: async () => ({ Component: (await readers()).ServerTopics }) },
      { path: 'profile', lazy: async () => ({ Component: (await parents()).ServerProfile }) },
      { path: 'report', lazy: async () => ({ Component: (await parents()).ServerReport }) },
      { path: 'data', lazy: async () => ({ Component: (await parents()).ServerData }) },
      { path: 'tech', lazy: async () => ({ Component: (await parents()).ServerTech }) },
      { path: '*', Component: NotFoundScreen },
    ],
  },
]);
