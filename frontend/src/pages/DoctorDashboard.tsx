import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MedicalRecordDrawer from "../components/MedicalRecordDrawer";
import QRScannerModal from "../components/QRScannerModal";
import { handleError } from "../utils/helpers";
import "../styling/DoctorDashboard.css";
import "../styling/QRScannerModal.css";

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

  /* ── Single Record Lookup ── */
  const [recordId,         setRecordId]         = useState("");
  const [viewingRecord,    setViewingRecord]     = useState<any>(null);
  const [viewLoading,      setViewLoading]       = useState(false);

  /* ── QR handler ── */
  const handleQRScan = (value: string) => {
    if (qrTarget === "emergency") setEmergencyId(value);
    if (qrTarget === "record")    setRecordId(value);
    setQrTarget(null);
  };

  /* ── Emergency Access ── */
  // Activates 1-hour emergency access and fetches the patient's health profile.
  // Medical records are intentionally NOT auto-fetched — the doctor must request
  // specific records via the View Record by ID section using record IDs shared
  // by the patient or retrieved from the health profile.
  const activateEmergencyAccess = async () => {
    if (!contract || !emergencyId.trim()) return;
    try {
      setEmergencyLoading(true);
      setEmergencyPatient(null);
      setProfileCID(null);

      const tx = await contract.activateEmergencyAccess(emergencyId.trim());
      await tx.wait();

      const patientAddress = emergencyId.trim();
      setEmergencyPatient(patientAddress);
      setEmergencyId("");

      // Fetch health profile — may not exist (E14)
      try {
        const [cid] = await contract.getPatientProfileCID(patientAddress);
        setProfileCID(cid || null);
      } catch { /* no profile uploaded */ }

    } catch (error) {
      alert(handleError(error));
    } finally {
      setEmergencyLoading(false);
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

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

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
              Activate temporary access to the patient's{" "}
              <strong>health profile</strong>. Expires after{" "}
              <strong>1 hour</strong> and is permanently logged on-chain.
              Use <strong>View Record by ID</strong> to access specific records.
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

            {/* ── Emergency Result — profile only ── */}
            {emergencyPatient && (
              <div className="dd-emergency-result">
                <div className="dd-emergency-result-header">
                  <span className="dd-emergency-badge">⚡ Emergency Access Active — 1 Hour</span>
                  <span className="dd-emergency-patient">
                    Patient: {shortAddr(emergencyPatient)}
                  </span>
                </div>

                {/* Health Profile */}
                <div className="dd-emergency-section">
                  <p className="dd-emergency-section-label">Health Profile</p>
                  {profileCID ? (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${profileCID}`}
                      target="_blank"
                      rel="noreferrer"
                      className="dd-btn dd-btn--view dd-btn--sm"
                    >
                      📋 Open Patient Health Profile ↗
                    </a>
                  ) : (
                    <p className="dd-emergency-none">
                      No health profile uploaded by this patient.
                    </p>
                  )}
                </div>

                {/* Guidance note */}
                <div className="dd-emergency-section">
                  <p className="dd-emergency-section-label">Medical Records</p>
                  <p className="dd-emergency-note">
                    Use the <strong>View Record by ID</strong> panel to access
                    individual records. Ask the patient or scan their record QR codes.
                    Emergency access is valid for <strong>1 hour</strong>.
                  </p>
                </div>

                <button
                  className="dd-btn dd-btn--ghost dd-btn--sm"
                  onClick={() => {
                    setEmergencyPatient(null);
                    setProfileCID(null);
                  }}
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
              Enter a record ID or scan the patient's record QR code to view a
              specific record. Works with both normal and emergency access.
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
              {viewLoading
                ? <><span className="dd-spinner" /> Fetching...</>
                : "View Record"
              }
            </button>

            {viewingRecord && (
              <div className="dd-result">
                <div className="dd-result-row">
                  <span className="dd-result-key">Title</span>
                  <span className="dd-result-val">
                    {viewingRecord.title || `#${viewingRecord.id.slice(0, 10)}…`}
                  </span>
                </div>
                <div className="dd-result-row">
                  <span className="dd-result-key">Patient</span>
                  <span className="dd-result-val dd-result-val--mono">
                    {shortAddr(viewingRecord.patient)}
                  </span>
                </div>
                <div className="dd-result-row">
                  <span className="dd-result-key">Uploader</span>
                  <span className="dd-result-val dd-result-val--mono">
                    {shortAddr(viewingRecord.uploader)}
                  </span>
                </div>
                <div className="dd-result-row">
                  <span className="dd-result-key">Date</span>
                  <span className="dd-result-val">{viewingRecord.timestamp}</span>
                </div>
                <div className="dd-result-actions">
                  <button
                    className="dd-btn dd-btn--outline"
                    onClick={() => window.open(
                      `https://gateway.pinata.cloud/ipfs/${viewingRecord.recordCID}`,
                      "_blank"
                    )}
                  >
                    View PDF on IPFS ↗
                  </button>
                  {viewingRecord.prescriptionCID && (
                    <button
                      className="dd-btn dd-btn--outline-purple"
                      onClick={() => window.open(
                        `https://gateway.pinata.cloud/ipfs/${viewingRecord.prescriptionCID}`,
                        "_blank"
                      )}
                    >
                      View Prescription ↗
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      <MedicalRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(cid) => console.log("Record uploaded, CID:", cid)}
      />

      <QRScannerModal
        isOpen={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        onScan={handleQRScan}
        title={qrTarget === "emergency" ? "Scan Patient Wallet QR" : "Scan Record ID QR"}
      />
    </Layout>
  );
}
