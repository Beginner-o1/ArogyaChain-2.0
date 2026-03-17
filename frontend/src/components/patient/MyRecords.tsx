import { useState } from "react";
import { formatAddress, formatDate, handleError } from "../../utils/helpers";
import QRScannerModal from "../QRScannerModal";
import RecordQRModal  from "../RecordQRModal";

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

interface MyRecordsProps {
  records: MedicalRecord[];
  loading: boolean;
  contract: any;
  onRecordDeleted: () => void;
}

// Which inline panel is open for a given record
type ActivePanel = "share" | "rx" | null;

const QRIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

export default function MyRecords({
  records,
  loading,
  contract,
  onRecordDeleted,
}: MyRecordsProps) {

  // ── Share (doctor record access) state ──
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
  const [activePanel,    setActivePanel]    = useState<ActivePanel>(null);
  const [grantAddress,   setGrantAddress]   = useState("");
  const [scanQrOpen,     setScanQrOpen]     = useState(false);
  const [granting,       setGranting]       = useState(false);
  const [deleting,       setDeleting]       = useState<number | null>(null);

  // ── Prescription (pharmacy) state ──
  const [pharmacyAddress,  setPharmacyAddress]  = useState("");
  const [rxQrOpen,         setRxQrOpen]         = useState(false);
  const [rxGranting,       setRxGranting]       = useState(false);
  const [rxRevoking,       setRxRevoking]       = useState(false);

  // ── Record QR display modal ──
  const [qrRecord, setQrRecord] = useState<{ id: string; title: string } | null>(null);

  // ── Helpers ──
  const viewOnIPFS = (cid: string) =>
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, "_blank");

  const openPanel = (recordId: number, panel: ActivePanel) => {
    if (selectedRecord === recordId && activePanel === panel) {
      // toggle off
      setSelectedRecord(null);
      setActivePanel(null);
      setGrantAddress("");
      setPharmacyAddress("");
    } else {
      setSelectedRecord(recordId);
      setActivePanel(panel);
      setGrantAddress("");
      setPharmacyAddress("");
    }
  };

  const closePanel = () => {
    setSelectedRecord(null);
    setActivePanel(null);
    setGrantAddress("");
    setPharmacyAddress("");
  };

  // ── Grant doctor record access ──
  const grantRecordAccess = async () => {
    if (!contract || selectedRecord === null || !grantAddress.trim()) return;
    try {
      setGranting(true);
      const tx = await contract.grantRecordAccess(selectedRecord, grantAddress.trim());
      await tx.wait();
      alert("Record access granted!");
      closePanel();
    } catch (error) {
      alert(handleError(error));
    } finally {
      setGranting(false);
    }
  };

  // ── Grant pharmacy prescription access ──
  const grantPrescriptionAccess = async () => {
    if (!contract || selectedRecord === null || !pharmacyAddress.trim()) return;
    try {
      setRxGranting(true);
      const tx = await contract.grantPrescriptionAccess(
        selectedRecord,
        pharmacyAddress.trim()
      );
      await tx.wait();
      alert("Pharmacy prescription access granted!");
      closePanel();
    } catch (error) {
      alert(handleError(error));
    } finally {
      setRxGranting(false);
    }
  };

  // ── Revoke pharmacy prescription access ──
  const revokePrescriptionAccess = async () => {
    if (!contract || selectedRecord === null || !pharmacyAddress.trim()) return;
    try {
      setRxRevoking(true);
      const tx = await contract.revokePrescriptionAccess(
        selectedRecord,
        pharmacyAddress.trim()
      );
      await tx.wait();
      alert("Pharmacy prescription access revoked!");
      closePanel();
    } catch (error) {
      alert(handleError(error));
    } finally {
      setRxRevoking(false);
    }
  };

  // ── Delete record ──
  const deleteRecord = async (recordId: number) => {
    if (!contract || !confirm("Are you sure you want to delete this record?")) return;
    try {
      setDeleting(recordId);
      const tx = await contract.deleteRecord(recordId);
      await tx.wait();
      onRecordDeleted();
    } catch (error) {
      alert(handleError(error));
    } finally {
      setDeleting(null);
    }
  };

  // ── Loading / empty states ──
  if (loading) {
    return (
      <div className="pd-card">
        <div className="pd-loading">
          <div className="pd-spinner" />
          <p>Loading records...</p>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="pd-card">
        <p className="pd-card-title">Medical Records</p>
        <div className="pd-empty">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No records yet</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pd-card">
        <p className="pd-card-title">Medical Records</p>
        <div className="pd-records-list">
          {records.map((record) => {
            const hasPrescription = !!record.prescriptionCID;
            const isShareOpen = selectedRecord === record.id && activePanel === "share";
            const isRxOpen    = selectedRecord === record.id && activePanel === "rx";

            return (
              <div key={record.id} className="pd-record-item">

                {/* ── Record row ── */}
                <div className="pd-record-header">
                  <div className="pd-record-meta">
                    <div className="pd-record-badges">
                      <span className={`pd-badge ${record.recordType === 0 ? "pd-badge--green" : "pd-badge--purple"}`}>
                        {record.recordType === 0 ? "Medical Record" : "Scan Record"}
                      </span>

                      {/* Prescription badge — only when prescriptionCID exists */}
                      {hasPrescription && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#16a34a",
                            background: "#f0fdf4",
                            border: "1px solid #86efac",
                            borderRadius: 4,
                            padding: "2px 7px",
                          }}
                        >
                          ℞ Prescription
                        </span>
                      )}

                      <span className="pd-record-id">
                        ID: {String(record.id).length > 16
                          ? `${String(record.id).slice(0, 10)}...${String(record.id).slice(-6)}`
                          : record.id}
                      </span>
                    </div>

                    <p className="pd-record-info">
                      <span>Uploaded by:</span> {formatAddress(record.uploader)}
                    </p>
                    <p className="pd-record-info">
                      <span>Date:</span> {formatDate(record.timestamp)}
                    </p>
                  </div>

                  {/* ── Action buttons ── */}
                  <div className="pd-record-actions">
                    <button
                      className="pd-btn pd-btn--view"
                      onClick={() => viewOnIPFS(record.recordCID)}
                    >
                      View
                    </button>

                    <button
                      className={`pd-btn pd-btn--share ${isShareOpen ? "pd-btn--active" : ""}`}
                      onClick={() => openPanel(record.id, "share")}
                    >
                      Share
                    </button>

                    {/* Rx button — only shown when prescription exists */}
                    {hasPrescription && (
                      <button
                        className={`pd-btn pd-btn--rx ${isRxOpen ? "pd-btn--active" : ""}`}
                        onClick={() => openPanel(record.id, "rx")}
                        title="Manage pharmacy prescription access"
                        style={{
                          background: isRxOpen ? "#16a34a" : "#f0fdf4",
                          color: isRxOpen ? "#fff" : "#16a34a",
                          border: "1px solid #86efac",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ℞ Pharmacy
                      </button>
                    )}

                    <button
                      className="pd-btn pd-btn--qr-id"
                      onClick={() => setQrRecord({
                        id:    String(record.id),
                        title: record.recordType === 0 ? "Medical Record" : "Scan Record",
                      })}
                      title="Show Record ID as QR"
                    >
                      <QRIcon />
                      QR
                    </button>

                    <button
                      className="pd-btn pd-btn--delete"
                      onClick={() => deleteRecord(record.id)}
                      disabled={deleting === record.id}
                    >
                      {deleting === record.id
                        ? <><span className="pd-spinner pd-spinner--sm" /> Deleting…</>
                        : "Delete"
                      }
                    </button>
                  </div>
                </div>

                {/* ── Share / Grant doctor access panel ── */}
                {isShareOpen && (
                  <div className="pd-share-form">
                    <p className="pd-share-label">Grant record access to doctor:</p>
                    <div className="pd-share-row">
                      <div className="pd-share-input-wrap">
                        <input
                          type="text"
                          value={grantAddress}
                          onChange={(e) => setGrantAddress(e.target.value)}
                          placeholder="Doctor's wallet address"
                          className="pd-input"
                        />
                        <button
                          className="pd-qr-btn"
                          onClick={() => setScanQrOpen(true)}
                          title="Scan QR code"
                          type="button"
                        >
                          <QRIcon />
                        </button>
                      </div>
                      <div className="pd-share-actions">
                        <button
                          className="pd-btn pd-btn--grant"
                          onClick={grantRecordAccess}
                          disabled={!grantAddress.trim() || granting}
                        >
                          {granting
                            ? <><span className="pd-spinner pd-spinner--sm" /> Granting…</>
                            : "Grant"
                          }
                        </button>
                        <button className="pd-btn pd-btn--cancel" onClick={closePanel}>
                          Cancel
                        </button>
                      </div>
                    </div>
                    {grantAddress.startsWith("0x") && grantAddress.length === 42 && (
                      <div className="pd-address-chip">
                        <span className="pd-address-chip-dot" />
                        {grantAddress.slice(0, 10)}...{grantAddress.slice(-6)}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Pharmacy prescription access panel ── */}
                {isRxOpen && (
                  <div className="pd-share-form" style={{ borderTop: "2px solid #86efac" }}>
                    <p className="pd-share-label" style={{ color: "#16a34a" }}>
                      ℞ Manage pharmacy access to prescription:
                    </p>
                    <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                      The pharmacy will only see the prescription slip — not the full medical record.
                    </p>
                    <div className="pd-share-row">
                      <div className="pd-share-input-wrap">
                        <input
                          type="text"
                          value={pharmacyAddress}
                          onChange={(e) => setPharmacyAddress(e.target.value)}
                          placeholder="Pharmacy's wallet address"
                          className="pd-input"
                        />
                        <button
                          className="pd-qr-btn"
                          onClick={() => setRxQrOpen(true)}
                          title="Scan pharmacy QR code"
                          type="button"
                        >
                          <QRIcon />
                        </button>
                      </div>

                      {/* Grant + Revoke side by side */}
                      <div className="pd-share-actions">
                        <button
                          className="pd-btn pd-btn--grant"
                          onClick={grantPrescriptionAccess}
                          disabled={!pharmacyAddress.trim() || rxGranting || rxRevoking}
                          style={{ background: "#16a34a", borderColor: "#16a34a" }}
                        >
                          {rxGranting
                            ? <><span className="pd-spinner pd-spinner--sm" /> Granting…</>
                            : "Grant"
                          }
                        </button>
                        <button
                          className="pd-btn pd-btn--delete"
                          onClick={revokePrescriptionAccess}
                          disabled={!pharmacyAddress.trim() || rxRevoking || rxGranting}
                        >
                          {rxRevoking
                            ? <><span className="pd-spinner pd-spinner--sm" /> Revoking…</>
                            : "Revoke"
                          }
                        </button>
                        <button className="pd-btn pd-btn--cancel" onClick={closePanel}>
                          Cancel
                        </button>
                      </div>
                    </div>

                    {pharmacyAddress.startsWith("0x") && pharmacyAddress.length === 42 && (
                      <div className="pd-address-chip">
                        <span className="pd-address-chip-dot" />
                        {pharmacyAddress.slice(0, 10)}...{pharmacyAddress.slice(-6)}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Scanner modal — doctor share */}
      <QRScannerModal
        isOpen={scanQrOpen}
        onClose={() => setScanQrOpen(false)}
        onScan={(address) => { setGrantAddress(address); setScanQrOpen(false); }}
        title="Scan Doctor QR Code"
      />

      {/* Scanner modal — pharmacy rx */}
      <QRScannerModal
        isOpen={rxQrOpen}
        onClose={() => setRxQrOpen(false)}
        onScan={(address) => { setPharmacyAddress(address); setRxQrOpen(false); }}
        title="Scan Pharmacy QR Code"
      />

      {/* Display modal — shows record ID as QR */}
      <RecordQRModal
        isOpen={qrRecord !== null}
        onClose={() => setQrRecord(null)}
        recordId={qrRecord?.id ?? ""}
        title={`${qrRecord?.title ?? "Record"} — QR Code`}
      />
    </>
  );
}
