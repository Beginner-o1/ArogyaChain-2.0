import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { formatAddress, formatDate, handleError } from "../utils/helpers";
import "../styling/PatientDashboard.css";

interface MedicalRecord {
  id: number;
  patient: string;
  uploader: string;
  uploaderRole: number;
  recordType: number;
  recordCID: string;
  recordHash: string;
  prescriptionCID: string;
  timestamp: number;
  isDeleted: boolean;
}

interface GrantedDoctor {
  address: string;
  fullName: string;
  licenseNumber: string;
  contactEmail: string;
}

interface GrantedScanCenter {
  address: string;
  centerName: string;
  licenseNumber: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}

type PanelEntity =
  | ({ kind: "doctor" } & GrantedDoctor)
  | ({ kind: "scan"   } & GrantedScanCenter);

export default function PatientDashboard() {
  const { contract } = useAuth();
  const [records, setRecords]               = useState<MedicalRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [doctorAddress, setDoctorAddress]   = useState("");
  const [scanAddress, setScanAddress]       = useState("");
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
  const [grantAddress, setGrantAddress]     = useState("");
  const [activeTab, setActiveTab]           = useState<"records" | "grant" | "view">("records");

  // Slide-in detail panel
  const [panelEntity, setPanelEntity] = useState<PanelEntity | null>(null);

  // View Permissions state
  const [grantedDoctors, setGrantedDoctors]         = useState<GrantedDoctor[]>([]);
  const [grantedScanCenters, setGrantedScanCenters] = useState<GrantedScanCenter[]>([]);
  const [permsLoading, setPermsLoading]             = useState(false);

  useEffect(() => { loadRecords(); }, [contract]);

  // Reload permissions whenever the view tab is opened
  useEffect(() => {
    if (activeTab === "view") loadPermissions();
  }, [activeTab, contract]);

  /* ── loaders ───────────────────────────────────────────── */

  const loadRecords = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const recordIds = await contract.getMyRecords();
      const recordsData = await Promise.all(
        recordIds.map(async (id: bigint) => {
          try {
            const record = await contract.viewRecord(id);
            return {
              id:              Number(id),
              patient:         record.patient,
              uploader:        record.uploader,
              uploaderRole:    Number(record.uploaderRole),
              recordType:      Number(record.recordType),
              recordCID:       record.recordCID,
              recordHash:      record.recordHash,
              prescriptionCID: record.prescriptionCID,
              timestamp:       Number(record.timestamp),
              isDeleted:       record.isDeleted,
            };
          } catch { return null; }
        })
      );
      setRecords(recordsData.filter((r): r is MedicalRecord => r !== null && !r.isDeleted));
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!contract) return;
    try {
      setPermsLoading(true);
      const [doctorAddrs, scanAddrs]: [string[], string[]] = await Promise.all([
        contract.getMyGrantedDoctors(),
        contract.getMyGrantedScanCenters(),
      ]);

      const doctors: GrantedDoctor[] = await Promise.all(
        doctorAddrs.map(async (addr: string) => {
          try {
            const p = await contract.getDoctorProfile(addr);
            return { address: addr, fullName: p.fullName, licenseNumber: p.licenseNumber, contactEmail: p.contactEmail };
          } catch {
            return { address: addr, fullName: "Unknown", licenseNumber: "—", contactEmail: "—" };
          }
        })
      );

      const scanCenters: GrantedScanCenter[] = await Promise.all(
        scanAddrs.map(async (addr: string) => {
          try {
            const p = await contract.getScanCenterProfile(addr);
            return { address: addr, centerName: p.centerName, licenseNumber: p.licenseNumber, location: p.location, contactEmail: p.contactEmail, contactPhone: p.contactPhone };
          } catch {
            return { address: addr, centerName: "Unknown", licenseNumber: "—", location: "—", contactEmail: "—", contactPhone: "—" };
          }
        })
      );

      setGrantedDoctors(doctors);
      setGrantedScanCenters(scanCenters);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setPermsLoading(false);
    }
  };

  /* ── contract actions ──────────────────────────────────── */

  const grantDoctorUpload = async () => {
    if (!contract || !doctorAddress) return;
    try {
      const tx = await contract.grantDoctorUpload(doctorAddress);
      await tx.wait();
      alert("Doctor upload permission granted!");
      setDoctorAddress("");
    } catch (error) { alert(handleError(error)); }
  };

  const grantScanUpload = async () => {
    if (!contract || !scanAddress) return;
    try {
      const tx = await contract.grantScanUpload(scanAddress);
      await tx.wait();
      alert("Scan center upload permission granted!");
      setScanAddress("");
    } catch (error) { alert(handleError(error)); }
  };

  const revokeDoctorUpload = async (addr: string) => {
    if (!contract || !confirm(`Revoke upload permission for ${formatAddress(addr)}?`)) return;
    try {
      const tx = await contract.revokeDoctorUpload(addr);
      await tx.wait();
      setGrantedDoctors(prev => prev.filter(d => d.address !== addr));
    } catch (error) { alert(handleError(error)); }
  };

  const revokeScanUpload = async (addr: string) => {
    if (!contract || !confirm(`Revoke upload permission for ${formatAddress(addr)}?`)) return;
    try {
      const tx = await contract.revokeScanUpload(addr);
      await tx.wait();
      setGrantedScanCenters(prev => prev.filter(s => s.address !== addr));
    } catch (error) { alert(handleError(error)); }
  };

  const grantRecordAccess = async () => {
    if (!contract || selectedRecord === null || !grantAddress) return;
    try {
      const tx = await contract.grantRecordAccess(selectedRecord, grantAddress);
      await tx.wait();
      alert("Record access granted!");
      setGrantAddress("");
      setSelectedRecord(null);
    } catch (error) { alert(handleError(error)); }
  };

  const deleteRecord = async (recordId: number) => {
    if (!contract || !confirm("Are you sure you want to delete this record?")) return;
    try {
      const tx = await contract.deleteRecord(recordId);
      await tx.wait();
      alert("Record deleted!");
      loadRecords();
    } catch (error) { alert(handleError(error)); }
  };

  const viewOnIPFS = (cid: string) => window.open(`https://ipfs.io/ipfs/${cid}`, "_blank");

  /* ── render ────────────────────────────────────────────── */

  return (
    <Layout title="Patient Dashboard">
      <div className="pd-space">

        {/* Stats */}
        <div className="pd-stats-grid">
          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Total Records</p>
              <p className="pd-stat-value">{records.length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Medical Records</p>
              <p className="pd-stat-value">{records.filter(r => r.recordType === 0).length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Scan Records</p>
              <p className="pd-stat-value">{records.filter(r => r.recordType === 1).length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="pd-tabs">
          <button
            onClick={() => setActiveTab("records")}
            className={`pd-tab-btn ${activeTab === "records" ? "pd-tab-btn--active" : ""}`}
          >
            My Records
          </button>
          <button
            onClick={() => setActiveTab("grant")}
            className={`pd-tab-btn ${activeTab === "grant" ? "pd-tab-btn--active" : ""}`}
          >
            Grant Permissions
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`pd-tab-btn ${activeTab === "view" ? "pd-tab-btn--active" : ""}`}
          >
            View Permissions
          </button>
        </div>

        {/* ── My Records ────────────────────────────────────── */}
        {activeTab === "records" && (
          <div className="pd-card">
            <p className="pd-card-title">Medical Records</p>

            {loading ? (
              <div className="pd-loading">
                <div className="pd-spinner" />
                <p>Loading records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="pd-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No records yet</p>
              </div>
            ) : (
              <div className="pd-records-list">
                {records.map((record) => (
                  <div key={record.id} className="pd-record-item">
                    <div className="pd-record-header">
                      <div className="pd-record-meta">
                        <div className="pd-record-badges">
                          <span className={`pd-badge ${record.recordType === 0 ? "pd-badge--green" : "pd-badge--purple"}`}>
                            {record.recordType === 0 ? "Medical Record" : "Scan Record"}
                          </span>
                          <span className="pd-record-id">ID: {record.id}</span>
                        </div>
                        <p className="pd-record-info"><span>Uploaded by:</span> {formatAddress(record.uploader)}</p>
                        <p className="pd-record-info"><span>Date:</span> {formatDate(record.timestamp)}</p>
                        {record.prescriptionCID && (
                          <p className="pd-record-info"><span>Prescription:</span> Available</p>
                        )}
                      </div>
                      <div className="pd-record-actions">
                        <button className="pd-btn pd-btn--view"   onClick={() => viewOnIPFS(record.recordCID)}>View</button>
                        <button className="pd-btn pd-btn--share"  onClick={() => { setSelectedRecord(record.id); setGrantAddress(""); }}>Share</button>
                        <button className="pd-btn pd-btn--delete" onClick={() => deleteRecord(record.id)}>Delete</button>
                      </div>
                    </div>

                    {selectedRecord === record.id && (
                      <div className="pd-share-form">
                        <p>Grant access to:</p>
                        <div className="pd-share-row">
                          <input
                            type="text"
                            value={grantAddress}
                            onChange={(e) => setGrantAddress(e.target.value)}
                            placeholder="Doctor's wallet address"
                            className="pd-input"
                            style={{ flex: 1 }}
                          />
                          <button className="pd-btn pd-btn--grant"  onClick={grantRecordAccess}>Grant</button>
                          <button className="pd-btn pd-btn--cancel" onClick={() => setSelectedRecord(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Grant Permissions ─────────────────────────────── */}
        {activeTab === "grant" && (
          <div className="pd-perms-grid">
            <div className="pd-card">
              <p className="pd-card-title">Grant Doctor Upload</p>
              <p className="pd-perms-desc">Allow a doctor to upload medical records on your behalf</p>
              <div className="pd-perms-fields">
                <input
                  type="text"
                  value={doctorAddress}
                  onChange={(e) => setDoctorAddress(e.target.value)}
                  placeholder="Doctor's wallet address"
                  className="pd-input pd-input--full"
                />
                <button className="pd-btn pd-btn--full pd-btn--blue-full" onClick={grantDoctorUpload}>
                  Grant Permission
                </button>
              </div>
            </div>

            <div className="pd-card">
              <p className="pd-card-title">Grant Scan Center Upload</p>
              <p className="pd-perms-desc">Allow a scan center to upload diagnostic images</p>
              <div className="pd-perms-fields">
                <input
                  type="text"
                  value={scanAddress}
                  onChange={(e) => setScanAddress(e.target.value)}
                  placeholder="Scan center's wallet address"
                  className="pd-input pd-input--full"
                />
                <button className="pd-btn pd-btn--full pd-btn--purple-full" onClick={grantScanUpload}>
                  Grant Permission
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── View Permissions ──────────────────────────────── */}
        {activeTab === "view" && (
          <div className="pd-view-perms-wrap">
            {permsLoading ? (
              <div className="pd-loading">
                <div className="pd-spinner" />
                <p>Loading permissions...</p>
              </div>
            ) : (
              <>
                {/* Granted Doctors */}
                <div className="pd-card">
                  <div className="pd-vp-header">
                    <p className="pd-card-title">Doctors with Upload Permission</p>
                    <span className="pd-vp-count pd-vp-count--teal">{grantedDoctors.length}</span>
                  </div>

                  {grantedDoctors.length === 0 ? (
                    <div className="pd-empty pd-empty--sm">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p>No doctors have been granted upload permission</p>
                    </div>
                  ) : (
                    <div className="pd-perm-list">
                      {grantedDoctors.map((doc) => (
                        <div
                          key={doc.address}
                          className="pd-perm-item pd-perm-item--clickable"
                          onClick={() => setPanelEntity({ kind: "doctor", ...doc })}
                        >
                          <div className="pd-perm-avatar pd-perm-avatar--teal">⚕</div>
                          <div className="pd-perm-info">
                            <p className="pd-perm-name">{doc.fullName}</p>
                            <p className="pd-perm-detail">{doc.licenseNumber}</p>
                            <p className="pd-perm-addr">{formatAddress(doc.address)}</p>
                          </div>
                          <button
                            className="pd-btn pd-btn--revoke"
                            onClick={(e) => { e.stopPropagation(); revokeDoctorUpload(doc.address); }}
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Granted Scan Centers */}
                <div className="pd-card">
                  <div className="pd-vp-header">
                    <p className="pd-card-title">Scan Centers with Upload Permission</p>
                    <span className="pd-vp-count pd-vp-count--amber">{grantedScanCenters.length}</span>
                  </div>

                  {grantedScanCenters.length === 0 ? (
                    <div className="pd-empty pd-empty--sm">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>No scan centers have been granted upload permission</p>
                    </div>
                  ) : (
                    <div className="pd-perm-list">
                      {grantedScanCenters.map((sc) => (
                        <div
                          key={sc.address}
                          className="pd-perm-item pd-perm-item--clickable"
                          onClick={() => setPanelEntity({ kind: "scan", ...sc })}
                        >
                          <div className="pd-perm-avatar pd-perm-avatar--amber">🔬</div>
                          <div className="pd-perm-info">
                            <p className="pd-perm-name">{sc.centerName}</p>
                            <p className="pd-perm-detail">{sc.location} · {sc.licenseNumber}</p>
                            <p className="pd-perm-addr">{formatAddress(sc.address)}</p>
                          </div>
                          <button
                            className="pd-btn pd-btn--revoke"
                            onClick={(e) => { e.stopPropagation(); revokeScanUpload(sc.address); }}
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Detail Slide-in Panel ──────────────────────────── */}
      <div className={`pd-detail-overlay ${panelEntity ? "pd-detail-overlay--open" : ""}`}>
        <div className="pd-detail-backdrop" onClick={() => setPanelEntity(null)} />
        <div className="pd-detail-panel">

          {/* close button */}
          <button className="pd-detail-close" onClick={() => setPanelEntity(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>

          {panelEntity && (
            <>
              {/* Header */}
              <div className="pd-detail-header">
                <div className={`pd-detail-avatar ${panelEntity.kind === "doctor" ? "pd-detail-avatar--teal" : "pd-detail-avatar--amber"}`}>
                  {panelEntity.kind === "doctor" ? "⚕" : "🔬"}
                </div>
                <div>
                  <p className="pd-detail-eyebrow">
                    {panelEntity.kind === "doctor" ? "Doctor" : "Scan Center"}
                  </p>
                  <p className="pd-detail-name">
                    {panelEntity.kind === "doctor" ? panelEntity.fullName : panelEntity.centerName}
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="pd-detail-body">
                <div className="pd-detail-field">
                  <span className="pd-detail-label">Wallet Address</span>
                  <span className="pd-detail-value pd-detail-value--mono">{panelEntity.address}</span>
                </div>
                <div className="pd-detail-field">
                  <span className="pd-detail-label">License Number</span>
                  <span className="pd-detail-value">{panelEntity.licenseNumber}</span>
                </div>
                {panelEntity.kind === "doctor" && (
                  <div className="pd-detail-field">
                    <span className="pd-detail-label">Contact Email</span>
                    <span className="pd-detail-value">{panelEntity.contactEmail || "—"}</span>
                  </div>
                )}
                {panelEntity.kind === "scan" && (
                  <>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Location</span>
                      <span className="pd-detail-value">{panelEntity.location || "—"}</span>
                    </div>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Contact Email</span>
                      <span className="pd-detail-value">{panelEntity.contactEmail || "—"}</span>
                    </div>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Contact Phone</span>
                      <span className="pd-detail-value">{panelEntity.contactPhone || "—"}</span>
                    </div>
                  </>
                )}
                <div className="pd-detail-field">
                  <span className="pd-detail-label">Permission</span>
                  <span className="pd-detail-value pd-detail-value--green">Upload Granted ✓</span>
                </div>
              </div>

              {/* Footer — revoke from panel */}
              <div className="pd-detail-footer">
                <button
                  className="pd-btn pd-btn--full pd-btn--revoke-full"
                  onClick={() => {
                    if (panelEntity.kind === "doctor") revokeDoctorUpload(panelEntity.address);
                    else revokeScanUpload(panelEntity.address);
                    setPanelEntity(null);
                  }}
                >
                  Revoke Permission
                </button>
                <button className="pd-btn pd-btn--full pd-btn--cancel" onClick={() => setPanelEntity(null)}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </Layout>
  );
}
