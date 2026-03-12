import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { uploadFile } from "../../services/api";
import { handleError, convertToBytes32 } from "../../utils/helpers";

interface PatientProfileProps {
  contract: any;
  account: string;
}

interface ProfileForm {
  fullName:          string;
  dateOfBirth:       string;
  bloodType:         string;
  allergies:         string;
  currentMedications: string;
  emergencyName:     string;
  emergencyPhone:    string;
  emergencyRelation: string;
  chronicConditions: string;
  pastSurgeries:     string;
}

const EMPTY_FORM: ProfileForm = {
  fullName:           "",
  dateOfBirth:        "",
  bloodType:          "",
  allergies:          "",
  currentMedications: "",
  emergencyName:      "",
  emergencyPhone:     "",
  emergencyRelation:  "",
  chronicConditions:  "",
  pastSurgeries:      "",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

type Step = "view" | "form" | "processing" | "success";

export default function PatientProfile({ contract, account }: PatientProfileProps) {
  const [step,        setStep]        = useState<Step>("view");
  const [form,        setForm]        = useState<ProfileForm>(EMPTY_FORM);
  const [existingCID, setExistingCID] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [processMsg,  setProcessMsg]  = useState("");
  const [successCID,  setSuccessCID]  = useState("");

  useEffect(() => {
    loadExistingProfile();
  }, [contract]);

  const loadExistingProfile = async () => {
    if (!contract) return;
    try {
      setLoadingProfile(true);
      const [cid] = await contract.getMyProfileCID();
      setExistingCID(cid);
    } catch {
      setExistingCID(null); // E14 — no profile yet
    } finally {
      setLoadingProfile(false);
    }
  };

  const field = (key: keyof ProfileForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ── PDF Generation ── */
  const generateProfilePDF = (): File => {
    const doc    = new jsPDF({ unit: "mm", format: "a4" });
    const W      = 210;
    const margin = 14;
    const col    = W - margin * 2;
    let   y      = 0;

    const hex   = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as [number,number,number];
    const rgb   = (r:number,g:number,b:number) => doc.setTextColor(r,g,b);
    const fill  = (h:string) => { const [r,g,b]=hex(h); doc.setFillColor(r,g,b); };
    const draw  = (h:string) => { const [r,g,b]=hex(h); doc.setDrawColor(r,g,b); };

    // ── Dark header ──
    fill("#0d0f14"); doc.rect(0, 0, W, 38, "F");
    fill("#3b82f6"); doc.rect(0, 0, W, 3,  "F");
    rgb(59,130,246); doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text("AROGYACHAIN", margin, 14);
    rgb(226,232,240); doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.text("Patient Health Profile", margin, 24);
    rgb(100,116,139); doc.setFontSize(8); doc.setFont("helvetica","normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 32);
    doc.text(`Wallet: ${account}`, W - margin, 32, { align: "right" });
    y = 46;

    const sectionHeader = (title: string) => {
      fill("#eff6ff"); draw("#3b82f6");
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, col, 8, 1, 1, "FD");
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      const [r,g,b] = hex("#2563eb");
      doc.setTextColor(r,g,b);
      doc.text(title.toUpperCase(), margin + 3, y + 5.5);
      y += 13;
    };

    const row = (label: string, value: string) => {
      if (!value.trim()) return;
      doc.setFont("helvetica","bold"); doc.setFontSize(9); rgb(148,163,184);
      doc.text(label + ":", margin + 2, y);
      doc.setFont("helvetica","normal"); rgb(30,41,59);
      const lines = doc.splitTextToSize(value, col - 36);
      doc.text(lines, margin + 36, y);
      y += lines.length * 5 + 3;
    };

    const checkPageBreak = (needed = 20) => {
      if (y + needed > 275) { doc.addPage(); y = 16; }
    };

    // ── Basic Info ──
    sectionHeader("Basic Information");
    row("Full Name",    form.fullName    || "Not provided");
    row("Date of Birth", form.dateOfBirth || "Not provided");
    row("Blood Type",   form.bloodType   || "Not provided");
    y += 4; checkPageBreak();

    // ── Emergency Contact ──
    sectionHeader("Emergency Contact");
    row("Name",       form.emergencyName     || "Not provided");
    row("Phone",      form.emergencyPhone    || "Not provided");
    row("Relation",   form.emergencyRelation || "Not provided");
    y += 4; checkPageBreak();

    // ── Allergies ──
    sectionHeader("Allergies");
    doc.setFont("helvetica","normal"); doc.setFontSize(9); rgb(30,41,59);
    const allergyLines = doc.splitTextToSize(form.allergies || "None reported", col - 4);
    doc.text(allergyLines, margin + 2, y);
    y += allergyLines.length * 5 + 8; checkPageBreak();

    // ── Current Medications ──
    sectionHeader("Current Medications");
    const medLines = doc.splitTextToSize(form.currentMedications || "None reported", col - 4);
    doc.text(medLines, margin + 2, y);
    y += medLines.length * 5 + 8; checkPageBreak();

    // ── Chronic Conditions ──
    sectionHeader("Chronic Conditions");
    const condLines = doc.splitTextToSize(form.chronicConditions || "None reported", col - 4);
    doc.text(condLines, margin + 2, y);
    y += condLines.length * 5 + 8; checkPageBreak();

    // ── Past Surgeries ──
    sectionHeader("Past Surgeries / Procedures");
    const surgLines = doc.splitTextToSize(form.pastSurgeries || "None reported", col - 4);
    doc.text(surgLines, margin + 2, y);

    // ── Footer ──
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      fill("#0d0f14"); doc.rect(0, 285, W, 12, "F");
      rgb(71,85,105); doc.setFontSize(7); doc.setFont("helvetica","normal");
      doc.text("ArogyaChain — Decentralized Health Records", margin, 291);
      doc.text(`Page ${i} of ${pages}`, W - margin, 291, { align: "right" });
    }

    const blob = doc.output("blob");
    return new File([blob], `patient-profile-${account.slice(0,8)}.pdf`, { type: "application/pdf" });
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!form.fullName.trim()) { alert("Full name is required."); return; }
    if (!contract) return;

    try {
      setStep("processing");

      setProcessMsg("Generating health profile PDF...");
      const pdfFile = generateProfilePDF();

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

  /* ── Render: Loading ── */
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

  /* ── Render: Processing ── */
  if (step === "processing") {
    return (
      <div className="pd-card pp-center">
        <div className="pd-spinner pp-spinner-lg" />
        <p className="pp-process-msg">{processMsg}</p>
      </div>
    );
  }

  /* ── Render: Success ── */
  if (step === "success") {
    return (
      <div className="pd-card pp-center">
        <div className="pp-success-icon">✓</div>
        <p className="pp-success-title">Profile Saved</p>
        <p className="pp-success-sub">Your health profile has been uploaded and saved on-chain.</p>
        <a
          href={`https://gateway.pinata.cloud/ipfs/${successCID}`}
          target="_blank"
          rel="noreferrer"
          className="pd-btn pd-btn--view pp-btn-wide"
        >
          View Profile PDF
        </a>
        <button className="pd-btn pd-btn--cancel pp-btn-wide" onClick={() => setStep("view")}>
          Back
        </button>
      </div>
    );
  }

  /* ── Render: View existing ── */
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
                  Your profile is stored securely on IPFS. Only you and doctors
                  with active emergency access can view it.
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
              In an emergency, any doctor can access it along with your full records.
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

  /* ── Render: Form ── */
  return (
    <div className="pd-card">
      <div className="pp-form-header">
        <p className="pd-card-title">
          {existingCID ? "Update Health Profile" : "Create Health Profile"}
        </p>
        <p className="pp-form-note">
          Fields left blank will appear as "Not provided" in the PDF.
          Only <strong>Full Name</strong> is required.
        </p>
      </div>

      <div className="pp-form-grid">

        {/* Basic Info */}
        <div className="pp-section">
          <p className="pp-section-label">Basic Information</p>
          <div className="pp-fields">
            <div className="pp-field pp-field--full">
              <label>Full Name <span className="pp-required">*</span></label>
              <input className="pd-input" value={form.fullName}
                onChange={(e) => field("fullName", e.target.value)}
                placeholder="e.g. Rajan Kumar" />
            </div>
            <div className="pp-field">
              <label>Date of Birth</label>
              <input className="pd-input" type="date" value={form.dateOfBirth}
                onChange={(e) => field("dateOfBirth", e.target.value)} />
            </div>
            <div className="pp-field">
              <label>Blood Type</label>
              <select className="pd-input" value={form.bloodType}
                onChange={(e) => field("bloodType", e.target.value)}>
                <option value="">Select...</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="pp-section">
          <p className="pp-section-label">Emergency Contact</p>
          <div className="pp-fields">
            <div className="pp-field">
              <label>Contact Name</label>
              <input className="pd-input" value={form.emergencyName}
                onChange={(e) => field("emergencyName", e.target.value)}
                placeholder="e.g. Priya Kumar" />
            </div>
            <div className="pp-field">
              <label>Phone Number</label>
              <input className="pd-input" value={form.emergencyPhone}
                onChange={(e) => field("emergencyPhone", e.target.value)}
                placeholder="e.g. +91-9876543210" />
            </div>
            <div className="pp-field pp-field--full">
              <label>Relation</label>
              <input className="pd-input" value={form.emergencyRelation}
                onChange={(e) => field("emergencyRelation", e.target.value)}
                placeholder="e.g. Spouse, Parent, Sibling" />
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Allergies</p>
          <textarea className="pd-input pp-textarea" rows={3}
            value={form.allergies}
            onChange={(e) => field("allergies", e.target.value)}
            placeholder="e.g. Penicillin, Peanuts, Latex — list one per line or comma separated" />
        </div>

        {/* Current Medications */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Current Medications</p>
          <textarea className="pd-input pp-textarea" rows={3}
            value={form.currentMedications}
            onChange={(e) => field("currentMedications", e.target.value)}
            placeholder="e.g. Metformin 500mg twice daily, Atorvastatin 10mg at night" />
        </div>

        {/* Chronic Conditions */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Chronic Conditions</p>
          <textarea className="pd-input pp-textarea" rows={3}
            value={form.chronicConditions}
            onChange={(e) => field("chronicConditions", e.target.value)}
            placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma" />
        </div>

        {/* Past Surgeries */}
        <div className="pp-section pp-section--full">
          <p className="pp-section-label">Past Surgeries / Procedures</p>
          <textarea className="pd-input pp-textarea" rows={3}
            value={form.pastSurgeries}
            onChange={(e) => field("pastSurgeries", e.target.value)}
            placeholder="e.g. Appendectomy 2018, Knee arthroscopy 2021" />
        </div>

      </div>

      <div className="pp-form-actions">
        <button className="pd-btn pd-btn--cancel" onClick={() => setStep("view")}>
          Cancel
        </button>
        <button
          className="pd-btn pd-btn--blue-full pp-submit-btn"
          onClick={handleSubmit}
          disabled={!form.fullName.trim()}
        >
          {existingCID ? "Update & Save Profile" : "Generate & Save Profile"}
        </button>
      </div>
    </div>
  );
}
