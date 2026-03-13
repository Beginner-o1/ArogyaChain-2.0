import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MedicalRecordDrawer from "../components/MedicalRecordDrawer";
import QRScannerModal from "../components/QRScannerModal";
import { handleError } from "../utils/helpers";
import "../styling/DoctorDashboard.css";
import "../styling/QRScannerModal.css";

interface PatientRecord {
  id: string;
  title: string;
  recordType: number;
  recordCID: string;
  prescriptionCID: string;
  timestamp: string;
  uploader: string;
}

type QRTarget = "emergency" | "record" | null;

const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

export default function DoctorDashboard() {
  const { contract, account } = useAuth();

  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [qrTarget,         setQrTarget]         = useState<QRTarget>(null);

  /* ── Emergency Access ── */
  const [emergencyId,      setEmergencyId]      = useState("");
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyPatient, setEmergencyPatient] = useState<string | null>(null);
  const [profileCID,       setProfileCID]       = useState<string | null>(null);

  /* ── Patient Records ── */
  const [patientRecords,   setPatientRecords]   = useState<PatientRecord[]>([]);
  const [recordsLoading,   setRecordsLoading]   = useState(false);

  /* ── Single Record Lookup ── */
  const [recordId,         setRecordId]         = useState("");
  const [viewingRecord,    setViewingRecord]     = useState<any>(null);
  const [viewLoading,      setViewLoading]       = useState(false);

  /* ── Single QR handler for both fields ── */
  const handleQRScan = (value: string) => {
    if (qrTarget === "emergency") setEmergencyId(value);
    if (qrTarget === "record")    setRecordId(value);
    setQrTarget(null);
  };

  /* ── Emergency Access ── */
  const activateEmergencyAccess = async () => {
    if (!contract || !emergencyId.trim()) return;
    try {
      setEmergencyLoading(true);
      setEmergencyPatient(null);
      setProfileCID(null);
      setPatientRecords([]);

      const tx = await contract.activateEmergencyAccess(emergencyId.trim());
      await tx.wait();

      const patientAddress = emergencyId.trim();
      setEmergencyPatient(patientAddress);
      setEmergencyId("");

      let cid: string | null = null;
      try {
        const [c] = await contract.getPatientProfileCID(patientAddress);
        cid = c || null;
      } catch { /* no profile */ }
      setProfileCID(cid);

      await loadPatientRecords(patientAddress);
    } catch (error) {
      alert(handleError(error));
    } finally {
      setEmergencyLoading(false);
    }
  };

  /* ── Load all patient records ── */
  const loadPatientRecords = async (patientAddress: string) => {
    if (!contract) return;
    try {
      setRecordsLoading(true);
      const recordIds: string[] = await contract.getPatientRecords(patientAddress);
      const records: PatientRecord[] = (
        await Promise.all(
          recordIds.map(async (id: string) => {
            try {
              const r = await contract.viewRecord(id);
              return {
                id,
                title:           r.title || `Record ${id.slice(0, 8)}…`,
                recordType:      Number(r.recordType),
                recordCID:       r.recordCID,
                prescriptionCID: r.prescriptionCID,
                timestamp:       new Date(Number(r.timestamp) * 1000).toLocaleString(),
                uploader:        r.uploader,
              } as PatientRecord;
            } catch { return null; }
          })
        )
      ).filter((r): r is PatientRecord => r !== null);
      setPatientRecords(records);
    } catch (error) {
      console.error("Error loading patient records:", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  /* ── Single record lookup ── */
  const handleViewRecord = async () => {
    if (!contract || !recordId.trim()) return;
    try {
      setViewLoading(true);
      const record = await contract.viewRecord(recordId);
      setViewingRecord({
        id:              recordId,
        patient:         record.patient,
        uploader:        record.uploader,
        title:           record.title,
        recordCID:       record.recordCID,
        prescriptionCID: record.prescriptionCID,
        timestamp:       new Date(Number(record.timestamp) * 1000).toLocaleString(),
      });
    } catch (error) {
      alert(handleError(error));
    } finally {
      setViewLoading(false);
    }
  };

  const shortAddr            = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";
  const recordTypeLabel      = (t: number)    => t === 0 ? "Medical Record" : "Scan Record";
  const recordTypeBadgeClass = (t: number)    => t === 0 ? "dd-badge dd-badge--green" : "dd-badge dd-badge--purple";

  return (
    <Layout title="Doctor Dashboard">
      <div className="dd-root">

        {/* ── Stat Cards ── */}
        <div className="dd-stats">
          <div className="dd-stat dd-stat--blue">
            <div className="dd-stat-accent" />
            <div className="dd-stat-label">Role</div>
            <div className="dd-stat-value">Doctor</div>
            <div className="dd-stat-sub">Medical professional</div>
          </div>
          <div className="dd-stat dd-stat--green">
            <div className="dd-stat-accent" />
            <div className="dd-stat-label">Status</div>
            <div className="dd-stat-value dd-stat-value--green">Active</div>
            <div className="dd-stat-sub">Verified on-chain</div>
          </div>
          <div className="dd-stat dd-stat--blue">
            <div className="dd-stat-accent" />
            <div className="dd-stat-label">Wallet</div>
            <div className="dd-stat-value dd-stat-value--mono">{shortAddr(account || "")}</div>
            <div className="dd-stat-sub">Connected via MetaMask</div>
          </div>
        </div>

        {/* ── Upload Record ── */}
        <div className="dd-card">
          <div className="dd-card-header">
            <div>
              <div className="dd-card-title">Upload Medical Record</div>
              <div className="dd-card-desc">
                Fill in the patient's visit details. A signed PDF is generated,
                pinned to IPFS, and written to the blockchain automatically.
              </div>
            </div>
          </div>
          <button className="dd-btn dd-btn--primary" onClick={() => setDrawerOpen(true)}>
            <span>+</span> Create Medical Record
          </button>
        </div>

        {/* ── Emergency Access + Single Record Lookup ── */}
        <div className="dd-grid-2">

          {/* ── Emergency Access ── */}
          <div className="dd-card">
            <div className="dd-card-title">Emergency Access</div>
            <div className="dd-card-desc" style={{ marginBottom: 16 }}>
              Activate temporary access to <strong>all records</strong> and the{" "}
              <strong>health profile</strong> of a patient. Expires after{" "}
              <strong>1 hour</strong> and is permanently logged on-chain.
            </div>

            <div className="dd-field">
              <label className="dd-label">Patient Wallet Address</label>
              <div className="dd-input-row">
                <input
                  className="dd-input"
                  type="text"
                  placeholder="0x..."
                  value={emergencyId}
                  onChange={(e) => setEmergencyId(e.target.value)}
                />
                <button
                  className="dd-qr-btn"
                  type="button"
                  onClick={() => setQrTarget("emergency")}
                  title="Scan patient wallet QR"
                >
                  <QRIcon />
                </button>
              </div>
              {emergencyId.startsWith("0x") && emergencyId.length === 42 && (
                <div className="dd-address-chip">
                  <span className="dd-address-chip-dot" />
                  {emergencyId.slice(0, 10)}...{emergencyId.slice(-6)}
                </div>
              )}
            </div>

            <button
              className="dd-btn dd-btn--red"
              onClick={activateEmergencyAccess}
              disabled={!emergencyId.trim() || emergencyLoading}
            >
              {emergencyLoading
                ? <><span className="dd-spinner" /> Activating...</>
                : "Activate Emergency Access"
              }
            </button>

            {emergencyPatient && (
              <div className="dd-emergency-result">
                <div className="dd-emergency-result-header">
                  <span className="dd-emergency-badge">⚡ Emergency Access Active — 1 Hour</span>
                  <span className="dd-emergency-patient">Patient: {shortAddr(emergencyPatient)}</span>
                </div>
                <div className="dd-emergency-section">
                  <p className="dd-emergency-section-label">Health Profile</p>
                  {profileCID ? (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${profileCID}`}
                      target="_blank" rel="noreferrer"
                      className="dd-btn dd-btn--view dd-btn--sm"
                    >
                      📋 Open Patient Health Profile ↗
                    </a>
                  ) : (
                    <p className="dd-emergency-none">No health profile uploaded by this patient.</p>
                  )}
                </div>
                <button
                  className="dd-btn dd-btn--ghost dd-btn--sm"
                  onClick={() => { setEmergencyPatient(null); setPatientRecords([]); setProfileCID(null); }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="dd-warning">
              <span className="dd-warning-icon">⚠</span>
              Only use in critical situations. All activations are publicly auditable.
            </div>
          </div>

          {/* ── Single Record Lookup ── */}
          <div className="dd-card">
            <div className="dd-card-title">View Record by ID</div>
            <div className="dd-card-desc" style={{ marginBottom: 16 }}>
              Enter a specific record ID (bytes32) to view a single record directly.
            </div>

            <div className="dd-field">
              <label className="dd-label">Record ID</label>
              <div className="dd-input-row">
                <input
                  className="dd-input"
                  type="text"
                  placeholder="0x..."
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleViewRecord()}
                />
                <button
                  className="dd-qr-btn"
                  type="button"
                  onClick={() => setQrTarget("record")}
                  title="Scan record ID QR"
                >
                  <QRIcon />
                </button>
              </div>
            </div>

            <button
              className="dd-btn dd-btn--green"
              onClick={handleViewRecord}
              disabled={!recordId.trim() || viewLoading}
            >
              {viewLoading ? <><span className="dd-spinner" /> Fetching...</> : "View Record"}
            </button>

            {viewingRecord && (
              <div className="dd-result">
                <div className="dd-result-row">
                  <span className="dd-result-key">Title</span>
                  <span className="dd-result-val">{viewingRecord.title || `#${viewingRecord.id.slice(0, 10)}…`}</span>
                </div>
                <div className="dd-result-row">
                  <span className="dd-result-key">Patient</span>
                  <span className="dd-result-val dd-result-val--mono">{shortAddr(viewingRecord.patient)}</span>
                </div>
                <div className="dd-result-row">
                  <span className="dd-result-key">Uploaded</span>
                  <span className="dd-result-val">{viewingRecord.timestamp}</span>
                </div>
                <div className="dd-result-actions">
                  <button
                    className="dd-btn dd-btn--outline"
                    onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${viewingRecord.recordCID}`, "_blank")}
                  >
                    View PDF on IPFS ↗
                  </button>
                  {viewingRecord.prescriptionCID && (
                    <button
                      className="dd-btn dd-btn--outline-purple"
                      onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${viewingRecord.prescriptionCID}`, "_blank")}
                    >
                      View Prescription ↗
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Patient Records List (after emergency access) ── */}
        {emergencyPatient && (
          <div className="dd-card">
            <div className="dd-card-header">
              <div>
                <div className="dd-card-title">
                  Patient Records
                  <span className="dd-records-patient-badge">{shortAddr(emergencyPatient)}</span>
                </div>
                <div className="dd-card-desc">
                  All medical records accessible during your emergency window.
                </div>
              </div>
              <span className="dd-records-count">
                {recordsLoading ? "Loading…" : `${patientRecords.length} record${patientRecords.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {recordsLoading ? (
              <div className="dd-records-loading">
                <span className="dd-spinner" /> Loading records…
              </div>
            ) : patientRecords.length === 0 ? (
              <div className="dd-records-empty">No records found for this patient.</div>
            ) : (
              <div className="dd-records-list">
                {patientRecords.map((rec) => (
                  <div key={rec.id} className="dd-record-item">
                    <div className="dd-record-item-left">
                      <span className={recordTypeBadgeClass(rec.recordType)}>
                        {recordTypeLabel(rec.recordType)}
                      </span>
                      <div className="dd-record-item-info">
                        <span className="dd-record-item-title">{rec.title}</span>
                        <span className="dd-record-item-meta">
                          Uploaded by {shortAddr(rec.uploader)} · {rec.timestamp}
                        </span>
                      </div>
                    </div>
                    <div className="dd-record-item-actions">
                      <button
                        className="dd-btn dd-btn--outline dd-btn--sm"
                        onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${rec.recordCID}`, "_blank")}
                      >
                        View PDF ↗
                      </button>
                      {rec.prescriptionCID && (
                        <button
                          className="dd-btn dd-btn--outline-purple dd-btn--sm"
                          onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${rec.prescriptionCID}`, "_blank")}
                        >
                          Prescription ↗
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <MedicalRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(cid) => console.log("Record uploaded, CID:", cid)}
      />

      {/* One modal handles both fields via qrTarget */}
      <QRScannerModal
        isOpen={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        onScan={handleQRScan}
        title={qrTarget === "emergency" ? "Scan Patient Wallet QR" : "Scan Record ID QR"}
      />
    </Layout>
  );
}
