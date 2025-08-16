import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const { method = "GET", body, headers = {} } = options || {};
  
  // Check for admin or dealer session
  const adminSession = localStorage.getItem("admin_session");
  const dealerSession = localStorage.getItem("dealer_session");
  
  const requestHeaders = {
    ...headers,
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(adminSession ? { "Authorization": `Bearer ${adminSession}` } : {}),
    ...(dealerSession ? { "Authorization": `Bearer ${dealerSession}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return JSON data if there's content, otherwise return null
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check for admin or dealer session
    const adminSession = localStorage.getItem("admin_session");
    const dealerSession = localStorage.getItem("dealer_session");
    
    const headers: Record<string, string> = {};
    if (adminSession) {
      headers["Authorization"] = `Bearer ${adminSession}`;
    } else if (dealerSession) {
      headers["Authorization"] = `Bearer ${dealerSession}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: (query) => {
        // Enable refetch on focus for dealer endpoints
        const queryKey = query.queryKey as string[];
        return queryKey?.[0]?.includes('/dealer/');
      },
      staleTime: 0, // Always consider data stale
      gcTime: 0, // Don't cache queries (v5 uses gcTime instead of cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
