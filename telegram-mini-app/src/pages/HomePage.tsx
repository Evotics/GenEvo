import type { AppUser, Page } from "../types";
import { formatPriceLabel } from "../utils/barcode";

interface Props {
  user: AppUser;
  isAdmin: boolean;
  onNavigate: (page: Page) => void;
}

export function HomePage({ user, isAdmin, onNavigate }: Props) {
  const hasAccess = !user.revoked && user.credits > 0;
  const accessExpired =
    user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() < Date.now();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Sains Reborn</div>
        <div className="page-subtitle">
          Welcome{user.firstName ? `, ${user.firstName}` : ""} — your private barcode generator
        </div>
      </div>

      {/* Balance card */}
      <div className="card">
        <div className="card-header">
          <div className="card-icon" style={{ background: "rgba(244,119,56,0.15)" }}>
            <span>💳</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="card-title">Credits</div>
            <div className="card-subtitle">Your generation balance</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{user.credits}</div>
        </div>
        <div className="info-row">
          <span className="info-label">Access Status</span>
          {user.revoked ? (
            <span className="badge badge-error">Revoked</span>
          ) : accessExpired ? (
            <span className="badge badge-error">Expired</span>
          ) : hasAccess ? (
            <span className="badge badge-success">Active</span>
          ) : (
            <span className="badge badge-warning">No Credits</span>
          )}
        </div>
        {user.accessExpiresAt && (
          <div className="info-row">
            <span className="info-label">Access Expires</span>
            <span className="info-value">
              {new Date(user.accessExpiresAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>
          Quick Actions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => onNavigate("generate")}>
            <span>📊</span> Generate Barcode
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate("redeem")}>
            <span>🔑</span> Redeem Access Key
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate("balance")}>
            <span>💳</span> View Balance
          </button>
        </div>
      </div>

      {/* Admin shortcut */}
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <div className="card-icon" style={{ background: "rgba(34,197,94,0.15)" }}>
              <span>⚙️</span>
            </div>
            <div>
              <div className="card-title">Admin Panel</div>
              <div className="card-subtitle">Manage keys, users, and view logs</div>
            </div>
          </div>
          <button className="btn btn-success" onClick={() => onNavigate("admin")}>
            Open Admin Panel
          </button>
        </div>
      )}

      {/* No access hint */}
      {!hasAccess && !user.revoked && (
        <div className="card" style={{ border: "2px solid var(--primary)" }}>
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              You need credits to generate barcodes
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Redeem an access key to get credits and start generating.
            </div>
            <button className="btn btn-primary" onClick={() => onNavigate("redeem")}>
              Redeem a Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
