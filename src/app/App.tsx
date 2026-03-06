import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#000000',
            border: '2px solid #000000',
            borderRadius: '4px',
            boxShadow: '4px 4px 0px #000000',
            fontWeight: '700',
          },
        }}
      />
    </>
  );
}