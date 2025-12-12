import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import routes from "virtual:generated-pages-react";
import NotFound from "../pages/NotFound";

const AppRoutes = () => {
  const element = useRoutes([
    ...routes,

    // redirect "/" -> "/sign-in"
    { path: "/", element: <Navigate to="/sign-in" replace /> },

    // redirect "/dataset-view" -> "/sign-in"
    { path: "/dataset-view", element: <Navigate to="/dataset" replace /> },

    // catch-all 404
    { path: "*", element: <NotFound />  },
  ]);

  return element;
};

export default AppRoutes;
