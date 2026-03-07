import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../services/api";
import { convertToBytes32 } from "../utils/helpers";
import jsPDF from "jspdf";
import "../styling/MedicalRecordDrawer.css";

// ── Types ──────────────────────────────────────────────────────
interface FormData {
  patientAddress: string;
  patientName: string;
  recordTitle: string;
  dateOfVisit: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  prescription: string;
  labResults: string;
  doctorNotes: string;
  followUpDate: string;
}

interface MedicalRecordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (cid: string) => void;
}

type DrawerStep = 1 | 2;
type DrawerState = "form" | "processing" | "success" | "error";

const EMPTY_FORM: FormData = {
  patientAddress: "",
  patientName: "",
  recordTitle: "",
  dateOfVisit: new Date().toISOString().split("T")[0],
  symptoms: "",
  diagnosis: "",
  treatmentPlan: "",
  prescription: "",
  labResults: "",
  doctorNotes: "",
  followUpDate: "",
};

// ── PDF Generator ──────────────────────────────────────────────
function generateMedicalPDF(form: FormData, doctorAddress: string, doctorName: string): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  const cW = W - margin * 2;
  let y = 0;

  const addSection = (title: string, content: string, currentY: number): number => {
    if (!content.trim()) return currentY;
    let cy = currentY;

    // Section header — light blue background
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(219, 234, 254);
    doc.rect(margin, cy, cW, 9, "FD");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(title.toUpperCase(), margin + 4, cy + 6);
    cy += 13; // extra space between heading and content

    // Content
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 40, 55);
    const lines = doc.splitTextToSize(content, cW - 8);
    lines.forEach((line: string) => {
      if (cy > 270) { doc.addPage(); cy = 20; }
      doc.text(line, margin + 4, cy);
      cy += 6;
    });
    cy += 7; // extra space after content before next section
    return cy;
  };

  // ── Header block ──
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, W, 40, "F");

  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, 10, 6, 6, 1, 1, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("AROGYACHAIN", margin + 9, 15.5);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("DECENTRALIZED HEALTH RECORD", margin + 9, 20);

  doc.setFontSize(8);
doc.setFont("helvetica", "bold");
doc.setTextColor(59, 130, 246);
doc.text("MEDICAL RECORD", W - margin, 14, { align: "right" });

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(220, 235, 255);
doc.text(`Visit: ${form.dateOfVisit}`, W - margin, 21, { align: "right" });

doc.setFont("helvetica", "normal");
doc.setFontSize(6.5);
doc.setTextColor(100, 116, 139);
doc.text(`Generated: ${new Date().toLocaleString()}`, W - margin, 27, { align: "right" });
  y = 47;

  // ── Patient / Doctor row ──
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(219, 234, 254);
  doc.roundedRect(margin, y, cW, 22, 2, 2, "FD");

  // Patient col
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text("PATIENT", margin + 4, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(form.patientName || "—", margin + 4, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  const shortPat = form.patientAddress
    ? `${form.patientAddress.slice(0, 10)}...${form.patientAddress.slice(-6)}`
    : "—";
  doc.text(shortPat, margin + 4, y + 17.5);

  // Doctor col
  const col2 = margin + cW / 2 + 4;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text("ATTENDING DOCTOR", col2, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(doctorName ? `Dr. ${doctorName}` : "Dr. (On-Chain)", col2, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  const shortDoc = `${doctorAddress.slice(0, 10)}...${doctorAddress.slice(-6)}`;
  doc.text(shortDoc, col2, y + 17.5);

  // Vertical divider
  doc.setDrawColor(219, 234, 254);
  doc.line(margin + cW / 2, y + 2, margin + cW / 2, y + 20);

  y += 27;

  // ── Record title ──
  if (form.recordTitle) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(form.recordTitle, margin, y);
    y += 8;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, margin + cW, y);
    y += 6;
  }

  // ── Clinical sections ──
  y = addSection("Symptoms / Chief Complaint", form.symptoms, y);
  y = addSection("Diagnosis", form.diagnosis, y);
  y = addSection("Treatment Plan", form.treatmentPlan, y);
  y = addSection("Prescription / Medications", form.prescription, y);
  y = addSection("Lab Results", form.labResults, y);
  y = addSection("Doctor Notes", form.doctorNotes, y);

  // Follow-up
  if (form.followUpDate) {
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(margin, y, cW, 12, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(133, 77, 14);
    doc.text(`FOLLOW-UP DATE: ${form.followUpDate}`, margin + 5, y + 7.5);
    y += 17;
  }

  // ── Footer ──
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, 285, W - margin, 285);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text("ArogyaChain — Decentralized Electronic Health Records", margin, 290);
    doc.text(`Page ${i} of ${totalPages}`, W - margin, 290, { align: "right" });
  }

  return doc.output("blob");
}

// ── Component ──────────────────────────────────────────────────
export default function MedicalRecordDrawer({
  isOpen,
  onClose,
  onSuccess,
}: MedicalRecordDrawerProps) {
  const { contract, account } = useAuth();
  const [step, setStep] = useState<DrawerStep>(1);
  const [state, setState] = useState<DrawerState>("form");
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [processingStep, setProcessingStep] = useState(0);
  const [resultCid, setResultCid] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [doctorName, setDoctorName] = useState("");

  // Fetch doctor name from contract when drawer opens
  useState(() => {
    if (!contract || !account) return;
    contract.getDoctorName?.(account)
      .then((name: string) => { if (name) setDoctorName(name); })
      .catch(() => {}); // graceful — name stays empty if not available
  });

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const canProceed =
    step === 1
      ? !!form.patientAddress.trim() && !!form.recordTitle.trim()
      : true;

  const handleClose = () => {
    if (state === "processing") return;
    setStep(1);
    setState("form");
    setForm(EMPTY_FORM);
    setProcessingStep(0);
    setResultCid("");
    setErrorMsg("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!contract || !account) return;

    setState("processing");
    setProcessingStep(0);

    try {
      // Step 1: Generate PDF
      setProcessingStep(1);
      await new Promise((r) => setTimeout(r, 400));
      const pdfBlob = generateMedicalPDF(form, account, doctorName);
      const pdfFile = new File(
        [pdfBlob],
        `${form.recordTitle.replace(/\s+/g, "_")}_${form.dateOfVisit}.pdf`,
        { type: "application/pdf" }
      );

      // Step 2: Upload to IPFS
      setProcessingStep(2);
      const ipfsResponse = await uploadFile(pdfFile);

      // Step 3: Write to blockchain
      setProcessingStep(3);
      const tx = await contract.addMedicalRecord(
        form.patientAddress,
        form.recordTitle,
        ipfsResponse.cid,
        convertToBytes32(ipfsResponse.hash),
        "" // prescription handled separately if needed
      );
      await tx.wait();

      setResultCid(ipfsResponse.cid);
      setState("success");
      onSuccess?.(ipfsResponse.cid);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.reason || err?.message || "Something went wrong.");
      setState("error");
    }
  };

  if (!isOpen) return null;

  const PROCESS_STEPS = [
    "Generating PDF report",
    "Uploading to IPFS via Pinata",
    "Writing record to blockchain",
  ];

  const stepDef = [
    { label: "Patient Info" },
    { label: "Clinical Data" },
  ];

  return (
    <>
      <div className="drawer-overlay" onClick={handleClose} />
      <div className="drawer">

        {/* Header */}
        <div className="drawer-header">
          <div>
            <div className="drawer-title">New Medical Record</div>
            <div className="drawer-subtitle">
              PDF generated &amp; pinned to IPFS automatically
            </div>
          </div>
          <button className="drawer-close" onClick={handleClose}>×</button>
        </div>

        {/* Steps indicator — only show on form state */}
        {state === "form" && (
          <div className="drawer-steps">
            {stepDef.map((s, i) => {
              const n = i + 1;
              const cls = n < step ? "done" : n === step ? "active" : "";
              return (
                <>
                  <div key={n} className={`step ${cls}`}>
                    <div className="step-num">{n < step ? "✓" : n}</div>
                    <div className="step-label">{s.label}</div>
                  </div>
                  {i < stepDef.length - 1 && (
                    <div key={`c${i}`} className="step-connector" />
                  )}
                </>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="drawer-body">

          {/* ── FORM ── */}
          {state === "form" && step === 1 && (
            <>
              <div className="form-section">
                <div className="form-section-title">Patient Information</div>
                <div className="form-group">
                  <label className="form-label">Patient Wallet Address *</label>
                  <input
                    className="form-input"
                    placeholder="0x..."
                    value={form.patientAddress}
                    onChange={set("patientAddress")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Patient Name <span className="optional">(optional)</span></label>
                  <input
                    className="form-input"
                    placeholder="Full name for PDF report"
                    value={form.patientName}
                    onChange={set("patientName")}
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Record Details</div>
                <div className="form-group">
                  <label className="form-label">Record Title *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Annual Blood Panel, Back Pain Consultation"
                    value={form.recordTitle}
                    onChange={set("recordTitle")}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Visit</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.dateOfVisit}
                      onChange={set("dateOfVisit")}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow-up Date <span className="optional">(optional)</span></label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.followUpDate}
                      onChange={set("followUpDate")}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {state === "form" && step === 2 && (
            <>
              <div className="form-section">
                <div className="form-section-title">Clinical Information</div>
                <div className="form-group">
                  <label className="form-label">Symptoms / Chief Complaint <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe what the patient came in with..."
                    value={form.symptoms}
                    onChange={set("symptoms")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnosis <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Doctor's diagnosis..."
                    value={form.diagnosis}
                    onChange={set("diagnosis")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Treatment Plan <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Recommended course of treatment..."
                    value={form.treatmentPlan}
                    onChange={set("treatmentPlan")}
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Medications &amp; Notes</div>
                <div className="form-group">
                  <label className="form-label">Prescription / Medications <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Drug name, dosage, frequency..."
                    value={form.prescription}
                    onChange={set("prescription")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lab Results <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Test results, values, reference ranges..."
                    value={form.labResults}
                    onChange={set("labResults")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor Notes <span className="optional">(optional)</span></label>
                  <textarea
                    className="form-textarea tall"
                    placeholder="Additional observations or notes..."
                    value={form.doctorNotes}
                    onChange={set("doctorNotes")}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── PROCESSING ── */}
          {state === "processing" && (
            <div className="drawer-processing">
              <div className="processing-icon" />
              <div className="processing-title">Processing Record</div>
              <div className="processing-steps">
                {PROCESS_STEPS.map((label, i) => {
                  const n = i + 1;
                  const cls =
                    n < processingStep ? "done" :
                    n === processingStep ? "active" : "pending";
                  return (
                    <div key={n} className={`processing-step ${cls}`}>
                      <div className="processing-step-dot" />
                      {n < processingStep ? `✓ ${label}` : label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {state === "success" && (
            <div className="drawer-success">
              <div className="success-icon">✓</div>
              <div className="success-title">Record Saved</div>
              <div className="success-desc">
                PDF generated, pinned to IPFS,<br />and written to the blockchain.
              </div>
              <div className="success-cid-box">
                <div className="success-cid-label">IPFS CID</div>
                <div className="success-cid-value">{resultCid}</div>
              </div>
              <button
                className="drawer-btn drawer-btn-secondary"
                style={{ width: "100%" }}
                onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${resultCid}`, "_blank")}
              >
                View PDF on IPFS ↗
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {state === "error" && (
            <div className="drawer-processing">
              <div style={{ fontSize: 40 }}>✕</div>
              <div className="processing-title" style={{ color: "#ef4444" }}>Upload Failed</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#4a5568", textAlign: "center", lineHeight: 1.7 }}>
                {errorMsg}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="drawer-footer">
          {state === "form" && step === 1 && (
            <>
              <button className="drawer-btn drawer-btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="drawer-btn drawer-btn-primary"
                onClick={() => setStep(2)}
                disabled={!canProceed}
              >
                Next →
              </button>
            </>
          )}

          {state === "form" && step === 2 && (
            <>
              <button className="drawer-btn drawer-btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="drawer-btn drawer-btn-primary"
                onClick={handleSubmit}
              >
                Generate &amp; Upload
              </button>
            </>
          )}

          {state === "processing" && (
            <button className="drawer-btn drawer-btn-secondary" disabled>
              <div className="drawer-spinner" />
              Processing...
            </button>
          )}

          {state === "success" && (
            <>
              <button className="drawer-btn drawer-btn-secondary" onClick={handleClose}>
                Close
              </button>
              <button
                className="drawer-btn drawer-btn-success"
                onClick={() => {
                  setStep(1);
                  setState("form");
                  setForm(EMPTY_FORM);
                  setProcessingStep(0);
                  setResultCid("");
                }}
              >
                New Record
              </button>
            </>
          )}

          {state === "error" && (
            <>
              <button className="drawer-btn drawer-btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="drawer-btn drawer-btn-primary"
                onClick={() => { setState("form"); setStep(2); }}
              >
                Try Again
              </button>
            </>
          )}
        </div>

      </div>
    </>
  );
}
