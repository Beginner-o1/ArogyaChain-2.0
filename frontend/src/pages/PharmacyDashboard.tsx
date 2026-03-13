import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import QRScannerModal from "../components/QRScannerModal";
import { handleError } from "../utils/helpers";
import "../styling/PharmacyDashboard.css";
import "../styling/QRScannerModal.css";

const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

export default function PharmacyDashboard() {
  const { contract, account } = useAuth();

  const [recordId,     setRecordId]     = useState("");
  const [prescription, setPrescription] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [qrOpen,       setQrOpen]       = useState(false);

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

  const viewPrescription = async () => {
    if (!contract || !recordId.trim()) {
      setError("Please enter a record ID.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setPrescription(null);

      const cid = await contract.viewPrescription(recordId.trim());
      if (!cid || cid === "") {
        setError("No prescription found for this record.");
        return;
      }
      setPrescription(cid);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Pharmacy Dashboard">
      <div className="phd-root">

        {/* ── Stat Cards ── */}
        <div className="phd-stats">
          <div className="phd-stat phd-stat--amber">
            <div className="phd-stat-accent" />
            <div className="phd-stat-label">Role</div>
            <div className="phd-stat-value">Pharmacy</div>
            <div className="phd-stat-sub">Licensed dispenser</div>
          </div>
          <div className="phd-stat phd-stat--green">
            <div className="phd-stat-accent" />
            <div className="phd-stat-label">Status</div>
            <div className="phd-stat-value phd-stat-value--green">Active</div>
            <div className="phd-stat-sub">Verified on-chain</div>
          </div>
          <div className="phd-stat phd-stat--blue">
            <div className="phd-stat-accent" />
            <div className="phd-stat-label">Wallet</div>
            <div className="phd-stat-value" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 14, color: "#94a3b8" }}>
              {shortAddr(account || "")}
            </div>
            <div className="phd-stat-sub">Connected via MetaMask</div>
          </div>
        </div>

        {/* ── View Prescription ── */}
        <div className="phd-card">
          <div className="phd-card-title">View Patient Prescription</div>
          <div className="phd-card-desc">
            Retrieve a prescription from the blockchain for a patient who has granted you access.
          </div>

          <div className="phd-notice">
            <span className="phd-notice-icon">ℹ</span>
            You can only view prescriptions for records where the patient has explicitly granted you access.
            All access is logged on-chain.
          </div>

          <div className="phd-field">
            <label className="phd-label">Medical Record ID</label>
            <div className="phd-input-row">
              <input
                type="text"
                value={recordId}
                onChange={(e) => {
                  setRecordId(e.target.value);
                  setError(null);
                  setPrescription(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && viewPrescription()}
                placeholder="0x... (bytes32 record ID)"
                className="phd-input"
              />
              <button
                className="phd-qr-btn"
                type="button"
                onClick={() => setQrOpen(true)}
                title="Scan record QR code"
              >
                <QRIcon />
              </button>
            </div>
            <span className="phd-label-hint">
              The patient must have granted you prescription access for this record
            </span>
          </div>

          <button
            className="phd-btn phd-btn--blue"
            onClick={viewPrescription}
            disabled={loading || !recordId.trim()}
          >
            {loading
              ? <><span className="phd-spinner" /> Loading...</>
              : "View Prescription"
            }
          </button>

          {/* Error */}
          {error && (
            <div className="phd-error">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Success */}
          {prescription && (
            <div className="phd-result">
              <div className="phd-result-header">
                <div className="phd-result-icon">✓</div>
                <div>
                  <div className="phd-result-title">Prescription Found</div>
                  <div className="phd-result-sub">Record ID: {recordId.slice(0, 10)}...{recordId.slice(-6)}</div>
                </div>
              </div>

              <div className="phd-cid-box">
                <div className="phd-cid-label">IPFS CID</div>
                <div className="phd-cid-value">{prescription}</div>
              </div>

              <button
                className="phd-btn phd-btn--green"
                onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${prescription}`, "_blank")}
              >
                Open Prescription on IPFS ↗
              </button>
            </div>
          )}
        </div>

        {/* ── How to Access ── */}
        <div className="phd-card">
          <div className="phd-card-title">How to Access Prescriptions</div>
          <div className="phd-steps">
            <div className="phd-step">
              <div className="phd-step-num">1</div>
              <div>
                <div className="phd-step-title">Patient Grants Access</div>
                <div className="phd-step-desc">
                  The patient grants you prescription access for a specific record through their dashboard under "My Records → Share".
                </div>
              </div>
            </div>
            <div className="phd-step">
              <div className="phd-step-num">2</div>
              <div>
                <div className="phd-step-title">Get the Record ID</div>
                <div className="phd-step-desc">
                  The patient shares their record ID with you — either by typing it or by showing you the QR code from their dashboard, which you can scan directly.
                </div>
              </div>
            </div>
            <div className="phd-step">
              <div className="phd-step-num">3</div>
              <div>
                <div className="phd-step-title">View Prescription</div>
                <div className="phd-step-desc">
                  Enter or scan the record ID above and click "View Prescription" to retrieve and open the prescription PDF from IPFS.
                </div>
              </div>
            </div>
          </div>

          <div className="phd-privacy">
            <span className="phd-privacy-icon">⚠</span>
            Privacy Notice: You can only access prescriptions patients have explicitly granted you. All access attempts are permanently logged on the blockchain.
          </div>
        </div>

      </div>

      <QRScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={(value) => {
          setRecordId(value);
          setError(null);
          setPrescription(null);
          setQrOpen(false);
        }}
        title="Scan Record QR Code"
      />
    </Layout>
  );
}
