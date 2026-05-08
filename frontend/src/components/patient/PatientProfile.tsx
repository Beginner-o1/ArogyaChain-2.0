import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { uploadFile } from "../../services/api";
import { handleError, convertToBytes32 } from "../../utils/helpers";

interface PatientProfileProps {
  contract: any;
  account: string;
}

interface ProfileForm {
  // Basic
  fullName:           string;
  dateOfBirth:        string;
  bloodType:          string;
  weightKg:           string;
  heightCm:           string;

  // Emergency contact
  emergencyName:      string;
  emergencyPhone:     string;
  emergencyRelation:  string;

  // Clinical — structured text
  allergies:          string; // "Penicillin — Severe (Anaphylaxis)\nPeanuts — Moderate"
  currentMedications: string; // "Metformin 500mg — twice daily — last taken: morning"
  chronicConditions:  string; // "Type 2 Diabetes — insulin dependent\nHypertension — uncontrolled"
  recentDiagnoses:    string; // "Cardiac Arrhythmia — Jan 2026"
  pastSurgeries:      string; // "Appendectomy — 2018\nKnee arthroscopy — 2021"
  implants:           string; // "Pacemaker — implanted 2020"
  highRiskAlerts:     string; // "Bleeding disorder\nImmunocompromised"

  // Optional
  treatingDoctor:     string;
  organDonor:         string;
}

const EMPTY_FORM: ProfileForm = {
  fullName:           "",
  dateOfBirth:        "",
  bloodType:          "",
  weightKg:           "",
  heightCm:           "",
  emergencyName:      "",
  emergencyPhone:     "",
  emergencyRelation:  "",
  allergies:          "",
  currentMedications: "",
  chronicConditions:  "",
  recentDiagnoses:    "",
  pastSurgeries:      "",
  implants:           "",
  highRiskAlerts:     "",
  treatingDoctor:     "",
  organDonor:         "",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

type Step = "view" | "form" | "processing" | "success";

// ── BMI helper ──
function calcBMI(weightKg: string, heightCm: string): string {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm) / 100;
  if (!w || !h) return "";
  const bmi = w / (h * h);
  let cat = "";
  if (bmi < 18.5)      cat = "Underweight";
  else if (bmi < 25)   cat = "Normal";
  else if (bmi < 30)   cat = "Overweight";
  else                  cat = "Obese";
  return `${bmi.toFixed(1)} (${cat})`;
}

// ── PDF Generation ──
function generateProfilePDF(form: ProfileForm, account: string): File {
  const doc    = new jsPDF({ unit: "mm", format: "a4" });
  const W      = 210;
  const margin = 16;
  const col    = W - margin * 2;
  let   y      = 0;

  // ── Color helpers ──
  const hexToRgb = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const setRgb  = (h: string) => { const [r,g,b] = hexToRgb(h); doc.setTextColor(r,g,b); };
  const setFill = (h: string) => { const [r,g,b] = hexToRgb(h); doc.setFillColor(r,g,b); };
  const setDraw = (h: string) => { const [r,g,b] = hexToRgb(h); doc.setDrawColor(r,g,b); };

  const checkPageBreak = (needed = 20) => {
    if (y + needed > 275) { doc.addPage(); y = 18; }
  };

  // ── HEADER ──
  setFill("#0f1117"); doc.rect(0, 0, W, 46, "F");
  // Red top accent bar
  setFill("#dc2626"); doc.rect(0, 0, W, 2.5, "F");
  // Subtle right-side branding strip
  setFill("#1a1d27"); doc.rect(W - 52, 0, 52, 46, "F");

  // Brand label
  setRgb("#dc2626");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7);
  doc.text("AROGYACHAIN", margin, 11);
  setRgb("#475569");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text("EMERGENCY HEALTH PROFILE  //  CONFIDENTIAL", margin + 33, 11);

  // Divider
  setDraw("#dc2626"); doc.setLineWidth(0.3);
  doc.line(margin, 14, W - margin, 14);

  // Patient name
  setRgb("#f1f5f9");
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text(form.fullName || "Patient", margin, 28);

  // Meta info
  setRgb("#64748b");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);
  doc.text(`Wallet: ${account}`, margin, 40);

  // Last updated — right column
  setRgb("#dc2626");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
  doc.text("LAST UPDATED", W - margin, 32, { align: "right" });
  setRgb("#f1f5f9");
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("en-GB"), W - margin, 38, { align: "right" });

  y = 54;

  // ── HIGH RISK ALERTS BANNER ──
  if (form.highRiskAlerts.trim()) {
    checkPageBreak(14);
    setFill("#7f1d1d"); setDraw("#ef4444");
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, col, 11, 1.5, 1.5, "FD");
    // Left accent stripe
    setFill("#ef4444");
    doc.rect(margin, y, 3, 11, "F");
    setRgb("#fecaca");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    const alertText = "HIGH RISK ALERTS: " + form.highRiskAlerts.replace(/\n/g, "  |  ");
    const alertLines = doc.splitTextToSize(alertText, col - 10);
    doc.text(alertLines, margin + 6, y + 7);
    y += 14 + (alertLines.length - 1) * 5;
  }

  // ── SECTION HEADER ──
  const sectionHeader = (title: string, accentColor = "#2563eb") => {
    checkPageBreak(18);
    // Background
    setFill("#f8fafc"); setDraw("#e2e8f0");
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, col, 9, 1, 1, "FD");
    // Left accent bar
    const [r,g,b] = hexToRgb(accentColor);
    doc.setFillColor(r,g,b);
    doc.roundedRect(margin, y, 3, 9, 0.5, 0.5, "F");
    // Label
    doc.setTextColor(r,g,b);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(title.toUpperCase(), margin + 7, y + 6);
    y += 13;
  };

  // ── KEY-VALUE ROW ──
  const row = (label: string, value: string, highlight = false) => {
    if (!value.trim()) return;
    checkPageBreak(9);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    if (highlight) { setRgb("#dc2626"); } else { setRgb("#94a3b8"); }
    doc.text(label + ":", margin + 4, y);
    doc.setFont("helvetica", "normal");
    setRgb("#1e293b");
    const lines = doc.splitTextToSize(value, col - 44);
    doc.text(lines, margin + 42, y);
    y += lines.length * 5.5 + 1.5;
  };

  // ── BULLET BLOCK ──
  const block = (content: string) => {
    if (!content.trim()) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); setRgb("#94a3b8");
      doc.text("None reported", margin + 4, y);
      y += 8;
      return;
    }
    const lines = content.split("\n").filter(l => l.trim());
    lines.forEach(line => {
      checkPageBreak(9);
      // Bullet dot
      setFill("#94a3b8");
      doc.circle(margin + 5.5, y - 1.5, 0.8, "F");
      const wrapped = doc.splitTextToSize(line.trim(), col - 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); setRgb("#1e293b");
      doc.text(wrapped, margin + 8, y);
      y += wrapped.length * 5.8;
    });
    y += 3;
  };

  // ── SEPARATOR LINE ──
  const sep = () => {
    checkPageBreak(6);
    setDraw("#e2e8f0"); doc.setLineWidth(0.2);
    doc.line(margin + 4, y - 1, W - margin - 4, y - 1);
    y += 3;
  };

  // ── BASIC INFORMATION ──
  sectionHeader("Basic Information");
  row("Full Name",     form.fullName    || "Not provided");
  row("Date of Birth", form.dateOfBirth || "Not provided");
  row("Blood Type",    form.bloodType   || "Not provided", true);
  row("Weight",        form.weightKg ? `${form.weightKg} kg` : "Not provided", true);
  row("Height",        form.heightCm ? `${form.heightCm} cm` : "Not provided");
  const bmi = calcBMI(form.weightKg, form.heightCm);
  if (bmi) row("BMI", bmi);
  y += 4;

  // ── EMERGENCY CONTACT ──
  sectionHeader("Emergency Contact", "#b45309");
  row("Name",     form.emergencyName     || "Not provided");
  row("Phone",    form.emergencyPhone    || "Not provided");
  row("Relation", form.emergencyRelation || "Not provided");
  y += 4;

  // ── ALLERGIES ──
  sectionHeader("Allergies & Reactions", "#dc2626");
  block(form.allergies);
  sep();

  // ── MEDICATIONS ──
  sectionHeader("Current Medications");
  block(form.currentMedications);
  sep();

  // ── CHRONIC CONDITIONS ──
  sectionHeader("Chronic Conditions");
  block(form.chronicConditions);
  sep();

  // ── RECENT DIAGNOSES ──
  sectionHeader("Recent Major Diagnoses");
  block(form.recentDiagnoses);
  sep();

  // ── PAST SURGERIES ──
  sectionHeader("Past Surgeries / Procedures");
  block(form.pastSurgeries);
  sep();

  // ── IMPLANTS ──
  sectionHeader("Medical Implants & Devices", "#7c3aed");
  block(form.implants);

  // ── TREATING DOCTOR ──
  if (form.treatingDoctor.trim()) {
    sep();
    sectionHeader("Treating Doctor / Hospital");
    block(form.treatingDoctor);
  }

  // ── ORGAN DONOR ──
  if (form.organDonor.trim()) {
    checkPageBreak(16);
    y += 4;
    setFill("#f0fdf4"); setDraw("#16a34a");
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, col, 11, 1.5, 1.5, "FD");
    setFill("#16a34a");
    doc.rect(margin, y, 3, 11, "F");
    setRgb("#15803d");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(`ORGAN DONOR: ${form.organDonor}`, margin + 7, y + 7);
    y += 16;
  }

  // ── FOOTER (all pages) ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    setFill("#0f1117");
    doc.rect(0, 285, W, 12, "F");
    setDraw("#dc2626"); doc.setLineWidth(0.3);
    doc.line(0, 285, W, 285);
    setRgb("#475569");
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text("ArogyaChain — Emergency Health Profile — CONFIDENTIAL", margin, 291);
    doc.text(`Page ${i} of ${pages}`, W - margin, 291, { align: "right" });
  }

  const blob = doc.output("blob");
  return new File(
    [blob],
    `health-profile-${account.slice(0, 8)}.pdf`,
    { type: "application/pdf" }
  );
}

// ── Component ──
export default function PatientProfile({ contract, account }: PatientProfileProps) {
  const [step,           setStep]           = useState<Step>("view");
  const [form,           setForm]           = useState<ProfileForm>(EMPTY_FORM);
  const [existingCID,    setExistingCID]    = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [processMsg,     setProcessMsg]     = useState("");
  const [successCID,     setSuccessCID]     = useState("");

  useEffect(() => { loadExistingProfile(); }, [contract]);

  const loadExistingProfile = async () => {
    if (!contract) return;
    try {
      setLoadingProfile(true);
      const [cid] = await contract.getMyProfileCID();
      setExistingCID(cid);
    } catch {
      setExistingCID(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const field = (key: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const bmi = calcBMI(form.weightKg, form.heightCm);

  const handleSubmit = async () => {
    if (!form.fullName.trim())  { alert("Full name is required."); return; }
    if (!form.bloodType)        { alert("Blood type is required."); return; }
    if (!contract) return;

    try {
      setStep("processing");
      setProcessMsg("Generating health profile PDF...");
      const pdfFile = generateProfilePDF(form, account);

      setProcessMsg("Uploading to IPFS via Pinata...");
      const ipfsResponse = await uploadFile(pdfFile);

      setProcessMsg("Saving to blockchain...");
      const tx = await contract.uploadPatientProfile(
        ipfsResponse.cid,
        convertToBytes32(ipfsResponse.hash)
      );
      await tx.wait();

      setSuccessCID(ipfsResponse.cid);
      setExistingCID(ipfsResponse.cid);
      setStep("success");
    } catch (error) {
      alert(handleError(error));
      setStep("form");
    }
  };

  // ── Loading ──
  if (loadingProfile) {
    return (
      <div className="pd-card">
        <div className="pd-loading">
          <div className="pd-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // ── Processing ──
  if (step === "processing") {
    return (
      <div className="pd-card pp-center">
        <div className="pd-spinner pp-spinner-lg" />
        <p className="pp-process-msg">{processMsg}</p>
      </div>
    );
  }

  // ── Success ──
  if (step === "success") {
    return (
      <div className="pd-card pp-center">
        <div className="pp-success-icon">✓</div>
        <p className="pp-success-title">Profile Saved</p>
        <p className="pp-success-sub">
          Your health profile has been uploaded and saved on-chain.
        </p>
        <a
          href={`https://gateway.pinata.cloud/ipfs/${successCID}`}
          target="_blank"
          rel="noreferrer"
          className="pd-btn pd-btn--view pp-btn-wide"
        >
          View Profile PDF
        </a>
        <button
          className="pd-btn pd-btn--cancel pp-btn-wide"
          onClick={() => setStep("view")}
        >
          Back
        </button>
      </div>
    );
  }

  // ── View existing ──
  if (step === "view") {
    return (
      <div className="pd-card">
        <p className="pd-card-title">My Health Profile</p>
        {existingCID ? (
          <div className="pp-existing">
            <div className="pp-existing-info">
              <div className="pp-existing-icon">📋</div>
              <div>
                <p className="pp-existing-title">Health profile on file</p>
                <p className="pp-existing-sub">
                  Stored securely on IPFS. Only you and doctors with active
                  emergency access can view it.
                </p>
              </div>
            </div>
            <div className="pp-existing-actions">
              <a
                href={`https://gateway.pinata.cloud/ipfs/${existingCID}`}
                target="_blank"
                rel="noreferrer"
                className="pd-btn pd-btn--view"
              >
                View PDF
              </a>
              <button
                className="pd-btn pd-btn--share"
                onClick={() => { setForm(EMPTY_FORM); setStep("form"); }}
              >
                Update Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="pp-empty-state">
            <div className="pp-empty-icon">🩺</div>
            <p className="pp-empty-title">No health profile yet</p>
            <p className="pp-empty-sub">
              Create a health profile with your essential medical details.
              In an emergency, any doctor can access it immediately.
            </p>
            <button
              className="pd-btn pd-btn--blue-full pp-btn-create"
              onClick={() => { setForm(EMPTY_FORM); setStep("form"); }}
            >
              Create Health Profile
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="pd-card">
      <div className="pp-form-header">
        <p className="pd-card-title">
          {existingCID ? "Update Health Profile" : "Create Health Profile"}
        </p>
        <p className="pp-form-note">
          Fields marked <span className="pp-required">*</span> are required.
          All other fields are optional but strongly recommended for emergency care.
        </p>
      </div>

      <div className="pp-form-grid">

        {/* ── HIGH RISK ALERTS — top of form, high visibility ── */}
        <div className="pp-section pp-section--full pp-section--alert">
          <p className="pp-section-label pp-section-label--alert">
            ⚠ High Risk Alerts
          </p>
          <p className="pp-section-hint">
            Critical conditions that must be known immediately in an emergency.
            These appear as a banner at the top of your profile PDF.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={3}
            value={form.highRiskAlerts}
            onChange={field("highRiskAlerts")}
            placeholder={
              "Bleeding disorder\nOrgan transplant patient\nImmunocompromised\nPregnant — 28 weeks\nOn blood thinners"
            }
          />
        </div>

        {/* ── BASIC INFORMATION ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Basic Information</p>
          <div className="pp-fields">

            <div className="pp-field pp-field--full">
              <label>Full Name <span className="pp-required">*</span></label>
              <input
                className="pd-input"
                value={form.fullName}
                onChange={field("fullName")}
                placeholder="e.g. Rajan Kumar"
              />
            </div>

            <div className="pp-field">
              <label>Date of Birth</label>
              <input
                className="pd-input"
                type="date"
                value={form.dateOfBirth}
                onChange={field("dateOfBirth")}
              />
            </div>

            <div className="pp-field">
              <label>Blood Type <span className="pp-required">*</span></label>
              <select
                className="pd-input"
                value={form.bloodType}
                onChange={field("bloodType")}
              >
                <option value="">Select...</option>
                {BLOOD_TYPES.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div className="pp-field">
              <label>Weight (kg) <span className="pp-required">*</span></label>
              <input
                className="pd-input"
                type="number"
                min="1"
                max="300"
                value={form.weightKg}
                onChange={field("weightKg")}
                placeholder="e.g. 72"
              />
            </div>

            <div className="pp-field">
              <label>Height (cm)</label>
              <input
                className="pd-input"
                type="number"
                min="50"
                max="250"
                value={form.heightCm}
                onChange={field("heightCm")}
                placeholder="e.g. 175"
              />
            </div>

            {/* Live BMI preview */}
            {bmi && (
              <div className="pp-field pp-field--full">
                <div className="pp-bmi-preview">
                  <span className="pp-bmi-label">BMI</span>
                  <span className="pp-bmi-value">{bmi}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── EMERGENCY CONTACT ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Emergency Contact</p>
          <div className="pp-fields">
            <div className="pp-field">
              <label>Contact Name</label>
              <input
                className="pd-input"
                value={form.emergencyName}
                onChange={field("emergencyName")}
                placeholder="e.g. Priya Kumar"
              />
            </div>
            <div className="pp-field">
              <label>Phone Number</label>
              <input
                className="pd-input"
                value={form.emergencyPhone}
                onChange={field("emergencyPhone")}
                placeholder="e.g. +91-9876543210"
              />
            </div>
            <div className="pp-field pp-field--full">
              <label>Relation</label>
              <input
                className="pd-input"
                value={form.emergencyRelation}
                onChange={field("emergencyRelation")}
                placeholder="e.g. Spouse, Parent, Sibling"
              />
            </div>
          </div>
        </div>

        {/* ── ALLERGIES ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Allergies & Reactions</p>
          <p className="pp-section-hint">
            Include the allergen and severity. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={4}
            value={form.allergies}
            onChange={field("allergies")}
            placeholder={
              "Penicillin — Severe (Anaphylaxis)\nPeanuts — Moderate (Hives)\nLatex — Mild\nAspirin — Severe (Bronchospasm)"
            }
          />
        </div>

        {/* ── CURRENT MEDICATIONS ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Current Medications</p>
          <p className="pp-section-hint">
            Include drug name, dosage, frequency, and last taken time if known. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={4}
            value={form.currentMedications}
            onChange={field("currentMedications")}
            placeholder={
              "Metformin 500mg — twice daily — last taken: this morning\nAtorvastatin 10mg — once at night\nInsulin Glargine 20U — bedtime injection\nAmlodipine 5mg — once daily"
            }
          />
        </div>

        {/* ── CHRONIC CONDITIONS ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Chronic Conditions & Risk Level</p>
          <p className="pp-section-hint">
            Include condition name and current control/risk level. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={4}
            value={form.chronicConditions}
            onChange={field("chronicConditions")}
            placeholder={
              "Type 2 Diabetes — insulin dependent\nHypertension — uncontrolled\nAsthma — mild intermittent\nEpilepsy — seizure risk (last seizure: 3 months ago)"
            }
          />
        </div>

        {/* ── RECENT DIAGNOSES ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Recent Major Diagnoses</p>
          <p className="pp-section-hint">
            Diagnoses from the last 1–2 years. Include month and year. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={3}
            value={form.recentDiagnoses}
            onChange={field("recentDiagnoses")}
            placeholder={
              "Cardiac Arrhythmia — January 2026\nDVT (Deep Vein Thrombosis) — October 2025"
            }
          />
        </div>

        {/* ── PAST SURGERIES ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Past Surgeries / Procedures</p>
          <p className="pp-section-hint">
            Include procedure name and year. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={3}
            value={form.pastSurgeries}
            onChange={field("pastSurgeries")}
            placeholder={
              "Appendectomy — 2018\nKnee arthroscopy — 2021\nCoronary bypass — 2023"
            }
          />
        </div>

        {/* ── MEDICAL IMPLANTS ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Medical Implants & Devices</p>
          <p className="pp-section-hint">
            Critical for MRI, surgery, and defibrillation decisions. One per line.
          </p>
          <textarea
            className="pd-input pp-textarea"
            rows={3}
            value={form.implants}
            onChange={field("implants")}
            placeholder={
              "Pacemaker — implanted 2020 (MRI conditional)\nMetal rod — left femur — 2019\nInsulin pump — active"
            }
          />
        </div>

        {/* ── TREATING DOCTOR ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Treating Doctor / Hospital <span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>(optional)</span></p>
          <textarea
            className="pd-input pp-textarea"
            rows={2}
            value={form.treatingDoctor}
            onChange={field("treatingDoctor")}
            placeholder={
              "Dr. Anita Sharma — Apollo Hospital, Mumbai — +91-22-12345678"
            }
          />
        </div>

        {/* ── ORGAN DONOR ── */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Organ Donor Status <span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>(optional)</span></p>
          <input
            className="pd-input"
            value={form.organDonor}
            onChange={field("organDonor")}
            placeholder="e.g. Registered donor — all organs, or Not a donor"
          />
        </div>

      </div>

      {/* ── Actions ── */}
      <div className="pp-form-actions">
        <button className="pd-btn pd-btn--cancel" onClick={() => setStep("view")}>
          Cancel
        </button>
        <button
          className="pd-btn pd-btn--blue-full pp-submit-btn"
          onClick={handleSubmit}
          disabled={!form.fullName.trim() || !form.bloodType || !form.weightKg.trim()}
        >
          {existingCID ? "Update & Save Profile" : "Generate & Save Profile"}
        </button>
      </div>
    </div>
  );
}
