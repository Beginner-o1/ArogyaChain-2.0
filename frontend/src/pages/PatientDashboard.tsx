import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { formatAddress, formatDate, handleError } from "../utils/helpers";

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

  // Revoke doctor upload permission (can be used in future UI enhancement)
  // const revokeDoctorUpload = async (doctor: string) => {
  //   if (!contract) return;
  //   try {
  //     const tx = await contract.revokeDoctorUpload(doctor);
  //     await tx.wait();
  //     alert("Doctor upload permission revoked!");
  //   } catch (error) {
  //     alert(handleError(error));
  //   }
  // };

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
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medical Records</p>
                <p className="text-3xl font-bold text-gray-900">
                  {records.filter(r => r.recordType === 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scan Records</p>
                <p className="text-3xl font-bold text-gray-900">
                  {records.filter(r => r.recordType === 1).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("records")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "records"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Records
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "permissions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Manage Permissions
            </button>
          </nav>
        </div>

        {/* Records Tab */}
        {activeTab === "records" && (
          <Card title="Medical Records">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-600">No records yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            record.recordType === 0 ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {record.recordType === 0 ? "Medical Record" : "Scan Record"}
                          </span>
                          <span className="text-xs text-gray-500">ID: {record.id}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Uploaded by:</span> {formatAddress(record.uploader)}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Date:</span> {formatDate(record.timestamp)}
                        </p>
                        {record.prescriptionCID && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Prescription:</span> Available
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewOnIPFS(record.recordCID)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRecord(record.id);
                            setGrantAddress("");
                          }}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {selectedRecord === record.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Grant access to doctor:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={grantAddress}
                            onChange={(e) => setGrantAddress(e.target.value)}
                            placeholder="Doctor's wallet address"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={grantRecordAccess}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                          >
                            Grant
                          </button>
                          <button
                            onClick={() => setSelectedRecord(null)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Grant Doctor Upload Permission">
              <p className="text-sm text-gray-600 mb-4">
                Allow a doctor to upload medical records on your behalf
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={doctorAddress}
                  onChange={(e) => setDoctorAddress(e.target.value)}
                  placeholder="Doctor's wallet address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={grantDoctorUpload}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Grant Permission
                </button>
              </div>
            </Card>

            <Card title="Grant Scan Center Upload Permission">
              <p className="text-sm text-gray-600 mb-4">
                Allow a scan center to upload diagnostic images
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={scanAddress}
                  onChange={(e) => setScanAddress(e.target.value)}
                  placeholder="Scan center's wallet address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={grantScanUpload}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Grant Permission
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
