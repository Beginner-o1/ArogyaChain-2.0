import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { uploadFile } from "../services/api";
import { handleError, convertToBytes32 } from "../utils/helpers";

export default function ScanDashboard() {
  const { contract } = useAuth();
  const [patientAddress, setPatientAddress] = useState("");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<Array<{
    patient: string;
    timestamp: string;
    fileName: string;
  }>>([]);

  const handleUploadScan = async () => {
    if (!contract || !patientAddress || !scanFile) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setUploading(true);

      // Upload scan file to backend/IPFS
      const response = await uploadFile(scanFile);

      // Add scan record to blockchain
      const tx = await contract.addScanRecord(
        patientAddress,
        response.cid,
        convertToBytes32(response.hash)
      );

      await tx.wait();

      alert("Scan record uploaded successfully!");

      // Add to history
      setUploadHistory([
        {
          patient: patientAddress,
          timestamp: new Date().toLocaleString(),
          fileName: scanFile.name,
        },
        ...uploadHistory,
      ]);

      // Reset form
      setPatientAddress("");
      setScanFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert(handleError(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout title="Scan Center Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-2xl font-bold text-gray-900">Scan Center</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <p className="text-sm text-gray-600">Uploads Today</p>
                <p className="text-2xl font-bold text-gray-900">{uploadHistory.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Scan */}
        <Card title="Upload Diagnostic Scan">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Note:</span> You can only upload scans for patients who have granted you upload permission.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient Wallet Address *
              </label>
              <input
                type="text"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Patient must have granted you upload permission
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan File * (X-Ray, MRI, CT Scan, etc.)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-purple-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                        accept="image/*,.pdf,.dcm"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, PDF, DICOM up to 10MB
                  </p>
                </div>
              </div>
              {scanFile && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">{scanFile.name}</p>
                      <p className="text-xs text-purple-700">
                        {(scanFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setScanFile(null)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleUploadScan}
              disabled={uploading || !patientAddress || !scanFile}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading to Blockchain...
                </span>
              ) : (
                "Upload Scan Record"
              )}
            </button>
          </div>
        </Card>

        {/* Upload History */}
        <Card title="Recent Uploads">
          {uploadHistory.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-600">No uploads yet</p>
              <p className="text-sm text-gray-500">Your upload history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadHistory.map((upload, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{upload.fileName}</p>
                      <p className="text-xs text-gray-500">
                        Patient: {upload.patient.slice(0, 6)}...{upload.patient.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{upload.timestamp}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Uploaded
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card title="Upload Guidelines">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Verify Patient Permission</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ensure the patient has granted you upload permission before attempting to upload scans.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Supported File Types</p>
                <p className="text-sm text-gray-600 mt-1">
                  Upload X-rays, MRI scans, CT scans, ultrasounds in DICOM, PNG, JPG, or PDF format.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Data Privacy</p>
                <p className="text-sm text-gray-600 mt-1">
                  All scans are encrypted and stored on IPFS. Only the patient and authorized parties can access them.
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Important:</span> Ensure all patient information is properly anonymized before upload. All uploads are permanently recorded on the blockchain.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
