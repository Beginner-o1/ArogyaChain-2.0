import { useState } from "react";
import { formatAddress, handleError } from "../../utils/helpers";

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

type PanelEntity =
  | ({ kind: "doctor" } & GrantedDoctor)
  | ({ kind: "scan"   } & GrantedScanCenter);

interface ViewPermissionsProps {
  contract: any;
  grantedDoctors: GrantedDoctor[];
  grantedScanCenters: GrantedScanCenter[];
  loading: boolean;
  onDoctorRevoked: (addr: string) => void;
  onScanRevoked: (addr: string) => void;
}

export default function ViewPermissions({
  contract,
  grantedDoctors,
  grantedScanCenters,
  loading,
  onDoctorRevoked,
  onScanRevoked,
}: ViewPermissionsProps) {
  const [panelEntity, setPanelEntity] = useState<PanelEntity | null>(null);

  const revokeDoctorUpload = async (addr: string) => {
    if (!contract || !confirm(`Revoke upload permission for ${formatAddress(addr)}?`)) return;
    try {
      const tx = await contract.revokeDoctorUpload(addr);
      await tx.wait();
      onDoctorRevoked(addr);
      setPanelEntity(null);
    } catch (error) { alert(handleError(error)); }
  };

  const revokeScanUpload = async (addr: string) => {
    if (!contract || !confirm(`Revoke upload permission for ${formatAddress(addr)}?`)) return;
    try {
      const tx = await contract.revokeScanUpload(addr);
      await tx.wait();
      onScanRevoked(addr);
      setPanelEntity(null);
    } catch (error) { alert(handleError(error)); }
  };

  if (loading) {
    return (
      <div className="pd-card">
        <div className="pd-loading">
          <div className="pd-spinner" />
          <p>Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pd-view-perms-wrap">

        {/* Granted Doctors */}
        <div className="pd-card">
          <div className="pd-vp-header">
            <p className="pd-card-title">Doctors with Upload Permission</p>
            <span className="pd-vp-count pd-vp-count--teal">{grantedDoctors.length}</span>
          </div>

          {grantedDoctors.length === 0 ? (
            <div className="pd-empty pd-empty--sm">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p>No doctors have been granted upload permission</p>
            </div>
          ) : (
            <div className="pd-perm-list">
              {grantedDoctors.map((doc) => (
                <div
                  key={doc.address}
                  className="pd-perm-item pd-perm-item--clickable"
                  onClick={() => setPanelEntity({ kind: "doctor", ...doc })}
                >
                  <div className="pd-perm-avatar pd-perm-avatar--teal">⚕</div>
                  <div className="pd-perm-info">
                    <p className="pd-perm-name">{doc.fullName}</p>
                    <p className="pd-perm-detail">{doc.licenseNumber}</p>
                    <p className="pd-perm-addr">{formatAddress(doc.address)}</p>
                  </div>
                  <button
                    className="pd-btn pd-btn--revoke"
                    onClick={(e) => { e.stopPropagation(); revokeDoctorUpload(doc.address); }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Granted Scan Centers */}
        <div className="pd-card">
          <div className="pd-vp-header">
            <p className="pd-card-title">Scan Centers with Upload Permission</p>
            <span className="pd-vp-count pd-vp-count--amber">{grantedScanCenters.length}</span>
          </div>

          {grantedScanCenters.length === 0 ? (
            <div className="pd-empty pd-empty--sm">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No scan centers have been granted upload permission</p>
            </div>
          ) : (
            <div className="pd-perm-list">
              {grantedScanCenters.map((sc) => (
                <div
                  key={sc.address}
                  className="pd-perm-item pd-perm-item--clickable"
                  onClick={() => setPanelEntity({ kind: "scan", ...sc })}
                >
                  <div className="pd-perm-avatar pd-perm-avatar--amber">🔬</div>
                  <div className="pd-perm-info">
                    <p className="pd-perm-name">{sc.centerName}</p>
                    <p className="pd-perm-detail">{sc.location} · {sc.licenseNumber}</p>
                    <p className="pd-perm-addr">{formatAddress(sc.address)}</p>
                  </div>
                  <button
                    className="pd-btn pd-btn--revoke"
                    onClick={(e) => { e.stopPropagation(); revokeScanUpload(sc.address); }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Slide-in Detail Panel ── */}
      <div className={`pd-detail-overlay ${panelEntity ? "pd-detail-overlay--open" : ""}`}>
        <div className="pd-detail-backdrop" onClick={() => setPanelEntity(null)} />
        <div className="pd-detail-panel">

          <button className="pd-detail-close" onClick={() => setPanelEntity(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>

          {panelEntity && (
            <>
              <div className="pd-detail-header">
                <div className={`pd-detail-avatar ${panelEntity.kind === "doctor" ? "pd-detail-avatar--teal" : "pd-detail-avatar--amber"}`}>
                  {panelEntity.kind === "doctor" ? "⚕" : "🔬"}
                </div>
                <div>
                  <p className="pd-detail-eyebrow">
                    {panelEntity.kind === "doctor" ? "Doctor" : "Scan Center"}
                  </p>
                  <p className="pd-detail-name">
                    {panelEntity.kind === "doctor" ? panelEntity.fullName : panelEntity.centerName}
                  </p>
                </div>
              </div>

              <div className="pd-detail-body">
                <div className="pd-detail-field">
                  <span className="pd-detail-label">Wallet Address</span>
                  <span className="pd-detail-value pd-detail-value--mono">{panelEntity.address}</span>
                </div>
                <div className="pd-detail-field">
                  <span className="pd-detail-label">License Number</span>
                  <span className="pd-detail-value">{panelEntity.licenseNumber}</span>
                </div>
                {panelEntity.kind === "doctor" && (
                  <div className="pd-detail-field">
                    <span className="pd-detail-label">Contact Email</span>
                    <span className="pd-detail-value">{panelEntity.contactEmail || "—"}</span>
                  </div>
                )}
                {panelEntity.kind === "scan" && (
                  <>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Location</span>
                      <span className="pd-detail-value">{panelEntity.location || "—"}</span>
                    </div>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Contact Email</span>
                      <span className="pd-detail-value">{panelEntity.contactEmail || "—"}</span>
                    </div>
                    <div className="pd-detail-field">
                      <span className="pd-detail-label">Contact Phone</span>
                      <span className="pd-detail-value">{panelEntity.contactPhone || "—"}</span>
                    </div>
                  </>
                )}
                <div className="pd-detail-field">
                  <span className="pd-detail-label">Permission</span>
                  <span className="pd-detail-value pd-detail-value--green">Upload Granted ✓</span>
                </div>
              </div>

              <div className="pd-detail-footer">
                <button
                  className="pd-btn pd-btn--full pd-btn--revoke-full"
                  onClick={() => {
                    if (panelEntity.kind === "doctor") revokeDoctorUpload(panelEntity.address);
                    else revokeScanUpload(panelEntity.address);
                  }}
                >
                  Revoke Permission
                </button>
                <button
                  className="pd-btn pd-btn--full pd-btn--cancel"
                  onClick={() => setPanelEntity(null)}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
