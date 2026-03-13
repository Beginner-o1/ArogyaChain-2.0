import { useState } from "react";
import { handleError } from "../../utils/helpers";
import QRScannerModal from "../QRScannerModal";
import "../../styling/QRScannerModal.css";

interface GrantPermissionsProps {
  contract: any;
}

type ScanTarget = "doctor" | "scan" | null;

const QRIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3"  y="3"  width="7" height="7" rx="1" />
    <rect x="14" y="3"  width="7" height="7" rx="1" />
    <rect x="3"  y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z M17 17h3v3h-3z M14 20h3" />
  </svg>
);

const AddressChip = ({ address }: { address: string }) => {
  if (!address.startsWith("0x") || address.length !== 42) return null;
  return (
    <div className="pd-address-chip">
      <span className="pd-address-chip-dot" />
      {address.slice(0, 10)}...{address.slice(-6)}
    </div>
  );
};

export default function GrantPermissions({ contract }: GrantPermissionsProps) {
  const [doctorAddress, setDoctorAddress] = useState("");
  const [scanAddress,   setScanAddress]   = useState("");
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [scanLoading,   setScanLoading]   = useState(false);
  const [qrTarget,      setQrTarget]      = useState<ScanTarget>(null);

  const grantDoctorUpload = async () => {
    if (!contract || !doctorAddress.trim()) return;
    try {
      setDoctorLoading(true);
      const tx = await contract.grantDoctorUpload(doctorAddress.trim());
      await tx.wait();
      alert("Doctor upload permission granted!");
      setDoctorAddress("");
    } catch (error) {
      alert(handleError(error));
    } finally {
      setDoctorLoading(false);
    }
  };

  const grantScanUpload = async () => {
    if (!contract || !scanAddress.trim()) return;
    try {
      setScanLoading(true);
      const tx = await contract.grantScanUpload(scanAddress.trim());
      await tx.wait();
      alert("Scan center upload permission granted!");
      setScanAddress("");
    } catch (error) {
      alert(handleError(error));
    } finally {
      setScanLoading(false);
    }
  };

  const handleQRScan = (address: string) => {
    if (qrTarget === "doctor") setDoctorAddress(address);
    if (qrTarget === "scan")   setScanAddress(address);
    setQrTarget(null);
  };

  return (
    <>
      <div className="pd-perms-grid">

        {/* ── Grant Doctor ── */}
        <div className="pd-card">
          <p className="pd-card-title">Grant Doctor Upload</p>
          <p className="pd-perms-desc">Allow a doctor to upload medical records on your behalf</p>
          <div className="pd-perms-fields">
            <div className="pd-share-input-wrap">
              <input
                type="text"
                value={doctorAddress}
                onChange={(e) => setDoctorAddress(e.target.value)}
                placeholder="Doctor's wallet address (0x...)"
                className="pd-input pd-input--full"
              />
              <button
                className="pd-qr-btn"
                onClick={() => setQrTarget("doctor")}
                title="Scan QR code"
                type="button"
              >
                <QRIcon />
              </button>
            </div>
            <AddressChip address={doctorAddress} />
            <button
              className="pd-btn pd-btn--full pd-btn--blue-full"
              onClick={grantDoctorUpload}
              disabled={!doctorAddress.trim() || doctorLoading}
            >
              {doctorLoading
                ? <><span className="pd-spinner pd-spinner--sm" /> Granting...</>
                : "Grant Permission"
              }
            </button>
          </div>
        </div>

        {/* ── Grant Scan Center ── */}
        <div className="pd-card">
          <p className="pd-card-title">Grant Scan Center Upload</p>
          <p className="pd-perms-desc">Allow a scan center to upload diagnostic images</p>
          <div className="pd-perms-fields">
            <div className="pd-share-input-wrap">
              <input
                type="text"
                value={scanAddress}
                onChange={(e) => setScanAddress(e.target.value)}
                placeholder="Scan center's wallet address (0x...)"
                className="pd-input pd-input--full"
              />
              <button
                className="pd-qr-btn"
                onClick={() => setQrTarget("scan")}
                title="Scan QR code"
                type="button"
              >
                <QRIcon />
              </button>
            </div>
            <AddressChip address={scanAddress} />
            <button
              className="pd-btn pd-btn--full pd-btn--purple-full"
              onClick={grantScanUpload}
              disabled={!scanAddress.trim() || scanLoading}
            >
              {scanLoading
                ? <><span className="pd-spinner pd-spinner--sm" /> Granting...</>
                : "Grant Permission"
              }
            </button>
          </div>
        </div>

      </div>

      <QRScannerModal
        isOpen={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        onScan={handleQRScan}
        title={qrTarget === "doctor" ? "Scan Doctor QR Code" : "Scan Center QR Code"}
      />
    </>
  );
}
