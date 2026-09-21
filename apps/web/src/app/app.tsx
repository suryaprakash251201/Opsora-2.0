import { RouterProvider } from "react-router";
import { QueryProvider } from "../providers/query-provider";
import { useUi } from "../stores/ui";
import { router } from "./router";
import * as React from "react";

export function App(): React.JSX.Element {
  const theme = useUi((s) => s.theme);
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
