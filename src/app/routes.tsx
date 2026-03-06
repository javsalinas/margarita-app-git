import { createBrowserRouter, Navigate } from 'react-router';
import LoginPage from './pages/LoginPage';
import EditorPage from './pages/EditorPage';

// Placeholder HomePage for later
const HomePage = () => <div className="p-8">Home Page (Dashboard) - <button onClick={() => window.location.href = '/editor/new'}>Go to Editor</button></div>;

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
