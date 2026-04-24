import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Mounted on "/" to catch users coming back from a Google OAuth redirect
 * with `?returnUrl=<safe path>`. Once auth resolves, forward them.
 *
 * Same-origin safety: only redirects when the value starts with a single "/".
 */
const OAuthReturnHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    const raw = searchParams.get("returnUrl");
    if (!raw) return;
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded.startsWith("/") && !decoded.startsWith("//")) {
        navigate(decoded, { replace: true });
      }
    } catch {
      /* ignore */
    }
  }, [user, loading, searchParams, navigate]);

  return null;
};

export default OAuthReturnHandler;
