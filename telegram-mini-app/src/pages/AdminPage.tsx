import { useState, useEffect, useCallback } from "react";
import {
  adminStats,
  adminGenKey,
  adminMassKey,
  adminRevoke,
  adminListKeys,
  adminListUsers,
  adminListLogs,
  adminAddAdmin,
} from "../api/client";
import type { KeyRecord, UserRecord, LogRecord, StatsResponse } from "../types";
import { formatPriceLabel } from "../utils/barcode";
import { haptic, hapticNotify } from "../hooks/useTheme";

interface Props {
  initData: string;
}

type Tab = "stats" | "genkey" | "keys" | "users" | "logs";

const EXPIRY_OPTIONS = [
  { label: "1 Day", value: 1 },
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "Never", value: 0 },
];

export function AdminPage({ initData }: Props) {
  const [tab, setTab] = useState<Tab>("stats");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<StatsResponse["stats"] | null>(null);

  // Gen key form
  const [genCredits, setGenCredits] = useState("10");
  const [genExpiry, setGenExpiry] = useState(30);
  const [genResult, setGenResult] = useState<{ code: string; credits: number; expiresLabel: string } | null>(null);

  // Mass key form
  const [massAmount, setMassAmount] = useState("10");
  const [massCredits, setMassCredits] = useState("10");
  const [massExpiry, setMassExpiry] = useState(30);
  const [massResult, setMassResult] = useState<{ keys: { code: string }[]; expiresLabel: string } | null>(null);

  // Keys list
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [keysTotal, setKeysTotal] = useState(0);
  const [keysPage, setKeysPage] = useState(1);

  // Users list
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);

  // Logs list
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  // Revoke form
  const [revokeId, setRevokeId] = useState("");
  const [revokeResult, setRevokeResult] = useState<string | null>(null);

  // Add admin form
  const [adminId, setAdminId] = useState("");
  const [adminResult, setAdminResult] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminStats(initData);
      setStats(res.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  const loadKeys = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListKeys(initData, page);
      setKeys(res.keys);
      setKeysTotal(res.total);
      setKeysPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  const loadUsers = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListUsers(initData, page);
      setUsers(res.users);
      setUsersTotal(res.total);
      setUsersPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  const loadLogs = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListLogs(initData, page);
      setLogs(res.logs);
      setLogsTotal(res.total);
      setLogsPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    if (tab === "stats" && !stats) loadStats();
    if (tab === "keys" && keys.length === 0) loadKeys(1);
    if (tab === "users" && users.length === 0) loadUsers(1);
    if (tab === "logs" && logs.length === 0) loadLogs(1);
  }, [tab]);

  function switchTab(newTab: Tab) {
    setTab(newTab);
    setError(null);
    haptic("light");
  }

  async function handleGenKey() {
    setLoading(true);
    setError(null);
    setGenResult(null);
    haptic("medium");
    try {
      const res = await adminGenKey(initData, parseInt(genCredits, 10), genExpiry);
      setGenResult({
        code: res.key.code,
        credits: res.key.credits,
        expiresLabel: res.key.expiresLabel,
      });
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleMassKey() {
    setLoading(true);
    setError(null);
    setMassResult(null);
    haptic("medium");
    try {
      const res = await adminMassKey(
        initData,
        parseInt(massAmount, 10),
        parseInt(massCredits, 10),
        massExpiry,
      );
      setMassResult({ keys: res.keys, expiresLabel: res.expiresLabel });
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate keys");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!revokeId.trim()) return;
    setLoading(true);
    setError(null);
    setRevokeResult(null);
    haptic("medium");
    try {
      const res = await adminRevoke(initData, parseInt(revokeId, 10));
      setRevokeResult(res.message);
      setRevokeId("");
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke user");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!adminId.trim()) return;
    setLoading(true);
    setError(null);
    setAdminResult(null);
    haptic("medium");
    try {
      const res = await adminAddAdmin(initData, parseInt(adminId, 10));
      setAdminResult(res.message);
      setAdminId("");
      hapticNotify("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add admin");
      hapticNotify("error");
    } finally {
      setLoading(false);
    }
  }

  function downloadKeys() {
    if (!massResult) return;
    const content = massResult.keys.map((k) => k.code).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sains-keys-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    haptic("light");
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text);
    haptic("light");
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Admin Panel</div>
        <div className="page-subtitle">Manage keys, users, and monitor activity</div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => switchTab("stats")}>
          Stats
        </button>
        <button className={`tab ${tab === "genkey" ? "active" : ""}`} onClick={() => switchTab("genkey")}>
          Gen Key
        </button>
        <button className={`tab ${tab === "keys" ? "active" : ""}`} onClick={() => switchTab("keys")}>
          Keys
        </button>
        <button className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => switchTab("users")}>
          Users
        </button>
        <button className={`tab ${tab === "logs" ? "active" : ""}`} onClick={() => switchTab("logs")}>
          Logs
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="loading-container" style={{ minHeight: "30vh" }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && tab === "stats" && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalKeys}</div>
              <div className="stat-label">Total Keys</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.availableKeys}</div>
              <div className="stat-label">Available Keys</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.redeemedKeys}</div>
              <div className="stat-label">Redeemed Keys</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="stat-value" style={{ fontSize: 36 }}>{stats.totalGenerations}</div>
            <div className="stat-label">Total Barcodes Generated</div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Add Admin</div>
            {adminResult && <div className="success-box">{adminResult}</div>}
            <div className="input-group" style={{ marginBottom: 8 }}>
              <label className="input-label">Telegram User ID</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="Enter Telegram ID"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleAddAdmin} disabled={!adminId.trim()}>
              Add Admin
            </button>
          </div>

          <button className="btn btn-secondary" onClick={() => loadStats()}>
            Refresh Stats
          </button>
        </div>
      )}

      {!loading && tab === "genkey" && (
        <div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Generate Single Key</div>
            {genResult && (
              <div className="success-box" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Key Generated</div>
                <div style={{ fontFamily: "monospace", fontSize: 16, textAlign: "center", padding: 8, background: "var(--surface-2)", borderRadius: 8, cursor: "pointer" }}
                  onClick={() => copyToClipboard(genResult.code)}>
                  {genResult.code} 📋
                </div>
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {genResult.credits} credits — Expires: {genResult.expiresLabel}
                </div>
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Credits</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={genCredits}
                maxLength={5}
                onChange={(e) => setGenCredits(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Expiry</label>
              <select className="input" value={genExpiry} onChange={(e) => setGenExpiry(parseInt(e.target.value, 10))}>
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleGenKey} disabled={!genCredits}>
              Generate Key
            </button>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Mass Generate Keys</div>
            {massResult && (
              <div className="success-box" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Generated {massResult.keys.length} keys — {massResult.expiresLabel}
                </div>
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={downloadKeys}>
                  ⬇️ Download Keys File
                </button>
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Amount (max 500)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 50"
                value={massAmount}
                maxLength={3}
                onChange={(e) => setMassAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Credits Per Key</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={massCredits}
                maxLength={5}
                onChange={(e) => setMassCredits(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Expiry</label>
              <select className="input" value={massExpiry} onChange={(e) => setMassExpiry(parseInt(e.target.value, 10))}>
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-success" onClick={handleMassKey} disabled={!massAmount || !massCredits}>
              Generate {massAmount || 0} Keys
            </button>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Revoke User Access</div>
            {revokeResult && <div className="success-box">{revokeResult}</div>}
            <div className="input-group" style={{ marginBottom: 8 }}>
              <label className="input-label">Telegram User ID</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="Enter user's Telegram ID"
                value={revokeId}
                onChange={(e) => setRevokeId(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="btn btn-danger" onClick={handleRevoke} disabled={!revokeId.trim()}>
              Revoke Access
            </button>
          </div>
        </div>
      )}

      {!loading && tab === "keys" && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {keysTotal} total keys — Page {keysPage}
          </div>
          {keys.length === 0 ? (
            <div className="empty-state">No keys found</div>
          ) : (
            keys.map((key) => (
              <div key={key.code} className="key-item" onClick={() => copyToClipboard(key.code)} style={{ cursor: "pointer" }}>
                <div>
                  <div className="key-code">{key.code}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {key.credits} credits — {key.redeemed_by ? "Redeemed" : "Available"}
                  </div>
                </div>
                {key.redeemed_by ? (
                  <span className="badge badge-warning">Used</span>
                ) : (
                  <span className="badge badge-success">Free</span>
                )}
              </div>
            ))
          )}
          {keysTotal > 50 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadKeys(keysPage - 1)}
                disabled={keysPage === 1}
              >
                ← Prev
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadKeys(keysPage + 1)}
                disabled={keysPage * 50 >= keysTotal}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "users" && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {usersTotal} total users — Page {usersPage}
          </div>
          {users.length === 0 ? (
            <div className="empty-state">No users found</div>
          ) : (
            users.map((u) => (
              <div key={u.telegram_id} className="key-item">
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {u.first_name || "Unknown"} {u.username ? `@${u.username}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    ID: {u.telegram_id} — {u.credits} credits
                  </div>
                </div>
                {u.revoked ? (
                  <span className="badge badge-error">Revoked</span>
                ) : u.credits > 0 ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-warning">No Credits</span>
                )}
              </div>
            ))
          )}
          {usersTotal > 50 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadUsers(usersPage - 1)}
                disabled={usersPage === 1}
              >
                ← Prev
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadUsers(usersPage + 1)}
                disabled={usersPage * 50 >= usersTotal}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "logs" && (
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            {logsTotal} total generations — Page {logsPage}
          </div>
          {logs.length === 0 ? (
            <div className="empty-state">No generation logs yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Price</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="mono">{log.telegram_id}</td>
                    <td>{formatPriceLabel(log.price_pence)}</td>
                    <td style={{ fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {logsTotal > 50 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadLogs(logsPage - 1)}
                disabled={logsPage === 1}
              >
                ← Prev
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: "auto" }}
                onClick={() => loadLogs(logsPage + 1)}
                disabled={logsPage * 50 >= logsTotal}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
