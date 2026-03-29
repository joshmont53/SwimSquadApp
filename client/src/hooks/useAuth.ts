import { useQuery } from "@tanstack/react-query";

interface AuthStatusResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    clubColor: string | null;
  };
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: data?.authenticated || false,
    error,
  };
}
