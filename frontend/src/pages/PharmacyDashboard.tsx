import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Card from "../components/Card";
import { handleError } from "../utils/helpers";

export default function PharmacyDashboard() {
  const { contract } = useAuth();
  const [recordId, setRecordId] = useState("");
  const [prescription, setPrescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewPrescription = async () => {
    if (!contract || !recordId) {
      setError("Please enter a record ID");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPrescription(null);

      const prescriptionCID = await contract.viewPrescription(recordId);
      
      if (!prescriptionCID || prescriptionCID === "") {
        setError("No prescription found for this record");
        return;
      }

      setPrescription(prescriptionCID);
    } catch (err) {
      console.error("Error viewing prescription:", err);
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const openPrescription = () => {
    if (prescription) {
      window.open(`https://ipfs.io/ipfs/${prescription}`, "_blank");
    }
  };

  return (
    <Layout title="Pharmacy Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-2xl font-bold text-gray-900">Pharmacy</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                <p className="text-sm text-gray-600">Access Type</p>
                <p className="text-2xl font-bold text-gray-900">Prescription</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* View Prescription */}
        <Card title="View Patient Prescription">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Note:</span> You can only view prescriptions for records where the patient has granted you access.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Record ID
              </label>
              <input
                type="text"
                value={recordId}
                onChange={(e) => {
                  setRecordId(e.target.value);
                  setError(null);
                  setPrescription(null);
                }}
                placeholder="Enter record ID (e.g., 1, 2, 3...)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                The patient must have granted you prescription access for this record
              </p>
            </div>

            <button
              onClick={viewPrescription}
              disabled={loading || !recordId}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </span>
              ) : (
                "View Prescription"
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {prescription && (
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Prescription Found</p>
                    <p className="text-sm text-green-700 mt-1">
                      Record ID: {recordId}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200 mb-4">
                  <p className="text-xs text-gray-500 mb-1">IPFS CID:</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{prescription}</p>
                </div>

                <button
                  onClick={openPrescription}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Open Prescription on IPFS
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Instructions */}
        <Card title="How to Access Prescriptions">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Patient Grants Access</p>
                <p className="text-sm text-gray-600 mt-1">
                  The patient must first grant you prescription access for a specific medical record through their dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Enter Record ID</p>
                <p className="text-sm text-gray-600 mt-1">
                  The patient will provide you with the medical record ID. Enter it in the form above.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">View Prescription</p>
                <p className="text-sm text-gray-600 mt-1">
                  Click "View Prescription" to retrieve the prescription from the blockchain and view it on IPFS.
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Privacy Notice:</span> You can only access prescriptions that patients have explicitly granted you permission to view. All access attempts are logged on the blockchain.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
