import { Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import routes from 'virtual:generated-pages-react';
import AppProviders from './providers/AppProviders';

function RouterView() {
  const element = useRoutes([
    ...routes,
    { path: "/", element: <Navigate to="/test" replace /> },
    { path: '*', element: <div>404 – Not Found</div> },
  ]);
  return element;
}

export default function App() {
  return (
    <AppProviders>
      <Suspense fallback={<div>Loading…</div>}>
        <RouterView />
      </Suspense>
    </AppProviders>
  );
}
