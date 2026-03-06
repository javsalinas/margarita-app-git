import { createBrowserRouter, Navigate } from 'react-router';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/editor/:projectId',
    element: <EditorPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
