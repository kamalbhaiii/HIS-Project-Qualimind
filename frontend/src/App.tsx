import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import routes from 'virtual:generated-pages-react';
import AppProviders from './providers/AppProviders';

function RouterView() {
  const element = useRoutes([
    ...routes,
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
