import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSastStore } from "../store/sast";

/**
 * Wrapper de ruta protegida.
 * Si no hay sesión activa → redirige a /login con `from` en state.
 * Muestra spinner mientras `hydrateAuth` no haya terminado.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const { authHydrated, currentUser, authToken, hydrateAuth } = useSastStore((s) => ({
    authHydrated: s.authHydrated,
    currentUser: s.currentUser,
    authToken: s.authToken,
    hydrateAuth: s.hydrateAuth,
  }));

  useEffect(() => {
    if (!authHydrated) {
      hydrateAuth().catch(() => {});
    }
  }, [authHydrated, hydrateAuth]);

  if (!authHydrated) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--studio-bg)] text-[var(--studio-text)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-blue-500/50 border-t-blue-400 animate-spin" />
          <p className="text-sm text-[var(--studio-text-secondary)] font-mono">
            Verificando sesión…
          </p>
        </div>
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
