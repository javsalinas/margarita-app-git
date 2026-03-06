import { createBrowserRouter, Navigate } from 'react-router';
import EditorPage from './pages/EditorPage';

// Placeholder pages for integration
const LoginPage = () => <div className="p-8">Login Page (Pending Phase 3) - <button onClick={() => window.location.href = '/editor/new'}>Go to Editor</button></div>;
const HomePage = () => <div className="p-8">Home Page (Pending Phase 3) - <button onClick={() => window.location.href = '/editor/new'}>Go to Editor</button></div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/editor/new" replace />,
  },
  {
    path: '/login',
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
