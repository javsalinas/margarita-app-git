import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './app/routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" theme="light" expand={true} richColors />
    </>
  );
}
