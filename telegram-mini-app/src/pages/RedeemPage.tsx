import { useState } from "react";
import { redeemKey } from "../api/client";
import { haptic, hapticNotify } from "../hooks/useTheme";

interface Props {
  initData: string;
  onRedeemed: (credits: number) => void;
}

export function RedeemPage({ initData, onRedeemed }: Props) {
  const [keyCode, setKeyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ credits: number; firstRedemption: boolean } | null>(null);

  async function handleRedeem() {
    if (!keyCode.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    haptic("medium");

    try {
      const res = await redeemKey(initData, keyCode.trim());
      setSuccess({ credits: res.credits, firstRedemption: res.firstRedemption ?? false });
      onRedeemed(res.credits);
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem key");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Redeem Access Key</div>
        <div className="page-subtitle">Enter your key to activate credits and access</div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {success ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Successfully Redeemed!</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
            {success.firstRedemption
              ? "Welcome to Sains Reborn! Your key has been activated."
              : "Your key has been added to your account."}
          </div>
          <div className="stat-card" style={{ marginBottom: 20 }}>
            <div className="stat-value">{success.credits}</div>
            <div className="stat-label">Total Credits</div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSuccess(null);
              setKeyCode("");
            }}
          >
            Redeem Another Key
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="input-group">
            <label className="input-label">Access Key</label>
            <input
              className="input"
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={keyCode}
              maxLength={24}
              onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
              style={{ fontFamily: "monospace", letterSpacing: 1, textAlign: "center", fontSize: 18 }}
            />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, textAlign: "center" }}>
            Paste the key you received (with or without dashes)
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRedeem}
            disabled={!keyCode.trim() || loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Redeeming...
              </>
            ) : (
              <>🔑 Redeem Key</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
