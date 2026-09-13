import { createBrowserRouter } from 'react-router-dom';
import { HomeScreen, NotFoundScreen, VillageRoot } from '@jjcp/app/screens';

const parent = () => import('@jjcp/app/village/ParentScreen');
const onboarding = () => import('@jjcp/app/village/OnboardingScreen');
const library = () => import('@jjcp/app/village/LibraryScreen');
const adventures = async () => ({
  Component: (await import('@jjcp/app/village/AdventureScreen')).AdventureScreen,
});

export const router = createBrowserRouter([
  {
    path: '/',
    Component: VillageRoot,
    hydrateFallbackElement: (
      <div className="route-loading" role="status">
        생각숲을 열고 있어요…
      </div>
    ),
    ErrorBoundary: NotFoundScreen,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'welcome', lazy: async () => ({ Component: (await onboarding()).WelcomeScreen }) },
      {
        path: 'onboarding',
        lazy: async () => ({ Component: (await onboarding()).OnboardingScreen }),
      },
      {
        path: 'diagnosis/:mode?',
        lazy: async () => ({ Component: (await onboarding()).DiagnosisScreen }),
      },
      { path: 'adventures', lazy: adventures },
      { path: 'adventures/:track', lazy: adventures },
      { path: 'adventures/:track/:activityId', lazy: adventures },
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
      { path: 'parent-gate', lazy: async () => ({ Component: (await parent()).ParentGateScreen }) },
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
