import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import contractData from "../abi/Contract.json";
import { CONTRACT_ADDRESS } from "../config";
import "../styling/AdminDashboard.css";

const SEPOLIA_CHAIN_ID = BigInt(11155111);

// ── Types ──────────────────────────────────────────────────────────────────

type ProviderType = "doctor" | "pharmacy" | "scanCenter";
type NavPage = "overview" | "pending" | "deactivate" | "lookup";

interface DoctorProfile {
  fullName: string;
  licenseNumber: string;
  contactEmail: string;
}
interface PharmacyProfile {
  pharmacyName: string;
  licenseNumber: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}
interface ScanCenterProfile {
  centerName: string;
  licenseNumber: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}

type AnyProfile = DoctorProfile | PharmacyProfile | ScanCenterProfile;

interface PendingEntry {
  address: string;
  profile: AnyProfile | null;
  profileLoading: boolean;
  actionLoading: boolean;
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: ProviderType; label: string; color: string }[] = [
  { id: "doctor",     label: "Doctors",      color: "#4fd1c5" },
  { id: "pharmacy",   label: "Pharmacies",   color: "#f6ad55" },
  { id: "scanCenter", label: "Scan Centers", color: "#68d391" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}

function profileDisplayName(type: ProviderType, profile: AnyProfile | null): string {
  if (!profile) return "—";
  if (type === "doctor")     return (profile as DoctorProfile).fullName       || "—";
  if (type === "pharmacy")   return (profile as PharmacyProfile).pharmacyName  || "—";
  if (type === "scanCenter") return (profile as ScanCenterProfile).centerName  || "—";
  return "—";
}

function profileRows(type: ProviderType, profile: AnyProfile | null): { label: string; value: string }[] {
  if (!profile) return [];
  if (type === "doctor") {
    const p = profile as DoctorProfile;
    return [
      { label: "Full Name",   value: p.fullName      || "—" },
      { label: "License No.", value: p.licenseNumber  || "—" },
      { label: "Email",       value: p.contactEmail   || "—" },
    ];
  }
  if (type === "pharmacy") {
    const p = profile as PharmacyProfile;
    return [
      { label: "Name",        value: p.pharmacyName  || "—" },
      { label: "License No.", value: p.licenseNumber  || "—" },
      { label: "Location",    value: p.location       || "—" },
      { label: "Email",       value: p.contactEmail   || "—" },
      { label: "Phone",       value: p.contactPhone   || "—" },
    ];
  }
  const p = profile as ScanCenterProfile;
  return [
    { label: "Center Name", value: p.centerName    || "—" },
    { label: "License No.", value: p.licenseNumber  || "—" },
    { label: "Location",    value: p.location       || "—" },
    { label: "Email",       value: p.contactEmail   || "—" },
    { label: "Phone",       value: p.contactPhone   || "—" },
  ];
}

// ── Toast sub-component ────────────────────────────────────────────────────

function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: 14 }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Admin() {
  const navigate = useNavigate();

  // wallet / contract
  const [walletAddress, setWalletAddress] = useState("");
  const [contract, setContract]           = useState<ethers.Contract | null>(null);
  const [isAdmin, setIsAdmin]             = useState<boolean | null>(null);
  const [connecting, setConnecting]       = useState(false);

  // navigation
  const [page, setPage]         = useState<NavPage>("overview");
  const [pendingTab, setPendingTab] = useState<ProviderType>("doctor");

  // pending lists per type
  const [pendingLists, setPendingLists] = useState<Record<ProviderType, PendingEntry[]>>({
    doctor: [], pharmacy: [], scanCenter: [],
  });
  const [pendingLoading, setPendingLoading] = useState<Record<ProviderType, boolean>>({
    doctor: false, pharmacy: false, scanCenter: false,
  });

  // pending counts (for badges)
  const [counts, setCounts] = useState<Record<ProviderType, number>>({
    doctor: 0, pharmacy: 0, scanCenter: 0,
  });

  // deactivate form
  const [deactivateAddr, setDeactivateAddr]     = useState("");
  const [deactivateType, setDeactivateType]     = useState<ProviderType>("doctor");
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // lookup form
  const [lookupAddr, setLookupAddr]       = useState("");
  const [lookupType, setLookupType]       = useState<ProviderType>("doctor");
  const [lookupResult, setLookupResult]   = useState<{ rows: { label: string; value: string }[]; name: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError]     = useState("");

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = { current: 0 };

  function addToast(type: Toast["type"], message: string) {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  // ── Connect wallet ─────────────────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) { alert("Install MetaMask to continue."); return; }
      setConnecting(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        addToast("error", "Wrong network — switch to Sepolia.");
        setConnecting(false);
        return;
      }

      const signer    = await provider.getSigner();
      const addr      = await signer.getAddress();
      const c         = new ethers.Contract(CONTRACT_ADDRESS, contractData.abi, signer);
      const adminAddr = await c.admin();

      if (addr.toLowerCase() !== adminAddr.toLowerCase()) {
        addToast("error", "This wallet is not the contract admin.");
        setIsAdmin(false);
        setConnecting(false);
        return;
      }

      setWalletAddress(addr);
      setContract(c);
      setIsAdmin(true);
      addToast("success", "Admin wallet connected.");
    } catch (e: any) {
      addToast("error", e?.message ?? "Connection failed.");
    } finally {
      setConnecting(false);
    }
  }, []);

  // ── Load pending list for one type ────────────────────────────────────

  const loadPending = useCallback(async (type: ProviderType, c?: ethers.Contract) => {
    const con = c ?? contract;
    if (!con) return;

    setPendingLoading(prev => ({ ...prev, [type]: true }));
    try {
      let addresses: string[] = [];
      if (type === "doctor")     addresses = await con.getPendingDoctors();
      if (type === "pharmacy")   addresses = await con.getPendingPharmacies();
      if (type === "scanCenter") addresses = await con.getPendingScanCenters();

      // Seed list with address-only entries
      const entries: PendingEntry[] = addresses.map(a => ({
        address: a, profile: null, profileLoading: true, actionLoading: false,
      }));
      setPendingLists(prev => ({ ...prev, [type]: entries }));
      setCounts(prev => ({ ...prev, [type]: addresses.length }));

      // Fetch profiles in parallel, patch each entry as it resolves
      await Promise.allSettled(
        addresses.map(async (addr, idx) => {
          try {
            let raw: any;
            if (type === "doctor")     raw = await con.getDoctorProfile(addr);
            if (type === "pharmacy")   raw = await con.getPharmacyProfile(addr);
            if (type === "scanCenter") raw = await con.getScanCenterProfile(addr);

            let profile: AnyProfile;
            if (type === "doctor") {
              profile = { fullName: raw[0], licenseNumber: raw[1], contactEmail: raw[2] };
            } else if (type === "pharmacy") {
              profile = { pharmacyName: raw[0], licenseNumber: raw[1], location: raw[2], contactEmail: raw[3], contactPhone: raw[4] };
            } else {
              profile = { centerName: raw[0], licenseNumber: raw[1], location: raw[2], contactEmail: raw[3], contactPhone: raw[4] };
            }

            setPendingLists(prev => {
              const updated = [...prev[type]];
              if (updated[idx]) updated[idx] = { ...updated[idx], profile, profileLoading: false };
              return { ...prev, [type]: updated };
            });
          } catch {
            setPendingLists(prev => {
              const updated = [...prev[type]];
              if (updated[idx]) updated[idx] = { ...updated[idx], profileLoading: false };
              return { ...prev, [type]: updated };
            });
          }
        })
      );
    } catch {
      addToast("error", `Failed to load pending ${type}s.`);
    } finally {
      setPendingLoading(prev => ({ ...prev, [type]: false }));
    }
  }, [contract]);

  // Load all pending on first connect
  useEffect(() => {
    if (contract && isAdmin) {
      loadPending("doctor");
      loadPending("pharmacy");
      loadPending("scanCenter");
    }
  }, [contract, isAdmin]);

  // Reload active tab when switching to pending page
  useEffect(() => {
    if (contract && isAdmin && page === "pending") {
      loadPending(pendingTab);
    }
  }, [pendingTab, page]);

  // ── Approve ───────────────────────────────────────────────────────────

  const handleApprove = async (type: ProviderType, addr: string, idx: number) => {
    if (!contract) return;
    setPendingLists(prev => {
      const updated = [...prev[type]];
      updated[idx] = { ...updated[idx], actionLoading: true };
      return { ...prev, [type]: updated };
    });
    try {
      let tx: any;
      if (type === "doctor")     tx = await contract.approveDoctor(addr);
      if (type === "pharmacy")   tx = await contract.approvePharmacy(addr);
      if (type === "scanCenter") tx = await contract.approveScanCenter(addr);
      await tx.wait();
      addToast("success", `${truncate(addr)} approved successfully.`);
      setPendingLists(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    } catch (e: any) {
      addToast("error", e?.reason ?? "Approve transaction failed.");
      setPendingLists(prev => {
        const updated = [...prev[type]];
        updated[idx] = { ...updated[idx], actionLoading: false };
        return { ...prev, [type]: updated };
      });
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────

  const handleReject = async (type: ProviderType, addr: string, idx: number) => {
    if (!contract) return;
    setPendingLists(prev => {
      const updated = [...prev[type]];
      updated[idx] = { ...updated[idx], actionLoading: true };
      return { ...prev, [type]: updated };
    });
    try {
      let tx: any;
      if (type === "doctor")     tx = await contract.rejectDoctor(addr);
      if (type === "pharmacy")   tx = await contract.rejectPharmacy(addr);
      if (type === "scanCenter") tx = await contract.rejectScanCenter(addr);
      await tx.wait();
      addToast("info", `${truncate(addr)} permanently rejected.`);
      setPendingLists(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
    } catch (e: any) {
      addToast("error", e?.reason ?? "Reject transaction failed.");
      setPendingLists(prev => {
        const updated = [...prev[type]];
        updated[idx] = { ...updated[idx], actionLoading: false };
        return { ...prev, [type]: updated };
      });
    }
  };

  // ── Deactivate ────────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!contract || !deactivateAddr.trim()) return;
    setDeactivateLoading(true);
    try {
      let tx: any;
      if (deactivateType === "doctor")     tx = await contract.deactivateDoctor(deactivateAddr.trim());
      if (deactivateType === "pharmacy")   tx = await contract.deactivatePharmacy(deactivateAddr.trim());
      if (deactivateType === "scanCenter") tx = await contract.deactivateScanCenter(deactivateAddr.trim());
      await tx.wait();
      addToast("success", `${truncate(deactivateAddr)} deactivated. They may re-register.`);
      setDeactivateAddr("");
    } catch (e: any) {
      addToast("error", e?.reason ?? "Deactivation failed.");
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ── Lookup ────────────────────────────────────────────────────────────

  const handleLookup = async () => {
    if (!contract || !lookupAddr.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError("");
    try {
      let raw: any;
      if (lookupType === "doctor")     raw = await contract.getDoctorProfile(lookupAddr.trim());
      if (lookupType === "pharmacy")   raw = await contract.getPharmacyProfile(lookupAddr.trim());
      if (lookupType === "scanCenter") raw = await contract.getScanCenterProfile(lookupAddr.trim());

      let profile: AnyProfile;
      if (lookupType === "doctor") {
        profile = { fullName: raw[0], licenseNumber: raw[1], contactEmail: raw[2] };
      } else if (lookupType === "pharmacy") {
        profile = { pharmacyName: raw[0], licenseNumber: raw[1], location: raw[2], contactEmail: raw[3], contactPhone: raw[4] };
      } else {
        profile = { centerName: raw[0], licenseNumber: raw[1], location: raw[2], contactEmail: raw[3], contactPhone: raw[4] };
      }

      setLookupResult({
        name: profileDisplayName(lookupType, profile),
        rows: profileRows(lookupType, profile),
      });
    } catch (e: any) {
      setLookupError(e?.reason ?? "Profile not found or address is not an approved provider.");
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Refresh all ───────────────────────────────────────────────────────

  const refreshAll = () => {
    TAB_CONFIG.forEach(t => loadPending(t.id));
    addToast("info", "Data refreshed.");
  };

  const totalPending = counts.doctor + counts.pharmacy + counts.scanCenter;

  // ── Not connected screen ───────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <>
        <div style={{
          minHeight: "100vh", background: "var(--bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 0,
        }}>
          <div style={{ textAlign: "center", maxWidth: 380 }}>

            <div style={{
              width: 56, height: 56, background: "var(--blue)",
              borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 24, margin: "0 auto 24px",
            }}>
              ⚕
            </div>

            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10,
              letterSpacing: "0.22em", color: "var(--blue)",
              textTransform: "uppercase", marginBottom: 10,
            }}>
              ArogyaChain
            </div>

            <div style={{
              fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--text)", marginBottom: 8,
            }}>
              Admin Console
            </div>

            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--text-dim)", marginBottom: 28, lineHeight: 1.7,
            }}>
              Connect the contract owner wallet to access the dashboard.
            </div>

            {isAdmin === false && (
              <div style={{
                background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 6, padding: "12px 16px", marginBottom: 20,
                fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)",
                lineHeight: 1.6,
              }}>
                ✕ This wallet is not the contract admin.
              </div>
            )}

            <button
              className="btn btn-blue"
              onClick={connectWallet}
              disabled={connecting}
              style={{ maxWidth: 260, margin: "0 auto" }}
            >
              {connecting
                ? <><span className="spinner" style={{ display: "block" }} /> Connecting…</>
                : "Connect Wallet"
              }
            </button>
          </div>
        </div>
        <Toasts toasts={toasts} />
      </>
    );
  }

  // ── Admin dashboard ────────────────────────────────────────────────────

  return (
    <>
      <div className="admin-layout">

        {/* ═══════════════ SIDEBAR ═══════════════ */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">⚕</div>
            <div>
              <div className="logo-text">ArogyaChain</div>
              <div className="logo-sub">ADMIN CONSOLE</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Dashboard</div>

            {(
              [
                { id: "overview",   icon: "▦", label: "Overview"   },
                { id: "pending",    icon: "◎", label: "Pending"    },
                { id: "deactivate", icon: "⊘", label: "Deactivate" },
                { id: "lookup",     icon: "⊕", label: "Lookup"     },
              ] as { id: NavPage; icon: string; label: string }[]
            ).map(item => (
              <div
                key={item.id}
                className={`nav-item${page === item.id ? " active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.id === "pending" && totalPending > 0 && (
                  <span style={{
                    marginLeft: "auto", background: "var(--yellow)",
                    color: "#000", fontSize: 10, fontFamily: "var(--font-mono)",
                    borderRadius: 3, padding: "1px 7px", fontWeight: 700,
                  }}>
                    {totalPending}
                  </span>
                )}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="admin-badge">
              <div className="admin-dot" />
              <div className="admin-label">{truncate(walletAddress)}</div>
            </div>
          </div>
        </aside>

        {/* ═══════════════ MAIN ═══════════════ */}
        <main className="main-content">

          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-title">
              {page === "overview"   && "Overview"}
              {page === "pending"    && "Pending Applications"}
              {page === "deactivate" && "Deactivate Provider"}
              {page === "lookup"     && "Profile Lookup"}
            </div>
            <div className="topbar-right">
              <div className="chain-badge">Sepolia</div>
              <div className="wallet-display">{truncate(walletAddress)}</div>
              <button
                className="btn btn-outline"
                style={{ width: "auto", padding: "5px 14px", fontSize: 11 }}
                onClick={refreshAll}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* ═══ Page Content ═══ */}
          <div className="page-content">

            {/* ─────────── OVERVIEW ─────────── */}
            {page === "overview" && (
              <>
                {/* Stat cards */}
                <div className="stats-grid">
                  <div className="stat-card yellow">
                    <div className="stat-label">Total Pending</div>
                    <div className="stat-value">{totalPending}</div>
                    <div className="stat-sub">Across all provider types</div>
                  </div>
                  <div className="stat-card blue">
                    <div className="stat-label">Pending Doctors</div>
                    <div className="stat-value">{counts.doctor}</div>
                    <div className="stat-sub">Awaiting approval</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-label">Pending Pharmacies</div>
                    <div className="stat-value">{counts.pharmacy}</div>
                    <div className="stat-sub">Awaiting approval</div>
                  </div>
                  <div className="stat-card red">
                    <div className="stat-label">Pending Scan Centers</div>
                    <div className="stat-value">{counts.scanCenter}</div>
                    <div className="stat-sub">Awaiting approval</div>
                  </div>
                </div>

                {/* Quick action cards */}
                <div className="section">
                  <div className="section-header">
                    <div className="section-title">Quick Actions</div>
                    <div className="section-line" />
                  </div>
                  <div className="cards-grid three">
                    {TAB_CONFIG.map(tab => (
                      <div
                        key={tab.id}
                        className="action-card"
                        style={{ cursor: "pointer", borderTop: `2px solid ${tab.color}` }}
                        onClick={() => { setPage("pending"); setPendingTab(tab.id); }}
                      >
                        <div className="action-card-title" style={{ color: tab.color }}>
                          ◎ Review {tab.label}
                        </div>
                        <div style={{
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 14,
                        }}>
                          {counts[tab.id]} application{counts[tab.id] !== 1 ? "s" : ""} waiting.<br />
                          Approve or permanently reject each.
                        </div>
                        <span className={`badge ${counts[tab.id] > 0 ? "badge-yellow" : "badge-green"}`}>
                          {counts[tab.id] > 0 ? `${counts[tab.id]} Pending` : "All Clear"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contract info */}
                <div className="section">
                  <div className="section-header">
                    <div className="section-title">Contract Info</div>
                    <div className="section-line" />
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <tbody>
                        {[
                          { label: "Contract Address",    value: CONTRACT_ADDRESS },
                          { label: "Admin Wallet",        value: walletAddress },
                          { label: "Network",             value: "Sepolia Testnet (Chain ID: 11155111)" },
                          { label: "Emergency Duration",  value: "1 hour per activation" },
                          { label: "Rejection Policy",    value: "Permanent — rejected addresses cannot re-register" },
                          { label: "Deactivation Policy", value: "Soft — deactivated providers may re-register" },
                        ].map(row => (
                          <tr key={row.label}>
                            <td style={{ color: "var(--text-dim)", width: 200 }}>{row.label}</td>
                            <td style={{ color: "var(--blue)", wordBreak: "break-all" }}>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ─────────── PENDING ─────────── */}
            {page === "pending" && (
              <>
                {/* Tab switcher */}
                <div className="tabs">
                  {TAB_CONFIG.map(tab => (
                    <button
                      key={tab.id}
                      className={`tab-btn${pendingTab === tab.id ? " active" : ""}`}
                      onClick={() => setPendingTab(tab.id)}
                      style={pendingTab === tab.id
                        ? { background: tab.color, color: "#050c14" }
                        : {}
                      }
                    >
                      {tab.label}
                      {counts[tab.id] > 0 && (
                        <span style={{
                          marginLeft: 6, background: "rgba(0,0,0,0.3)",
                          borderRadius: 3, padding: "0 5px", fontSize: 10,
                        }}>
                          {counts[tab.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Loading state */}
                {pendingLoading[pendingTab] && (
                  <div className="empty-state">Loading applications…</div>
                )}

                {/* Empty state */}
                {!pendingLoading[pendingTab] && pendingLists[pendingTab].length === 0 && (
                  <div className="empty-state">
                    <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
                    No pending {pendingTab === "scanCenter" ? "scan center" : pendingTab} applications.
                  </div>
                )}

                {/* Pending entries */}
                {!pendingLoading[pendingTab] && pendingLists[pendingTab].length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {pendingLists[pendingTab].map((entry, idx) => {
                      const tabColor = TAB_CONFIG.find(t => t.id === pendingTab)!.color;
                      return (
                        <div
                          key={entry.address}
                          className="action-card"
                          style={{
                            borderLeft: `3px solid ${tabColor}`,
                            opacity: entry.actionLoading ? 0.55 : 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>

                            {/* Profile info */}
                            <div style={{ flex: 1, minWidth: 0 }}>

                              {/* Header row */}
                              <div style={{
                                display: "flex", alignItems: "center",
                                gap: 10, marginBottom: 14, flexWrap: "wrap",
                              }}>
                                <span className="badge badge-yellow">Pending</span>
                                <span style={{
                                  fontFamily: "var(--font-mono)", fontSize: 13,
                                  fontWeight: 700, color: tabColor,
                                }}>
                                  {entry.profileLoading ? truncate(entry.address) : profileDisplayName(pendingTab, entry.profile)}
                                </span>
                                <span style={{
                                  fontFamily: "var(--font-mono)", fontSize: 10,
                                  color: "var(--muted)", wordBreak: "break-all",
                                }}>
                                  {entry.address}
                                </span>
                              </div>

                              {/* Profile table */}
                              {entry.profileLoading ? (
                                <div style={{
                                  fontFamily: "var(--font-mono)", fontSize: 11,
                                  color: "var(--muted)",
                                }}>
                                  Loading profile…
                                </div>
                              ) : (
                                <div className="table-wrap">
                                  <table className="data-table">
                                    <tbody>
                                      {profileRows(pendingTab, entry.profile).map(row => (
                                        <tr key={row.label}>
                                          <td style={{ color: "var(--text-dim)", width: 120, fontSize: 11 }}>
                                            {row.label}
                                          </td>
                                          <td style={{ fontSize: 12 }}>{row.value}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 148, flexShrink: 0 }}>
                              <button
                                className="btn btn-green"
                                disabled={entry.actionLoading || entry.profileLoading}
                                onClick={() => handleApprove(pendingTab, entry.address, idx)}
                              >
                                {entry.actionLoading
                                  ? <span className="spinner" style={{ display: "block" }} />
                                  : "✓ Approve"
                                }
                              </button>
                              <button
                                className="btn btn-red"
                                disabled={entry.actionLoading || entry.profileLoading}
                                onClick={() => handleReject(pendingTab, entry.address, idx)}
                              >
                                {entry.actionLoading
                                  ? <span className="spinner" style={{ display: "block" }} />
                                  : "✕ Reject"
                                }
                              </button>
                              <div style={{
                                fontFamily: "var(--font-mono)", fontSize: 9,
                                color: "var(--muted)", textAlign: "center",
                                lineHeight: 1.6, marginTop: 2,
                              }}>
                                Reject is permanent.<br />Cannot re-register.
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ─────────── DEACTIVATE ─────────── */}
            {page === "deactivate" && (
              <div className="cards-grid single" style={{ maxWidth: 560 }}>
                <div className="action-card">
                  <div className="action-card-title">Deactivate Provider</div>

                  {/* Warning banner */}
                  <div style={{
                    background: "var(--yellow-dim)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 5, padding: "12px 14px", marginBottom: 22,
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "var(--yellow)", lineHeight: 1.8,
                  }}>
                    ⚠ Deactivation removes active status but is <strong>not</strong> permanent.
                    The provider may re-register and go through approval again.
                    Use <strong>Reject</strong> on the Pending page for a permanent ban.
                  </div>

                  <div className="input-group">
                    <label className="input-label">Provider Type</label>
                    <select
                      className="input-field"
                      value={deactivateType}
                      onChange={e => setDeactivateType(e.target.value as ProviderType)}
                      disabled={deactivateLoading}
                    >
                      <option value="doctor">Doctor</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="scanCenter">Scan Center</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Wallet Address</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="0x…"
                      value={deactivateAddr}
                      onChange={e => setDeactivateAddr(e.target.value)}
                      disabled={deactivateLoading}
                    />
                  </div>

                  <button
                    className="btn btn-red"
                    onClick={handleDeactivate}
                    disabled={deactivateLoading || !deactivateAddr.trim()}
                    style={!deactivateAddr.trim() ? { opacity: 0.4 } : {}}
                  >
                    {deactivateLoading
                      ? <><span className="spinner" style={{ display: "block" }} /> Processing…</>
                      : "⊘ Deactivate Provider"
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ─────────── LOOKUP ─────────── */}
            {page === "lookup" && (
              <div className="cards-grid">

                {/* Form */}
                <div className="action-card">
                  <div className="action-card-title">Profile Lookup</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "var(--text-dim)", marginBottom: 20, lineHeight: 1.7,
                  }}>
                    Fetch any approved provider's on-chain profile by wallet address.
                    Admin-only — uses the contract's getter functions.
                  </div>

                  <div className="input-group">
                    <label className="input-label">Provider Type</label>
                    <select
                      className="input-field"
                      value={lookupType}
                      onChange={e => {
                        setLookupType(e.target.value as ProviderType);
                        setLookupResult(null);
                        setLookupError("");
                      }}
                      disabled={lookupLoading}
                    >
                      <option value="doctor">Doctor</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="scanCenter">Scan Center</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Wallet Address</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="0x…"
                      value={lookupAddr}
                      onChange={e => {
                        setLookupAddr(e.target.value);
                        setLookupResult(null);
                        setLookupError("");
                      }}
                      disabled={lookupLoading}
                    />
                  </div>

                  <button
                    className="btn btn-blue"
                    onClick={handleLookup}
                    disabled={lookupLoading || !lookupAddr.trim()}
                    style={!lookupAddr.trim() ? { opacity: 0.4 } : {}}
                  >
                    {lookupLoading
                      ? <><span className="spinner" style={{ display: "block" }} /> Fetching…</>
                      : "⊕ Fetch Profile"
                    }
                  </button>
                </div>

                {/* Result */}
                <div className="action-card">
                  <div className="action-card-title">Result</div>

                  {!lookupResult && !lookupError && !lookupLoading && (
                    <div className="empty-state" style={{ padding: "28px 0" }}>
                      Enter an address above and fetch to see the profile.
                    </div>
                  )}

                  {lookupLoading && (
                    <div className="empty-state" style={{ padding: "28px 0" }}>
                      Querying contract…
                    </div>
                  )}

                  {lookupError && !lookupLoading && (
                    <div style={{
                      background: "var(--red-dim)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 5, padding: "12px 14px",
                      fontFamily: "var(--font-mono)", fontSize: 12,
                      color: "var(--red)", lineHeight: 1.6,
                    }}>
                      ✕ {lookupError}
                    </div>
                  )}

                  {lookupResult && !lookupLoading && (
                    <>
                      <div style={{
                        display: "flex", alignItems: "center",
                        gap: 10, marginBottom: 16,
                      }}>
                        <span className="badge badge-green">Found</span>
                        <span style={{
                          fontFamily: "var(--font-display)", fontSize: 15,
                          fontWeight: 700, color: "var(--text)",
                        }}>
                          {lookupResult.name}
                        </span>
                      </div>

                      <div className="table-wrap" style={{ marginBottom: 16 }}>
                        <table className="data-table">
                          <tbody>
                            {lookupResult.rows.map(row => (
                              <tr key={row.label}>
                                <td style={{ color: "var(--text-dim)", width: 120 }}>{row.label}</td>
                                <td>{row.value}</td>
                              </tr>
                            ))}
                            <tr>
                              <td style={{ color: "var(--text-dim)" }}>Address</td>
                              <td style={{ color: "var(--blue)", wordBreak: "break-all" }}>{lookupAddr}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="divider" />

                      <button
                        className="btn btn-red"
                        onClick={() => {
                          setDeactivateAddr(lookupAddr);
                          setDeactivateType(lookupType);
                          setPage("deactivate");
                        }}
                      >
                        ⊘ Deactivate This Provider
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>{/* end page-content */}
        </main>
      </div>

      <Toasts toasts={toasts} />
    </>
  );
}
