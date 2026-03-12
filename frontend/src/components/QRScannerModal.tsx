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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const containerId = "qr-scanner-container";

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = async () => {
      try {
        setError("");
        setScanning(true);

        await new Promise((r) => setTimeout(r, 200)); // wait for DOM

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            // Extract Ethereum address from QR — handle plain address or URI
            const match = decodedText.match(/0x[a-fA-F0-9]{40}/);
            if (match) {
              onScan(match[0]);
              stopScanner();
              onClose();
            } else {
              setError("QR code does not contain a valid wallet address.");
            }
          },
          () => {} // ignore frame errors
        );
      } catch (err: any) {
        setError(err?.message || "Camera access denied. Please allow camera permissions.");
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
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="qr-overlay" onClick={handleClose} />
      <div className="qr-modal">
        <div className="qr-modal-header">
          <div className="qr-modal-title">{title}</div>
          <button className="qr-modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="qr-modal-body">
          <p className="qr-modal-desc">
            Point your camera at the wallet's QR code
          </p>

          <div className="qr-viewport">
            <div id={containerId} className="qr-container" />
            {scanning && (
              <div className="qr-corner qr-corner--tl" />
            )}
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

          {error && (
            <div className="qr-error">
              <span>⚠</span> {error}
            </div>
          )}

          {!scanning && !error && (
            <div className="qr-loading">
              <div className="qr-spinner" />
              <span>Starting camera...</span>
            </div>
          )}
        </div>

        <div className="qr-modal-footer">
          <button className="qr-cancel-btn" onClick={handleClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}
