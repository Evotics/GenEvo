import { useState, useEffect, useCallback } from "react";
import type { AppUser } from "../types";
import { authenticate, getInitData } from "../api/client";

interface AuthState {
  loading: boolean;
  error: string | null;
  user: AppUser | null;
  isAdmin: boolean;
  initData: string;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initData, setInitData] = useState("");

  const doAuth = useCallback(async () => {
    setLoading(true);
    setError(null);

    const data = getInitData();
    setInitData(data);

    if (!data) {
      setError("Could not retrieve Telegram authentication data. Please open this app through Telegram.");
      setLoading(false);
      return;
    }

    try {
      const result = await authenticate(data);
      setUser(result.user);
      setIsAdmin(result.isAdmin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doAuth();
  }, [doAuth]);

  return {
    loading,
    error,
    user,
    isAdmin,
    initData,
    refresh: doAuth,
  };
}
