import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  lastLogin: string | null;
  createdAt: string;
}

interface UseAdminAuthReturn {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (sessionId: string, user: AdminUser) => void;
  logout: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionId = localStorage.getItem("admin_session");
        const savedUser = localStorage.getItem("admin_user");

        if (!sessionId || !savedUser) {
          setIsLoading(false);
          return;
        }

        // Verify session is still valid by fetching current user profile
        const response: AdminUser = await apiRequest("/api/admin/profile", {
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });

        setUser(response);
      } catch (error) {
        // Session invalid, clear localStorage
        localStorage.removeItem("admin_session");
        localStorage.removeItem("admin_user");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (sessionId: string, userData: AdminUser) => {
    localStorage.setItem("admin_session", sessionId);
    localStorage.setItem("admin_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      const sessionId = localStorage.getItem("admin_session");
      if (sessionId) {
        await apiRequest("/api/admin/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("admin_session");
      localStorage.removeItem("admin_user");
      setUser(null);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    logout,
  };
}