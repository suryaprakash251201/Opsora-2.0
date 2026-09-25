import { RouterProvider } from "react-router";
import { QueryProvider } from "../providers/query-provider";
import { applyTheme } from "../lib/theme";
import { useUi } from "../stores/ui";
import { router } from "./router";
import * as React from "react";

export function App(): React.JSX.Element {
  const theme = useUi((s) => s.theme);
  const accent = useUi((s) => s.accent);
  const density = useUi((s) => s.density);
  React.useEffect(() => {
    applyTheme(theme, accent, density);
  }, [theme, accent, density]);
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
