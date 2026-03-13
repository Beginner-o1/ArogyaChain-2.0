import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import "../styling/QRScannerModal.css"; // reuse overlay/modal base styles
import "../styling/RecordQRModal.css";   // specific styles for this modal

interface RecordQRModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  recordId: string;
  title?:   string;
}

export default function RecordQRModal({
  isOpen,
  onClose,
  recordId,
  title = "Record QR Code",
}: RecordQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !recordId || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, recordId, {
      width:  220,
      margin: 2,
      color: {
        dark:  "#0d0f14",
        light: "#e2e8f0",
      },
    });
  }, [isOpen, recordId]);

  if (!isOpen) return null;

  const short = recordId.length > 16
    ? `${recordId.slice(0, 10)}...${recordId.slice(-6)}`
    : recordId;

  const handleCopy = () => {
    navigator.clipboard.writeText(recordId);
  };

  return (
    <>
      <div className="qr-overlay" onClick={onClose} />
      <div className="qr-modal rqr-modal">

        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-title">{title}</div>
          <button className="qr-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="qr-modal-body">
          <p className="qr-modal-desc">
            Share this QR so a doctor can scan the record ID directly
          </p>

          {/* QR canvas */}
          <div className="rqr-canvas-wrap">
            <canvas ref={canvasRef} className="rqr-canvas" />
          </div>

          {/* Record ID display + copy */}
          <div className="rqr-id-box">
            <span className="rqr-id-label">RECORD ID</span>
            <span className="rqr-id-value">{short}</span>
            <button className="rqr-copy-btn" onClick={handleCopy} title="Copy full ID">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="qr-modal-footer">
          <button className="qr-cancel-btn" onClick={onClose}>Close</button>
        </div>

      </div>
    </>
  );
}
