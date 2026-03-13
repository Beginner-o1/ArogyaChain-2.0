import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

interface EmergencyNotification {
  id: string;             // txHash + logIndex
  doctor: string;
  expiry: number;         // unix seconds
  blockTimestamp: number; // when it was activated
  read: boolean;
  txHash: string;
}

interface Props {
  contract: ethers.Contract | null;
  account: string;
}

const STORAGE_KEY = (account: string) => `arogyachain_notifs_read_${account.toLowerCase()}`;

export default function NotificationBell({ contract, account }: Props) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [revoking,      setRevoking]      = useState<string | null>(null); // doctor addr being revoked

  const loadNotifications = useCallback(async () => {
    if (!contract || !account) return;
    try {
      setLoading(true);

      // Read which notif IDs the user has already marked read
      const readSet: Set<string> = new Set(
        JSON.parse(localStorage.getItem(STORAGE_KEY(account)) || "[]")
      );

      // Query EmergencyAccessActivated(patient, doctor, expiry) for this patient
      const filter = contract.filters.EmergencyAccessActivated(account);
      const events = await contract.queryFilter(filter);

      const now = Math.floor(Date.now() / 1000);

      const notifs: EmergencyNotification[] = await Promise.all(
        events.map(async (e: any) => {
          const id = `${e.transactionHash}-${e.logIndex}`;
          let blockTimestamp = now;
          try {
            const block = await e.getBlock();
            blockTimestamp = block.timestamp;
          } catch { /* fallback to now */ }

          return {
            id,
            doctor:         e.args.doctor,
            expiry:         Number(e.args.expiry),
            blockTimestamp,
            read:           readSet.has(id),
            txHash:         e.transactionHash,
          };
        })
      );

      // Most recent first
      notifs.sort((a, b) => b.blockTimestamp - a.blockTimestamp);
      setNotifications(notifs);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(STORAGE_KEY(account), JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) markAllRead();
  };

  const revokeEmergency = async (doctorAddr: string) => {
    if (!contract) return;
    try {
      setRevoking(doctorAddr);
      const tx = await contract.revokeEmergencyAccess(doctorAddr);
      await tx.wait();
      // Refresh so the "still active" badge updates
      await loadNotifications();
    } catch (err: any) {
      alert(err?.reason || err?.message || "Transaction failed");
    } finally {
      setRevoking(null);
    }
  };

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleString();

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="nb-wrapper">
      {/* ── Bell Button ── */}
      <button
        className="nb-bell-btn"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="nb-bell-icon">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <>
          <div className="nb-overlay" onClick={() => setOpen(false)} />
          <div className="nb-panel">
            <div className="nb-panel-header">
              <span className="nb-panel-title">Notifications</span>
              {notifications.length > 0 && (
                <button className="nb-clear-btn" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="nb-empty">
                <span className="nb-spinner" /> Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">No notifications yet.</div>
            ) : (
              <ul className="nb-list">
                {notifications.map(n => {
                  const isActive  = n.expiry > now;
                  const isRevoking = revoking === n.doctor;
                  return (
                    <li key={n.id} className={`nb-item ${!n.read ? "nb-item--unread" : ""}`}>
                      <div className="nb-item-top">
                        <span className="nb-item-icon">⚡</span>
                        <div className="nb-item-body">
                          <p className="nb-item-title">Emergency Access Activated</p>
                          <p className="nb-item-sub">
                            Dr. <span className="nb-mono">{shortAddr(n.doctor)}</span>
                            {" "}accessed your records
                          </p>
                          <p className="nb-item-time">{formatTime(n.blockTimestamp)}</p>
                        </div>
                        {isActive ? (
                          <span className="nb-status nb-status--active">Active</span>
                        ) : (
                          <span className="nb-status nb-status--expired">Expired</span>
                        )}
                      </div>

                      {isActive && (
                        <div className="nb-item-footer">
                          <p className="nb-item-expiry">
                            Expires: {formatTime(n.expiry)}
                          </p>
                          <button
                            className="nb-revoke-btn"
                            onClick={() => revokeEmergency(n.doctor)}
                            disabled={isRevoking}
                          >
                            {isRevoking
                              ? <><span className="nb-spinner nb-spinner--sm" /> Revoking…</>
                              : "✕ Revoke Access"
                            }
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
