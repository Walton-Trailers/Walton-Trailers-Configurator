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
  // Determine which session to use based on the URL
  const isAdminRoute = url.includes('/admin/');
  const isDealerRoute = url.includes('/dealer/');
  
  const adminSession = localStorage.getItem("admin_session");
  const dealerSession = localStorage.getItem("dealer_session");
  
  
  // Use appropriate session based on route
  let authHeader = {};
  if (isDealerRoute && dealerSession) {
    authHeader = { "Authorization": `Bearer ${dealerSession}` };
  } else if (isAdminRoute && adminSession) {
    authHeader = { "Authorization": `Bearer ${adminSession}` };
  } else if (dealerSession && !isAdminRoute) {
    // Default to dealer session if available and not an admin route
    authHeader = { "Authorization": `Bearer ${dealerSession}` };
  } else if (adminSession && !isDealerRoute) {
    // Default to admin session if available and not a dealer route
    authHeader = { "Authorization": `Bearer ${adminSession}` };
  }
  
  const requestHeaders = {
    ...headers,
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...authHeader,
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
    const url = queryKey.join("/") as string;
    const isAdminRoute = url.includes('/admin/');
    const isDealerRoute = url.includes('/dealer/');
    
    const adminSession = localStorage.getItem("admin_session");
    const dealerSession = localStorage.getItem("dealer_session");
    
    
    const headers: Record<string, string> = {};
    
    // Use appropriate session based on route
    if (isDealerRoute && dealerSession) {
      headers["Authorization"] = `Bearer ${dealerSession}`;
    } else if (isAdminRoute && adminSession) {
      headers["Authorization"] = `Bearer ${adminSession}`;
    } else if (dealerSession && !isAdminRoute) {
      // Default to dealer session if available and not an admin route
      headers["Authorization"] = `Bearer ${dealerSession}`;
    } else if (adminSession && !isDealerRoute) {
      // Default to admin session if available and not a dealer route
      headers["Authorization"] = `Bearer ${adminSession}`;
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
