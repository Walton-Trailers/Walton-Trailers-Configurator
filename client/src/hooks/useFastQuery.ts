import { useQuery } from "@tanstack/react-query";

// Optimized fetch function with minimal overhead
const fastFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
};

// Pre-configured fast queries with optimal cache times
export const useFastQuery = {
  categories: () => useQuery({
    queryKey: ['categories'],
    queryFn: () => fastFetch('/api/categories'),
    staleTime: 600000, // 10 minutes
    gcTime: 900000, // 15 minutes
  }),

  models: (categorySlug: string) => useQuery({
    queryKey: ['models', categorySlug],
    queryFn: () => fastFetch(`/api/categories/${categorySlug}/models`),
    staleTime: 300000, // 5 minutes
    enabled: !!categorySlug,
  }),

  allModels: (sessionId: string | null) => useQuery({
    queryKey: ['admin', 'models'],
    queryFn: () => fastFetch('/api/models/all', {
      headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
    }),
    staleTime: 60000, // 1 minute for admin data
    enabled: !!sessionId,
  }),

  allOptions: (sessionId: string | null) => useQuery({
    queryKey: ['admin', 'options'],
    queryFn: () => fastFetch('/api/options/all', {
      headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
    }),
    staleTime: 60000, // 1 minute
    enabled: !!sessionId,
  }),

  customQuotes: (sessionId: string | null) => useQuery({
    queryKey: ['admin', 'custom-quotes'],
    queryFn: () => fastFetch('/api/custom-quotes', {
      headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
    }),
    staleTime: 30000, // 30 seconds - refresh more frequently for quote requests
    enabled: !!sessionId,
  }),
};