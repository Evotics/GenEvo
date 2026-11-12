import type { AppUser } from "../types";

interface Props {
  user: AppUser;
}

export function BalancePage({ user }: Props) {
  const accessExpired =
    user.accessExpiresAt && new Date(user.accessExpiresAt).getTime() < Date.now();

  const status = user.revoked
    ? { label: "Revoked", class: "badge-error" }
    : accessExpired
      ? { label: "Expired", class: "badge-error" }
      : user.credits > 0
        ? { label: "Active", class: "badge-success" }
        : { label: "No Credits", class: "badge-warning" };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Your Balance</div>
        <div className="page-subtitle">Credits and access status</div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: "var(--primary)" }}>{user.credits}</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>Credits Remaining</div>
      </div>

      <div className="card">
        <div className="info-row">
          <span className="info-label">Status</span>
          <span className={`badge ${status.class}`}>{status.label}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Telegram ID</span>
          <span className="info-value" style={{ fontFamily: "monospace" }}>{user.telegramId}</span>
        </div>
        {user.username && (
          <div className="info-row">
            <span className="info-label">Username</span>
            <span className="info-value">@{user.username}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Access Expires</span>
          <span className="info-value">
            {user.accessExpiresAt
              ? new Date(user.accessExpiresAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Never"}
          </span>
        </div>
        {user.redeemedKeyCode && (
          <div className="info-row">
            <span className="info-label">Redeemed Key</span>
            <span className="info-value" style={{ fontFamily: "monospace", fontSize: 12 }}>
              {user.redeemedKeyCode}
            </span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Member Since</span>
          <span className="info-value">First redemption</span>
        </div>
      </div>

      <div className="card" style={{ background: "var(--surface-2)" }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Each barcode generation costs 1 credit. Redeem additional keys to get more credits.
          If your access is revoked or expired, contact an administrator.
        </div>
      </div>
    </div>
  );
}
