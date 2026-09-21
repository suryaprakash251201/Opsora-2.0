import { QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { createQueryClient } from "../lib/query";

let client: ReturnType<typeof createQueryClient> | null = null;

export function QueryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (!client) client = createQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
