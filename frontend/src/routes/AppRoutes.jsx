import React from 'react';
import { useRoutes } from 'react-router-dom';
import routes from 'virtual:generated-pages-react';

const AppRoutes = () => {
  const element = useRoutes(routes);
  return element;
};

export default AppRoutes;
