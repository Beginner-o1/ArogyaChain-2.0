import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import QRScannerModal from "../components/QRScannerModal";
import { uploadFile } from "../services/api";
import { handleError, convertToBytes32 } from "../utils/helpers";
import "../styling/DoctorDashboard.css";
import "../styling/QRScannerModal.css";

interface UploadHistoryItem {
  patient:   string;
  fileName:  string;
  cid:       string;
  timestamp: string;
}

const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export default function ScanDashboard() {
  const { contract, account } = useAuth();

  const [patientAddress, setPatientAddress] = useState("");
  const [scanTitle,      setScanTitle]      = useState("");
  const [scanFile,       setScanFile]       = useState<File | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [qrOpen,         setQrOpen]         = useState(false);
  const [dragOver,       setDragOver]       = useState(false);
  const [uploadHistory,  setUploadHistory]  = useState<UploadHistoryItem[]>([]);

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "—";

  // ── File selection ──
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setScanFile(file);
    // Auto-fill title from filename if empty
    if (!scanTitle.trim()) {
      setScanTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // ── Upload ──
  const handleUploadScan = async () => {
    if (!contract || !patientAddress.trim() || !scanFile || !scanTitle.trim()) {
      alert("Please fill all required fields and select a file.");
      return;
    }

    try {
      setUploading(true);

      // Upload to IPFS
      const response = await uploadFile(scanFile);

      // Write to blockchain
      const tx = await contract.addScanRecord(
        patientAddress.trim(),
        scanTitle.trim(),
        response.cid,
        convertToBytes32(response.hash)
      );
      await tx.wait();

      // Add to session history
      setUploadHistory(prev => [{
        patient:   patientAddress.trim(),
        fileName:  scanFile.name,
        cid:       response.cid,
        timestamp: new Date().toLocaleString(),
      }, ...prev]);

      // Reset form
      setPatientAddress("");
      setScanTitle("");
      setScanFile(null);

    } catch (error) {
      alert(handleError(error));
    } finally {
      setUploading(false);
    }
  };

  const canUpload = !!patientAddress.trim() && !!scanTitle.trim() && !!scanFile && !uploading;

  return (
    <Layout title="Scan Center Dashboard">
      <div className="dd-root">

        {/* ── Stat Cards ── */}
        <div className="dd-stats">
          <div className="dd-stat dd-stat--blue">
            <div className="dd-stat-accent" />
            <div className="dd-stat-label">Role</div>
            <div className="dd-stat-value">Scan Center</div>
            <div className="dd-stat-sub">Diagnostic imaging</div>
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
          <div className="dd-stat dd-stat--green">
            <div className="dd-stat-accent" />
            <div className="dd-stat-label">Uploads This Session</div>
            <div className="dd-stat-value dd-stat-value--green">{uploadHistory.length}</div>
            <div className="dd-stat-sub">Since last login</div>
          </div>
        </div>

        {/* ── Upload Scan ── */}
        <div className="dd-card">
          <div className="dd-card-header">
            <div>
              <div className="dd-card-title">Upload Diagnostic Scan</div>
              <div className="dd-card-desc">
                Upload X-rays, MRI, CT scans or ultrasounds directly to IPFS
                and record them on-chain. Patient must have granted you upload permission.
              </div>
            </div>
          </div>

          <div className="dd-grid-2" style={{ marginTop: 20 }}>

            {/* Left — Patient + Title inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Patient Address */}
              <div className="dd-field">
                <label className="dd-label">
                  Patient Wallet Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className="dd-input-row">
                  <input
                    className="dd-input"
                    type="text"
                    placeholder="0x..."
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                  />
                  <button
                    className="dd-qr-btn"
                    type="button"
                    onClick={() => setQrOpen(true)}
                    title="Scan patient wallet QR"
                  >
                    <QRIcon />
                  </button>
                </div>
                {patientAddress.startsWith("0x") && patientAddress.length === 42 && (
                  <div className="dd-address-chip">
                    <span className="dd-address-chip-dot" />
                    {patientAddress.slice(0, 10)}...{patientAddress.slice(-6)}
                  </div>
                )}
              </div>

              {/* Scan Title */}
              <div className="dd-field">
                <label className="dd-label">
                  Scan Title <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  className="dd-input"
                  type="text"
                  placeholder="e.g. Chest X-Ray, Brain MRI, Abdominal CT"
                  value={scanTitle}
                  onChange={(e) => setScanTitle(e.target.value)}
                />
              </div>

              {/* Warning */}
              <div className="dd-warning">
                <span className="dd-warning-icon">⚠</span>
                Patient must have granted this center upload permission via their dashboard.
              </div>

            </div>

            {/* Right — File drop zone */}
            <div className="dd-field">
              <label className="dd-label">
                Scan File <span style={{ color: "#ef4444" }}>*</span>
                <span style={{ marginLeft: 6, fontWeight: 400, fontSize: 11, color: "#6b7280" }}>
                  PNG, JPG, PDF, DICOM
                </span>
              </label>

              {!scanFile ? (
                <div
                  className={`dd-dropzone ${dragOver ? "dd-dropzone--active" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("scan-file-input")?.click()}
                >
                  <div className="dd-dropzone-icon" style={{ color: "#6b7280" }}>
                    <UploadIcon />
                  </div>
                  <p className="dd-dropzone-text">
                    Drag & drop or <span className="dd-dropzone-link">browse file</span>
                  </p>
                  <p className="dd-dropzone-hint">PNG, JPG, PDF, DICOM — up to 50MB</p>
                  <input
                    id="scan-file-input"
                    type="file"
                    style={{ display: "none" }}
                    accept="image/*,.pdf,.dcm"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div className="dd-file-preview">
                  <div className="dd-file-preview-icon">📄</div>
                  <div className="dd-file-preview-info">
                    <p className="dd-file-preview-name">{scanFile.name}</p>
                    <p className="dd-file-preview-size">
                      {(scanFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    className="dd-file-preview-remove"
                    onClick={() => setScanFile(null)}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Upload Button */}
          <button
            className="dd-btn dd-btn--primary"
            style={{ marginTop: 20, width: "100%" }}
            onClick={handleUploadScan}
            disabled={!canUpload}
          >
            {uploading
              ? <><span className="dd-spinner" /> Uploading to blockchain...</>
              : "Upload Scan Record"
            }
          </button>
        </div>

        {/* ── Upload History (session only) ── */}
        <div className="dd-card">
          <div className="dd-card-header">
            <div className="dd-card-title">
              Recent Uploads
              <span style={{
                marginLeft: 10,
                fontSize: 12,
                fontWeight: 400,
                color: "#6b7280",
              }}>
                This session only
              </span>
            </div>
          </div>

          {uploadHistory.length === 0 ? (
            <div className="dd-records-empty" style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🔬</div>
              <p style={{ color: "#6b7280", fontSize: 13 }}>No uploads yet this session.</p>
            </div>
          ) : (
            <div className="dd-records-list">
              {uploadHistory.map((item, i) => (
                <div key={i} className="dd-record-item">
                  <div className="dd-record-item-left">
                    <span className="dd-badge dd-badge--purple">Scan Record</span>
                    <div className="dd-record-item-info">
                      <span className="dd-record-item-title">{item.fileName}</span>
                      <span className="dd-record-item-meta">
                        Patient: {shortAddr(item.patient)} · {item.timestamp}
                      </span>
                    </div>
                  </div>
                  <div className="dd-record-item-actions">
                    <button
                      className="dd-btn dd-btn--outline dd-btn--sm"
                      onClick={() => window.open(
                        `https://gateway.pinata.cloud/ipfs/${item.cid}`,
                        "_blank"
                      )}
                    >
                      View on IPFS ↗
                    </button>
                    <span style={{
                      fontSize: 11,
                      color: "#16a34a",
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontWeight: 600,
                    }}>
                      ✓ On-chain
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <QRScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={(address) => { setPatientAddress(address); setQrOpen(false); }}
        title="Scan Patient Wallet QR"
      />
    </Layout>
  );
}
