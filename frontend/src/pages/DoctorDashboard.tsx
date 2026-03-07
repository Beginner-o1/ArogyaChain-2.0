import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MedicalRecordDrawer from "../components/MedicalRecordDrawer";
import { handleError } from "../utils/helpers";
import "../styling/DoctorDashboard.css";

export default function DoctorDashboard() {
  const { contract, account } = useAuth();

  const [drawerOpen,       setDrawerOpen]       = useState(false);
  const [recordId,         setRecordId]         = useState("");
  const [viewingRecord,    setViewingRecord]    = useState<any>(null);
  const [viewLoading,      setViewLoading]      = useState(false);
  const [emergencyId,      setEmergencyId]      = useState("");
  const [emergencyLoading, setEmergencyLoading] = useState(false);

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

  const activateEmergencyAccess = async () => {
    if (!contract || !emergencyId.trim()) return;
    try {
      setEmergencyLoading(true);
      const tx = await contract.activateEmergencyAccess(emergencyId);
      await tx.wait();
      alert("Emergency access activated for 1 hour!");
      setEmergencyId("");
    } catch (error) {
      alert(handleError(error));
    } finally {
      setEmergencyLoading(false);
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
            <span>+</span>
            Create Medical Record
          </button>
        </div>

        {/* ── View + Emergency ── */}
        <div className="dd-grid-2">

          {/* View Record */}
          <div className="dd-card">
            <div className="dd-card-title">View Patient Record</div>
            <div className="dd-field">
              <label className="dd-label">Record ID</label>
              <input
                className="dd-input"
                type="text"
                placeholder="e.g. 42"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleViewRecord()}
              />
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
                  <span className="dd-result-key">Record ID</span>
                  <span className="dd-result-val">#{viewingRecord.id}</span>
                </div>
                {viewingRecord.title && (
                  <div className="dd-result-row">
                    <span className="dd-result-key">Title</span>
                    <span className="dd-result-val">{viewingRecord.title}</span>
                  </div>
                )}
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

          {/* Emergency Access */}
          <div className="dd-card">
            <div className="dd-card-title">Emergency Access</div>
            <div className="dd-card-desc" style={{ marginBottom: 16 }}>
              Activate temporary access to a patient record without prior permission.
              Expires after <strong>1 hour</strong> and is permanently logged on-chain.
            </div>
            <div className="dd-field">
              <label className="dd-label">Record ID</label>
              <input
                className="dd-input"
                type="text"
                placeholder="e.g. 42"
                value={emergencyId}
                onChange={(e) => setEmergencyId(e.target.value)}
              />
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
            <div className="dd-warning">
              <span className="dd-warning-icon">⚠</span>
              Only use in critical situations. All activations are publicly auditable.
            </div>
          </div>

        </div>
      </div>

      <MedicalRecordDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={(cid) => console.log("Record uploaded, CID:", cid)}
      />
    </Layout>
  );
}
