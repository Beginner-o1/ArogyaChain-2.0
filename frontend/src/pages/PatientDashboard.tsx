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

export default function PatientDashboard() {
  const { contract } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorAddress, setDoctorAddress] = useState("");
  const [scanAddress, setScanAddress] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);
  const [grantAddress, setGrantAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"records" | "permissions">("records");

  useEffect(() => {
    loadRecords();
  }, [contract]);

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
              id: Number(id),
              patient: record.patient,
              uploader: record.uploader,
              uploaderRole: Number(record.uploaderRole),
              recordType: Number(record.recordType),
              recordCID: record.recordCID,
              recordHash: record.recordHash,
              prescriptionCID: record.prescriptionCID,
              timestamp: Number(record.timestamp),
              isDeleted: record.isDeleted,
            };
          } catch {
            return null;
          }
        })
      );
      setRecords(recordsData.filter((r): r is MedicalRecord => r !== null && !r.isDeleted));
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  const grantDoctorUpload = async () => {
    if (!contract || !doctorAddress) return;
    try {
      const tx = await contract.grantDoctorUpload(doctorAddress);
      await tx.wait();
      alert("Doctor upload permission granted!");
      setDoctorAddress("");
    } catch (error) {
      alert(handleError(error));
    }
  };

  const grantScanUpload = async () => {
    if (!contract || !scanAddress) return;
    try {
      const tx = await contract.grantScanUpload(scanAddress);
      await tx.wait();
      alert("Scan center upload permission granted!");
      setScanAddress("");
    } catch (error) {
      alert(handleError(error));
    }
  };

  const grantRecordAccess = async () => {
    if (!contract || selectedRecord === null || !grantAddress) return;
    try {
      const tx = await contract.grantRecordAccess(selectedRecord, grantAddress);
      await tx.wait();
      alert("Record access granted!");
      setGrantAddress("");
      setSelectedRecord(null);
    } catch (error) {
      alert(handleError(error));
    }
  };

  const deleteRecord = async (recordId: number) => {
    if (!contract || !confirm("Are you sure you want to delete this record?")) return;
    try {
      const tx = await contract.deleteRecord(recordId);
      await tx.wait();
      alert("Record deleted!");
      loadRecords();
    } catch (error) {
      alert(handleError(error));
    }
  };

  const viewOnIPFS = (cid: string) => {
    window.open(`https://ipfs.io/ipfs/${cid}`, "_blank");
  };

  return (
    <Layout title="Patient Dashboard">
      <div className="pd-space">

        {/* Stats */}
        <div className="fle">
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
            onClick={() => setActiveTab("permissions")}
            className={`pd-tab-btn ${activeTab === "permissions" ? "pd-tab-btn--active" : ""}`}
          >
            Manage Permissions
          </button>
        </div>

        {/* Records Tab */}
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
                        <p className="pd-record-info">
                          <span>Uploaded by:</span> {formatAddress(record.uploader)}
                        </p>
                        <p className="pd-record-info">
                          <span>Date:</span> {formatDate(record.timestamp)}
                        </p>
                        {record.prescriptionCID && (
                          <p className="pd-record-info">
                            <span>Prescription:</span> Available
                          </p>
                        )}
                      </div>
                      <div className="pd-record-actions">
                        <button className="pd-btn pd-btn--view" onClick={() => viewOnIPFS(record.recordCID)}>
                          View
                        </button>
                        <button
                          className="pd-btn pd-btn--share"
                          onClick={() => { setSelectedRecord(record.id); setGrantAddress(""); }}
                        >
                          Share
                        </button>
                        <button className="pd-btn pd-btn--delete" onClick={() => deleteRecord(record.id)}>
                          Delete
                        </button>
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
                          <button className="pd-btn pd-btn--grant" onClick={grantRecordAccess}>
                            Grant
                          </button>
                          <button className="pd-btn pd-btn--cancel" onClick={() => setSelectedRecord(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
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

      </div>
    </Layout>
  );
}