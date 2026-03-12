import { useState } from "react";
import { formatAddress, formatDate, handleError } from "../../utils/helpers";
import QRScannerModal from "../QRScannerModal";

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

const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

export default function MyRecords({ records, loading, contract, onRecordDeleted }: MyRecordsProps) {
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
  const [grantAddress,   setGrantAddress]   = useState("");
  const [qrOpen,         setQrOpen]         = useState(false);

  const viewOnIPFS = (cid: string) =>
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, "_blank");

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
      onRecordDeleted();
    } catch (error) { alert(handleError(error)); }
  };

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                    <button
                      className="qr-scan-btn"
                      onClick={() => setQrOpen(true)}
                      title="Scan QR code"
                    >
                      <QRIcon />
                    </button>
                    <button className="pd-btn pd-btn--grant"  onClick={grantRecordAccess}>Grant</button>
                    <button className="pd-btn pd-btn--cancel" onClick={() => setSelectedRecord(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <QRScannerModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={(address) => { setGrantAddress(address); setQrOpen(false); }}
        title="Scan Doctor QR Code"
      />
    </>
  );
}
