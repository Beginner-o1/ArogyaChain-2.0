import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "../styling/QRScannerModal.css";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
  title?: string;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Scan Wallet QR Code",
}: QRScannerModalProps) {
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const [error,     setError]     = useState("");
  const [scanning,  setScanning]  = useState(false);
  const [success,   setSuccess]   = useState("");
  const containerId = "qr-scanner-container";

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        setError("");
        setSuccess("");
        setScanning(false);

        // Wait for DOM to mount the container
        await new Promise((r) => setTimeout(r, 200));

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            const match = decodedText.match(/0x[a-fA-F0-9]{40}/);
            if (match) {
              setSuccess(`Address detected: ${match[0].slice(0, 10)}...${match[0].slice(-6)}`);
              stopScanner();
              // Small delay so user sees the success state before modal closes
              setTimeout(() => {
                onScan(match[0]);
                onClose();
              }, 600);
            } else {
              setError("QR code does not contain a valid Ethereum address.");
            }
          },
          () => {} // ignore per-frame decode errors
        );

        setScanning(true);
      } catch (err: any) {
        setError(
          err?.message?.includes("Permission")
            ? "Camera access denied. Please allow camera permissions and try again."
            : err?.message || "Could not start camera."
        );
        setScanning(false);
      }
    };

    startScanner();

    return () => { stopScanner(); };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="qr-overlay" onClick={handleClose} />

      <div className="qr-modal">
        {/* ── Header ── */}
        <div className="qr-modal-header">
          <div className="qr-modal-title">{title}</div>
          <button className="qr-modal-close" onClick={handleClose}>×</button>
        </div>

        {/* ── Body ── */}
        <div className="qr-modal-body">
          <p className="qr-modal-desc">
            Point your camera at the patient's wallet QR code
          </p>

          {/* Camera viewport */}
          <div className="qr-viewport">
            <div id={containerId} className="qr-container" />

            {/* Corner brackets + scan line — only shown while camera is live */}
            {scanning && (
              <>
                <div className="qr-corner qr-corner--tl" />
                <div className="qr-corner qr-corner--tr" />
                <div className="qr-corner qr-corner--bl" />
                <div className="qr-corner qr-corner--br" />
                <div className="qr-scan-line" />
              </>
            )}
          </div>

          {/* States: loading → scanning (silent) → error or success */}
          {!scanning && !error && !success && (
            <div className="qr-loading">
              <div className="qr-spinner" />
              <span>Starting camera…</span>
            </div>
          )}

          {error && (
            <div className="qr-error">
              <span>⚠</span> {error}
            </div>
          )}

          {success && (
            <div className="qr-success">
              <span>✓</span> {success}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="qr-modal-footer">
          <button className="qr-cancel-btn" onClick={handleClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}
