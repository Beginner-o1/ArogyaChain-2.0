import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { uploadFile } from "../services/api";
import { handleError, convertToBytes32 } from "../utils/helpers";

export default function DoctorDashboard() {
  const { contract } = useAuth();
  const [patientAddress, setPatientAddress] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [viewingRecord, setViewingRecord] = useState<any>(null);

  const handleUploadRecord = async () => {
    if (!contract || !patientAddress || !medicalFile) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setUploading(true);

      // Upload medical file
      const medicalResponse = await uploadFile(medicalFile);
      
      // Upload prescription if provided
      let prescriptionCID = "";
      if (prescriptionFile) {
        const prescriptionResponse = await uploadFile(prescriptionFile);
        prescriptionCID = prescriptionResponse.cid;
      }

      // Add record to blockchain
      const tx = await contract.addMedicalRecord(
        patientAddress,
        medicalResponse.cid,
        convertToBytes32(medicalResponse.hash),
        prescriptionCID
      );

      await tx.wait();
      
      alert("Medical record uploaded successfully!");
      
      // Reset form
      setPatientAddress("");
      setMedicalFile(null);
      setPrescriptionFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert(handleError(error));
    } finally {
      setUploading(false);
    }
  };

  const handleViewRecord = async () => {
    if (!contract || !recordId) return;
    
    try {
      const record = await contract.viewRecord(recordId);
      setViewingRecord({
        id: recordId,
        patient: record.patient,
        uploader: record.uploader,
        recordCID: record.recordCID,
        prescriptionCID: record.prescriptionCID,
        timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
      });
    } catch (error) {
      alert(handleError(error));
    }
  };

  const activateEmergencyAccess = async (recordId: string) => {
    if (!contract || !recordId) return;
    
    try {
      const tx = await contract.activateEmergencyAccess(recordId);
      await tx.wait();
      alert("Emergency access activated for 1 hour!");
    } catch (error) {
      alert(handleError(error));
    }
  };

  return (
    <Layout title="Doctor Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-2xl font-bold text-gray-900">Doctor</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Permissions</p>
                <p className="text-2xl font-bold text-gray-900">Upload</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Medical Record */}
        <Card title="Upload Medical Record">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Wallet Address *
              </label>
              <input
                type="text"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Patient must have granted you upload permission
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Record File *
              </label>
              <input
                type="file"
                onChange={(e) => setMedicalFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {medicalFile && (
                <p className="mt-1 text-xs text-gray-600">
                  Selected: {medicalFile.name} ({(medicalFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prescription File (Optional)
              </label>
              <input
                type="file"
                onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {prescriptionFile && (
                <p className="mt-1 text-xs text-gray-600">
                  Selected: {prescriptionFile.name} ({(prescriptionFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleUploadRecord}
              disabled={uploading || !patientAddress || !medicalFile}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </span>
              ) : (
                "Upload Medical Record"
              )}
            </button>
          </div>
        </Card>

        {/* View Patient Record */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="View Patient Record">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record ID
                </label>
                <input
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder="Enter record ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleViewRecord}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View Record
              </button>

              {viewingRecord && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="text-sm"><span className="font-medium">Record ID:</span> {viewingRecord.id}</p>
                  <p className="text-sm"><span className="font-medium">Patient:</span> {viewingRecord.patient}</p>
                  <p className="text-sm"><span className="font-medium">Uploaded:</span> {viewingRecord.timestamp}</p>
                  <button
                    onClick={() => window.open(`https://ipfs.io/ipfs/${viewingRecord.recordCID}`, "_blank")}
                    className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    View on IPFS
                  </button>
                  {viewingRecord.prescriptionCID && (
                    <button
                      onClick={() => window.open(`https://ipfs.io/ipfs/${viewingRecord.prescriptionCID}`, "_blank")}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      View Prescription
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="Emergency Access">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Activate emergency access to view a patient's record without prior permission. 
                Access expires after 1 hour.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record ID
                </label>
                <input
                  type="text"
                  placeholder="Enter record ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  id="emergency-record-id"
                />
              </div>
              <button
                onClick={() => {
                  const input = document.getElementById("emergency-record-id") as HTMLInputElement;
                  activateEmergencyAccess(input.value);
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Activate Emergency Access
              </button>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ Emergency access should only be used in critical situations. All emergency access activations are logged on-chain.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
