import { useState, useCallback } from "react";
import "../styling/AdminDashboard.css";

// ── Types ──────────────────────────────────────────────────────
interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface EntityRow {
  address: string;
  role: string;
  status: "active" | "inactive";
  registeredAt: string;
}

type TabId = "overview" | "doctors" | "pharmacies" | "scancenters" | "records";

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_ENTITIES: EntityRow[] = [
  { address: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12", role: "Doctor", status: "active", registeredAt: "2024-03-01" },
  { address: "0x9f8e7d6c5b4a3210fedcba9876543210fedcba98", role: "Doctor", status: "active", registeredAt: "2024-03-05" },
  { address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", role: "Doctor", status: "inactive", registeredAt: "2024-02-20" },
  { address: "0xabcdef1234567890abcdef1234567890abcdef12", role: "Pharmacy", status: "active", registeredAt: "2024-03-08" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", role: "ScanCenter", status: "active", registeredAt: "2024-03-10" },
];

// ── Helpers ────────────────────────────────────────────────────
function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Toast Hook ─────────────────────────────────────────────────
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastItem["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, addToast };
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub: string; color: string }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────
function OverviewTab({ entities }: { entities: EntityRow[] }) {
  const doctors = entities.filter((e) => e.role === "Doctor");
  const pharmacies = entities.filter((e) => e.role === "Pharmacy");
  const scancenters = entities.filter((e) => e.role === "ScanCenter");
  const active = entities.filter((e) => e.status === "active");

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Total Doctors" value={doctors.length} sub={`${doctors.filter(d => d.status === "active").length} active`} color="blue" />
        <StatCard label="Pharmacies" value={pharmacies.length} sub={`${pharmacies.filter(d => d.status === "active").length} active`} color="green" />
        <StatCard label="Scan Centers" value={scancenters.length} sub={`${scancenters.filter(d => d.status === "active").length} active`} color="yellow" />
        <StatCard label="Active Entities" value={active.length} sub={`of ${entities.length} total`} color="blue" />
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Recent Registrations</span>
          <div className="section-line" />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {entities.slice(0, 5).map((e) => (
                <tr key={e.address}>
                  <td>{shortAddr(e.address)}</td>
                  <td><span className="badge badge-blue">{e.role}</span></td>
                  <td>
                    <span className={`badge ${e.status === "active" ? "badge-green" : "badge-red"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.registeredAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Manage Entity Tab ──────────────────────────────────────────
function ManageEntityTab({
  role,
  entities,
  onDeactivate,
  addToast,
}: {
  role: "Doctor" | "Pharmacy" | "ScanCenter";
  entities: EntityRow[];
  onDeactivate: (addr: string) => void;
  addToast: (type: ToastItem["type"], msg: string) => void;
}) {
  const [loadingAddr, setLoadingAddr] = useState<string | null>(null);
  const filtered = entities.filter((e) => e.role === role);

  const handleDeactivate = async (addr: string) => {
    setLoadingAddr(addr);
    await new Promise((r) => setTimeout(r, 1000));
    onDeactivate(addr);
    addToast("success", `${role} deactivated: ${shortAddr(addr)}`);
    setLoadingAddr(null);
  };

  return (
    <div className="section">
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">No {role.toLowerCase()}s registered yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.address}>
                  <td title={e.address}>{shortAddr(e.address)}</td>
                  <td>
                    <span className={`badge ${e.status === "active" ? "badge-green" : "badge-red"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.registeredAt}</td>
                  <td>
                    {e.status === "active" ? (
                      <button
                        className={`btn btn-red ${loadingAddr === e.address ? "loading" : ""}`}
                        style={{ width: "auto", padding: "6px 14px", fontSize: "10px" }}
                        onClick={() => handleDeactivate(e.address)}
                        disabled={loadingAddr === e.address}
                      >
                        <span className="spinner" />
                        <span className="btn-text">Deactivate</span>
                      </button>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Records Tab ────────────────────────────────────────────────
function RecordsTab({ addToast }: { addToast: (type: ToastItem["type"], msg: string) => void }) {
  const [recordId, setRecordId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleView = async () => {
    if (!recordId.trim()) {
      addToast("error", "Please enter a record ID.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setResult(
      JSON.stringify({
        id: recordId,
        patient: "0xPatient...addr",
        uploader: "0xDoctor...addr",
        recordType: "MEDICAL",
        cid: "QmXyz...ipfs",
        timestamp: Date.now(),
        isDeleted: false,
      }, null, 2)
    );
    setLoading(false);
    addToast("info", `Fetched record #${recordId}`);
  };

  return (
    <div className="cards-grid single">
      <div className="action-card">
        <div className="action-card-title">View Record by ID</div>
        <div className="input-group">
          <label className="input-label">Record ID</label>
          <input
            className="input-field"
            placeholder="e.g. 42"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
          />
        </div>
        <button className={`btn btn-blue ${loading ? "loading" : ""}`} onClick={handleView} disabled={loading}>
          <span className="spinner" />
          <span className="btn-text">Fetch Record</span>
        </button>
        {result && (
          <pre className="result-box visible" style={{ whiteSpace: "pre-wrap" }}>
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Toast Component ────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const icons = { success: "✓", error: "✕", info: "i" };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontWeight: 700 }}>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [entities, setEntities] = useState<EntityRow[]>(MOCK_ENTITIES);
  const { toasts, addToast } = useToast();

  const [deactivateAddr, setDeactivateAddr] = useState("");
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const handleDeactivate = (addr: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.address === addr ? { ...e, status: "inactive" } : e))
    );
  };

  const handleManualDeactivate = async (role: string) => {
    if (!deactivateAddr.trim()) {
      addToast("error", "Enter an address.");
      return;
    }
    setDeactivateLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    addToast("success", `${role} ${shortAddr(deactivateAddr)} deactivated.`);
    setDeactivateAddr("");
    setDeactivateLoading(false);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "doctors", label: "Doctors" },
    { id: "pharmacies", label: "Pharmacies" },
    { id: "scancenters", label: "Scan Centers" },
    { id: "records", label: "Records" },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⛓</div>
          <div>
            <div className="logo-text">ArogyaChain</div>
            <div className="logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {tabs.map((t) => (
            <div
              key={t.id}
              className={`nav-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="nav-icon">
                {{ overview: "◈", doctors: "⚕", pharmacies: "⬡", scancenters: "◎", records: "▤" }[t.id]}
              </span>
              {t.label}
            </div>
          ))}

          <div className="nav-section-label" style={{ marginTop: 16 }}>Contract</div>
          <div className="nav-item" onClick={() => addToast("info", "Opening block explorer...")}>
            <span className="nav-icon">↗</span>
            Explorer
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-badge">
            <div className="admin-dot" />
            <span className="admin-label">Admin Connected</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {{ overview: "Overview", doctors: "Manage Doctors", pharmacies: "Manage Pharmacies", scancenters: "Scan Centers", records: "Medical Records" }[activeTab]}
          </div>
          <div className="topbar-right">
            <div className="chain-badge">Hardhat Local</div>
            <div className="wallet-display">0x302B...cBe8</div>
          </div>
        </header>

        <main className="page-content">
          {activeTab === "overview" && <OverviewTab entities={entities} />}

          {activeTab === "doctors" && (
            <>
              <div className="cards-grid" style={{ marginBottom: 24 }}>
                <div className="action-card">
                  <div className="action-card-title">Deactivate Doctor</div>
                  <div className="input-group">
                    <label className="input-label">Doctor Address</label>
                    <input
                      className="input-field"
                      placeholder="0x..."
                      value={deactivateAddr}
                      onChange={(e) => setDeactivateAddr(e.target.value)}
                    />
                  </div>
                  <button
                    className={`btn btn-red ${deactivateLoading ? "loading" : ""}`}
                    onClick={() => handleManualDeactivate("Doctor")}
                    disabled={deactivateLoading}
                  >
                    <span className="spinner" />
                    <span className="btn-text">Deactivate Doctor</span>
                  </button>
                </div>
                <div className="action-card">
                  <div className="action-card-title">Doctor Stats</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["active", "inactive"].map((s) => {
                      const count = entities.filter((e) => e.role === "Doctor" && e.status === s).length;
                      return (
                        <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`badge ${s === "active" ? "badge-green" : "badge-red"}`}>{s}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <span className="section-title">All Doctors</span>
                  <div className="section-line" />
                </div>
                <ManageEntityTab role="Doctor" entities={entities} onDeactivate={handleDeactivate} addToast={addToast} />
              </div>
            </>
          )}

          {activeTab === "pharmacies" && (
            <>
              <div className="cards-grid" style={{ marginBottom: 24 }}>
                <div className="action-card">
                  <div className="action-card-title">Deactivate Pharmacy</div>
                  <div className="input-group">
                    <label className="input-label">Pharmacy Address</label>
                    <input
                      className="input-field"
                      placeholder="0x..."
                      value={deactivateAddr}
                      onChange={(e) => setDeactivateAddr(e.target.value)}
                    />
                  </div>
                  <button
                    className={`btn btn-red ${deactivateLoading ? "loading" : ""}`}
                    onClick={() => handleManualDeactivate("Pharmacy")}
                    disabled={deactivateLoading}
                  >
                    <span className="spinner" />
                    <span className="btn-text">Deactivate Pharmacy</span>
                  </button>
                </div>
                <div className="action-card">
                  <div className="action-card-title">Pharmacy Stats</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["active", "inactive"].map((s) => {
                      const count = entities.filter((e) => e.role === "Pharmacy" && e.status === s).length;
                      return (
                        <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`badge ${s === "active" ? "badge-green" : "badge-red"}`}>{s}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <span className="section-title">All Pharmacies</span>
                  <div className="section-line" />
                </div>
                <ManageEntityTab role="Pharmacy" entities={entities} onDeactivate={handleDeactivate} addToast={addToast} />
              </div>
            </>
          )}

          {activeTab === "scancenters" && (
            <>
              <div className="cards-grid" style={{ marginBottom: 24 }}>
                <div className="action-card">
                  <div className="action-card-title">Deactivate Scan Center</div>
                  <div className="input-group">
                    <label className="input-label">Scan Center Address</label>
                    <input
                      className="input-field"
                      placeholder="0x..."
                      value={deactivateAddr}
                      onChange={(e) => setDeactivateAddr(e.target.value)}
                    />
                  </div>
                  <button
                    className={`btn btn-red ${deactivateLoading ? "loading" : ""}`}
                    onClick={() => handleManualDeactivate("ScanCenter")}
                    disabled={deactivateLoading}
                  >
                    <span className="spinner" />
                    <span className="btn-text">Deactivate Scan Center</span>
                  </button>
                </div>
                <div className="action-card">
                  <div className="action-card-title">Scan Center Stats</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {["active", "inactive"].map((s) => {
                      const count = entities.filter((e) => e.role === "ScanCenter" && e.status === s).length;
                      return (
                        <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`badge ${s === "active" ? "badge-green" : "badge-red"}`}>{s}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <span className="section-title">All Scan Centers</span>
                  <div className="section-line" />
                </div>
                <ManageEntityTab role="ScanCenter" entities={entities} onDeactivate={handleDeactivate} addToast={addToast} />
              </div>
            </>
          )}

          {activeTab === "records" && <RecordsTab addToast={addToast} />}
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
