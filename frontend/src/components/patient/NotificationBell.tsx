import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import ContractABI from "../../abi/Contract.json";
import { CONTRACT_ADDRESS, RPC_URL } from "../../config";

interface EmergencyNotification {
  id: string;
  doctor: string;
  doctorName: string;
  licenseNumber: string;
  expiry: number;
  blockTimestamp: number;
  read: boolean;
  txHash: string;
}

interface Props {
  contract: ethers.Contract | null;
  account: string;
}

// ── localStorage keys ──
const STORAGE_KEY_READ  = (a: string) => `arogyachain_notifs_read_${a.toLowerCase()}`;
const STORAGE_KEY_CACHE = (a: string) => `arogyachain_notifs_cache_${a.toLowerCase()}`;
const STORAGE_KEY_BLOCK = (a: string) => `arogyachain_notifs_block_${a.toLowerCase()}`;

const DEPLOYMENT_BLOCK = 10432600;
const CHUNK_SIZE       = 2000;

// ── Cache helpers ──
function loadCache(account: string): EmergencyNotification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CACHE(account)) || "[]"); }
  catch { return []; }
}
function saveCache(account: string, notifs: EmergencyNotification[]) {
  localStorage.setItem(STORAGE_KEY_CACHE(account), JSON.stringify(notifs));
}
function loadLastBlock(account: string): number {
  const s = localStorage.getItem(STORAGE_KEY_BLOCK(account));
  return s ? Number(s) : DEPLOYMENT_BLOCK;
}
function saveLastBlock(account: string, block: number) {
  localStorage.setItem(STORAGE_KEY_BLOCK(account), String(block));
}
function loadReadSet(account: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_READ(account)) || "[]")); }
  catch { return new Set(); }
}
function saveReadSet(account: string, ids: string[]) {
  localStorage.setItem(STORAGE_KEY_READ(account), JSON.stringify(ids));
}

// ── Time helpers ──
function timeSince(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatCountdown(expiry: number): string {
  const remaining = expiry - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s remaining`;
}

export default function NotificationBell({ contract, account }: Props) {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [revoking,      setRevoking]      = useState<string | null>(null);
  const [,          setTick]          = useState(0); // drives live countdown re-render
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live countdown ticker ──
  // Only runs when panel is open and there are active notifications
  useEffect(() => {
    const hasActive = notifications.some(
      n => n.expiry > Math.floor(Date.now() / 1000)
    );
    if (open && hasActive) {
      tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [open, notifications]);

  const loadNotifications = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);

      const readProvider = new ethers.JsonRpcProvider(RPC_URL);
      const readContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ContractABI.abi,
        readProvider
      );

      const latestBlock = await readProvider.getBlockNumber();
      const cached      = loadCache(account);
      const lastBlock   = loadLastBlock(account);
      const readSet     = loadReadSet(account);

      // ── Return early if already up to date ──
      if (lastBlock >= latestBlock) {
        const withRead = cached.map(n => ({ ...n, read: readSet.has(n.id) }));
        withRead.sort((a, b) => b.blockTimestamp - a.blockTimestamp);
        setNotifications(withRead);
        return;
      }

      // ── Only scan new blocks since last visit ──
      const fromBlock = lastBlock + 1;
      const filter    = readContract.filters.EmergencyAccessActivated(account);

      let newEvents: any[] = [];
      for (let from = fromBlock; from <= latestBlock; from += CHUNK_SIZE) {
        const to = Math.min(from + CHUNK_SIZE - 1, latestBlock);
        try {
          const chunk = await readContract.queryFilter(filter, from, to);
          newEvents = newEvents.concat(chunk);
        } catch (err) {
          console.warn(`Skipped block range ${from}-${to}:`, err);
        }
      }

      const now = Math.floor(Date.now() / 1000);

      // ── Parse events + fetch doctor profile for each ──
      const newNotifs: EmergencyNotification[] = await Promise.all(
        newEvents.map(async (e: any) => {
          const id           = `${e.transactionHash}-${e.logIndex}`;
          const doctorAddr   = e.args.doctor;
          let blockTimestamp = now;
          let doctorName     = "";
          let licenseNumber  = "";

          // Fetch block timestamp
          try {
            const block = await readProvider.getBlock(e.blockNumber);
            blockTimestamp = block?.timestamp ?? now;
          } catch { /* fallback */ }

          // Fetch doctor profile — use read contract (no signer needed for view)
          try {
            // getDoctorProfile requires caller to be patient or admin.
            // Since we're calling from a read provider (no signer), we use
            // the signer-backed contract for this view call instead.
            // We'll populate from cache if already known.
            const cached = loadCache(account).find(n => n.doctor === doctorAddr);
            if (cached?.doctorName) {
              doctorName    = cached.doctorName;
              licenseNumber = cached.licenseNumber;
            }
          } catch { /* leave blank */ }

          return {
            id,
            doctor:        doctorAddr,
            doctorName,
            licenseNumber,
            expiry:        Number(e.args.expiry),
            blockTimestamp,
            read:          readSet.has(id),
            txHash:        e.transactionHash,
          };
        })
      );

      // ── Merge + deduplicate ──
      const merged  = [...cached, ...newNotifs];
      const deduped = Array.from(
        new Map(merged.map(n => [n.id, { ...n, read: readSet.has(n.id) }])).values()
      );
      deduped.sort((a, b) => b.blockTimestamp - a.blockTimestamp);

      // ── Fetch doctor profiles for any notification missing them ──
      // Uses the signer-backed contract (patient calling getDoctorProfile is allowed)
      if (contract) {
        await Promise.all(
          deduped
            .filter(n => !n.doctorName)
            .map(async n => {
              try {
                const profile  = await contract.getDoctorProfile(n.doctor);
                n.doctorName    = profile.fullName     || "";
                n.licenseNumber = profile.licenseNumber || "";
              } catch { /* doctor may be deactivated */ }
            })
        );
      }

      saveCache(account, deduped);
      saveLastBlock(account, latestBlock);
      setNotifications(deduped);

    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [account, contract]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Real-time listener for new emergency activations
  useEffect(() => {
    if (!contract || !account) return;
    const handler = () => { loadNotifications(); };
    contract.on("EmergencyAccessActivated", handler);
    return () => { contract.off("EmergencyAccessActivated", handler); };
  }, [contract, account, loadNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    saveReadSet(account, allIds);
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
      await loadNotifications();
    } catch (err: any) {
      alert(err?.reason || err?.message || "Transaction failed");
    } finally {
      setRevoking(null);
    }
  };

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="nb-wrapper">

      {/* ── Bell Button ── */}
      <button className="nb-bell-btn" onClick={handleOpen} aria-label="Notifications">
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
                  const isActive   = n.expiry > now;
                  const isRevoking = revoking === n.doctor;

                  return (
                    <li key={n.id} className={`nb-item ${!n.read ? "nb-item--unread" : ""}`}>

                      {/* ── Top row: icon + body + status badge ── */}
                      <div className="nb-item-top">
                        <span className="nb-item-icon">⚡</span>
                        <div className="nb-item-body">
                          <p className="nb-item-title">Emergency Access Activated</p>

                          {/* Doctor name + license */}
                          {n.doctorName ? (
                            <p className="nb-item-sub">
                              <strong>Dr. {n.doctorName}</strong>
                              {n.licenseNumber && (
                                <span className="nb-license"> · {n.licenseNumber}</span>
                              )}
                            </p>
                          ) : (
                            <p className="nb-item-sub">
                              Dr. <span className="nb-mono">{shortAddr(n.doctor)}</span>
                            </p>
                          )}

                          {/* Wallet address always shown below name */}
                          <p className="nb-item-addr nb-mono">{shortAddr(n.doctor)}</p>

                          {/* Time since activation */}
                          <p className="nb-item-time">
                            Activated {timeSince(n.blockTimestamp)}
                            <span style={{ marginLeft: 6, opacity: 0.5 }}>
                              · {new Date(n.blockTimestamp * 1000).toLocaleString()}
                            </span>
                          </p>
                        </div>

                        {/* Active / Expired badge */}
                        {isActive ? (
                          <span className="nb-status nb-status--active">Active</span>
                        ) : (
                          <span className="nb-status nb-status--expired">Expired</span>
                        )}
                      </div>

                      {/* ── Active session details ── */}
                      {isActive && (
                        <div className="nb-item-footer">
                          {/* Live countdown — re-renders every second via tick */}
                          <div className="nb-countdown">
                            <span className="nb-countdown-icon">⏱</span>
                            <span className="nb-countdown-text">
                              {formatCountdown(n.expiry)}
                            </span>
                          </div>

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

                      {/* ── Expired session — show when it expired ── */}
                      {!isActive && (
                        <div className="nb-item-footer nb-item-footer--expired">
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>
                            Expired {timeSince(n.expiry)}
                          </span>
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
