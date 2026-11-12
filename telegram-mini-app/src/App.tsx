import { useState, useEffect } from "react";
import type { Page } from "./types";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { HomePage } from "./pages/HomePage";
import { GeneratePage } from "./pages/GeneratePage";
import { RedeemPage } from "./pages/RedeemPage";
import { BalancePage } from "./pages/BalancePage";
import { AdminPage } from "./pages/AdminPage";
import { BottomNav } from "./components/BottomNav";

export default function App() {
  const theme = useTheme();
  const { loading, error, user, isAdmin, initData, refresh } = useAuth();
  const [page, setPage] = useState<Page>("home");
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (user) setCredits(user.credits);
  }, [user]);

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        if (theme === "dark") {
          tg.setHeaderColor("#1a1d24");
          tg.setBackgroundColor("#0f1115");
        } else {
          tg.setHeaderColor("#ffffff");
          tg.setBackgroundColor("#f5f5f5");
        }
      } catch {
        // Some Telegram clients don't support these
      }
    }
  }, [theme]);

  function handleNavigate(newPage: Page) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>Authenticating...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, textAlign: "center", maxWidth: 320 }}>{error}</div>
        <button className="btn btn-secondary" style={{ maxWidth: 200 }} onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>No user data found</div>
        <button className="btn btn-secondary" style={{ maxWidth: 200 }} onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {(page === "home" || page === "balance") && (
        <HomePage
          user={{ ...user, credits }}
          isAdmin={isAdmin}
          onNavigate={handleNavigate}
        />
      )}

      {page === "generate" && (
        <GeneratePage
          initData={initData}
          telegramId={user.telegramId}
          credits={credits}
          onCreditsChange={setCredits}
        />
      )}

      {page === "redeem" && (
        <RedeemPage
          initData={initData}
          onRedeemed={(newCredits) => {
            setCredits(newCredits);
            refresh();
          }}
        />
      )}

      {page === "balance" && <BalancePage user={{ ...user, credits }} />}

      {page === "admin" && isAdmin && <AdminPage initData={initData} />}

      {page === "admin" && !isAdmin && (
        <div className="admin-locked">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div>Admin access required</div>
        </div>
      )}

      <BottomNav current={page} isAdmin={isAdmin} onNavigate={handleNavigate} />
    </>
  );
}
