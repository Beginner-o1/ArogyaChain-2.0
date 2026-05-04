import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MyRecords from "../components/patient/MyRecords";
import GrantPermissions from "../components/patient/GrantPermissions";
import ViewPermissions from "../components/patient/ViewPermissions";
import PatientProfile from "../components/patient/PatientProfile";
import "../styling/PatientDashboard.css";
import "../styling/PatientProfile.css";
import "../styling/NotificationBell.css";

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

interface GrantedDoctor {
  address: string;
  fullName: string;
  licenseNumber: string;
  contactEmail: string;
}

interface GrantedScanCenter {
  address: string;
  centerName: string;
  licenseNumber: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}

type ActiveTab = "records" | "grant" | "view" | "profile";

export default function PatientDashboard() {
  const { contract, account } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("records");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [grantedDoctors, setGrantedDoctors] = useState<GrantedDoctor[]>([]);
  const [grantedScanCenters, setGrantedScanCenters] = useState<GrantedScanCenter[]>([]);
  const [permsLoading, setPermsLoading] = useState(false);

  useEffect(() => { loadRecords(); }, [contract]);

  useEffect(() => {
    if (activeTab === "view") loadPermissions();
  }, [activeTab, contract]);

  const loadRecords = async () => {
    if (!contract) return;
    try {
      setRecordsLoading(true);
      const recordIds = await contract.getMyRecords();
      const recordsData = await Promise.all(
        recordIds.map(async (id: any) => {
          try {
            const record = await contract.viewRecord(id);
            return {
              id: id,
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
          } catch { return null; }
        })
      );
      setRecords(recordsData.filter((r): r is MedicalRecord => r !== null && !r.isDeleted));
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!contract) return;
    try {
      setPermsLoading(true);
      const [doctorAddrs, scanAddrs]: [string[], string[]] = await Promise.all([
        contract.getMyGrantedDoctors(),
        contract.getMyGrantedScanCenters(),
      ]);

      const doctors: GrantedDoctor[] = await Promise.all(
        doctorAddrs.map(async (addr: string) => {
          try {
            const p = await contract.getDoctorProfile(addr);
            return { address: addr, fullName: p.fullName, licenseNumber: p.licenseNumber, contactEmail: p.contactEmail };
          } catch {
            return { address: addr, fullName: "Unknown", licenseNumber: "—", contactEmail: "—" };
          }
        })
      );

      const scanCenters: GrantedScanCenter[] = await Promise.all(
        scanAddrs.map(async (addr: string) => {
          try {
            const p = await contract.getScanCenterProfile(addr);
            return { address: addr, centerName: p.centerName, licenseNumber: p.licenseNumber, location: p.location, contactEmail: p.contactEmail, contactPhone: p.contactPhone };
          } catch {
            return { address: addr, centerName: "Unknown", licenseNumber: "—", location: "—", contactEmail: "—", contactPhone: "—" };
          }
        })
      );

      setGrantedDoctors(doctors);
      setGrantedScanCenters(scanCenters);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setPermsLoading(false);
    }
  };

  return (
    <Layout 
      title="Patient Dashboard" 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      <div className="pd-space">

        {/* ── Stats Grid ── */}
        <div className="pd-stats-grid">
          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Total Records</p>
              <p className="pd-stat-value">{records.length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Medical Records</p>
              <p className="pd-stat-value">{records.filter(r => r.recordType === 0).length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
          </div>
          <div className="pd-stat-card">
            <div>
              <p className="pd-stat-label">Scan Records</p>
              <p className="pd-stat-value">{records.filter(r => r.recordType === 1).length}</p>
            </div>
            <div className="pd-stat-icon pd-stat-icon--purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        {/* ── Tab Content Area ── */}
        <div style={{ marginTop: "1rem" }}>
          {activeTab === "records" && (
            <MyRecords
              records={records}
              loading={recordsLoading}
              contract={contract}
              onRecordDeleted={loadRecords}
            />
          )}

          {activeTab === "grant" && (
            <GrantPermissions contract={contract} />
          )}

          {activeTab === "view" && (
            <ViewPermissions
              contract={contract}
              grantedDoctors={grantedDoctors}
              grantedScanCenters={grantedScanCenters}
              loading={permsLoading}
              onDoctorRevoked={(addr) => setGrantedDoctors(prev => prev.filter(d => d.address !== addr))}
              onScanRevoked={(addr) => setGrantedScanCenters(prev => prev.filter(s => s.address !== addr))}
            />
          )}

          {activeTab === "profile" && (
            <PatientProfile contract={contract} account={account ?? ""} />
          )}
        </div>
      </div>
    </Layout>
  );
}