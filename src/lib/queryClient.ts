import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';
import { useAuthStore } from '../stores/authStore';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});
useAuthStore.subscribe((state, previous) => {
  if (state.session?.accessToken !== previous.session?.accessToken) {
    void queryClient.cancelQueries();
    queryClient.clear();
  }
});
