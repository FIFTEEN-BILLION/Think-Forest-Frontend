import { createBrowserRouter } from 'react-router-dom';
import { HomeScreen, NotFoundScreen } from '@jjcp/app/screens';

export const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '*', element: <NotFoundScreen /> },
]);
