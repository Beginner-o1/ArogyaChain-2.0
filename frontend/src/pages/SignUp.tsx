import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate, useSearchParams } from "react-router-dom";
import contractData from "../abi/Contract.json";
import { CONTRACT_ADDRESS } from "../config";
import "../styling/Signup.css";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

const ROLES = [
  {
    id: "patient",
    label: "Patient",
    desc: "Manage your own health records and control access.",
    dot: "blue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    fields: [],
  },
  {
    id: "doctor",
    label: "Doctor",
    desc: "Upload medical records for patients who grant permission.",
    dot: "teal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    fields: [
      { key: "fullName",      label: "Full Name",      placeholder: "Dr. Sarah Mitchell", required: true },
      { key: "licenseNumber", label: "License Number", placeholder: "MCI-2024-78432",     required: true },
      { key: "contactEmail",  label: "Contact Email",  placeholder: "sarah@hospital.com", required: false },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    desc: "Access prescriptions patients specifically authorize.",
    dot: "amber",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    fields: [
      { key: "pharmacyName",  label: "Pharmacy Name",  placeholder: "MedPlus Pharmacy",   required: true },
      { key: "licenseNumber", label: "License Number", placeholder: "PH-TN-2024-00321",   required: true },
      { key: "location",      label: "Location",       placeholder: "Chennai, Tamil Nadu", required: true },
      { key: "contactEmail",  label: "Contact Email",  placeholder: "medplus@example.com", required: false },
      { key: "contactPhone",  label: "Contact Phone",  placeholder: "+91-9876543210",      required: false },
    ],
  },
  {
    id: "scanCenter",
    label: "Scan Center",
    desc: "Upload diagnostic imaging for authorized patients.",
    dot: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    fields: [
      { key: "centerName",    label: "Center Name",    placeholder: "ClearView Radiology", required: true },
      { key: "licenseNumber", label: "License Number", placeholder: "SC-KA-2024-11245",    required: true },
      { key: "location",      label: "Location",       placeholder: "Bangalore, Karnataka",required: true },
      { key: "contactEmail",  label: "Contact Email",  placeholder: "info@clearview.com",  required: false },
      { key: "contactPhone",  label: "Contact Phone",  placeholder: "+91-9876543210",      required: false },
    ],
  },
];

const DOT_COLORS: Record<string, string> = {
  blue: "#63b3ed", teal: "#4fd1c5", amber: "#f6ad55", green: "#68d391",
};

// ── Pending Approval Screen ────────────────────────────────────
function PendingScreen({ role, address }: { role: string; address: string }) {
  const truncate = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050c14", padding: "24px",
    }}>
      <div className="ac-grid-bg" />
      <div className="ac-orb ac-orb-1" />
      <div className="ac-orb ac-orb-2" />
      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(10,20,38,0.85)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(99,179,237,0.18)", borderRadius: "20px",
        padding: "48px 40px", maxWidth: 480, width: "100%", textAlign: "center",
      }}>
        {/* Animated clock icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px", boxShadow: "0 0 32px rgba(245,158,11,0.2)",
          animation: "pulseWarn 2s ease-in-out infinite",
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f6ad55" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <div style={{
          fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
          color: "#e8f1fb", letterSpacing: "0.04em", marginBottom: 12,
        }}>
          Application Submitted
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "rgba(232,241,251,0.45)", lineHeight: 1.8, marginBottom: 28,
        }}>
          Your <span style={{ color: "#f6ad55" }}>{role}</span> registration is on-chain and
          awaiting admin approval. You'll be able to use the platform once approved.
        </div>

        {/* Info rows */}
        {[
          ["ROLE",    role],
          ["WALLET",  truncate(address)],
          ["STATUS",  "Pending Review"],
          ["NETWORK", "Sepolia Testnet"],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid rgba(99,179,237,0.08)",
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(232,241,251,0.3)", letterSpacing: "0.15em" }}>{k}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: k === "STATUS" ? "#f6ad55" : "rgba(232,241,251,0.7)",
            }}>{v}</span>
          </div>
        ))}

        <div style={{
          marginTop: 32, padding: "14px 16px", borderRadius: 10,
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "rgba(245,158,11,0.8)", lineHeight: 1.8, letterSpacing: "0.04em",
        }}>
          The admin reviews applications manually. Once approved, reconnect your wallet and sign in.
        </div>
      </div>

      <style>{`
        @keyframes pulseWarn {
          0%, 100% { box-shadow: 0 0 32px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 0 48px rgba(245,158,11,0.45); }
        }
      `}</style>
    </div>
  );
}

export default function Signup() {
  const [selected, setSelected]       = useState("patient");
  const [address, setAddress]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [networkOk, setNetworkOk]     = useState<boolean | null>(null);
  const [statusState, setStatusState] = useState("idle");
  const [statusMsg, setStatusMsg]     = useState("Choose a role and connect your wallet.");
  const [formValues, setFormValues]   = useState<Record<string, string>>({});
  const [panelOpen, setPanelOpen]     = useState(false);
  // New: after non-patient registration succeeds, show pending screen
  const [pendingApproval, setPendingApproval] = useState<{ role: string; address: string } | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasError = searchParams.get("error") === "not-registered";

  const selectedRole = ROLES.find(r => r.id === selected)!;
  const needsDetails = selectedRole.fields.length > 0;

  useEffect(() => {
    setFormValues({});
    setPanelOpen(needsDetails);
  }, [selected]);

  const setField = (key: string, val: string) =>
    setFormValues(prev => ({ ...prev, [key]: val }));

  const isFormValid = () => {
    if (!needsDetails) return true;
    return selectedRole.fields
      .filter(f => f.required)
      .every(f => (formValues[f.key] || "").trim().length > 0);
  };

  useEffect(() => {
    const check = async () => {
      if (!window.ethereum) return;
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setNetworkOk(chainId === SEPOLIA_CHAIN_ID);
    };
    check();
    window.ethereum?.on("chainChanged", (id: string) => setNetworkOk(id === SEPOLIA_CHAIN_ID));
  }, []);

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_CHAIN_ID,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      }
    }
  };

  const connectAndRegister = async () => {
    try {
      if (!window.ethereum) { alert("Install MetaMask to continue."); return; }

      setLoading(true);
      setStatusState("loading");
      setStatusMsg("Requesting wallet access…");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) {
        setNetworkOk(false);
        setStatusState("warn");
        setStatusMsg("Wrong network. Switch to Sepolia and try again.");
        setLoading(false);
        return;
      }

      setNetworkOk(true);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAddress(userAddress);

      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractData.abi, signer);
      setStatusMsg(`Sending registration as ${selectedRole.label}…`);

      let tx;
      if (selected === "patient") {
        tx = await contract.registerPatient();
      } else if (selected === "doctor") {
        tx = await contract.registerDoctor(
          formValues.fullName      || "",
          formValues.licenseNumber || "",
          formValues.contactEmail  || ""
        );
      } else if (selected === "pharmacy") {
        tx = await contract.registerPharmacy(
          formValues.pharmacyName  || "",
          formValues.licenseNumber || "",
          formValues.location      || "",
          formValues.contactEmail  || "",
          formValues.contactPhone  || ""
        );
      } else if (selected === "scanCenter") {
        tx = await contract.registerScanCenter(
          formValues.centerName    || "",
          formValues.licenseNumber || "",
          formValues.location      || "",
          formValues.contactEmail  || "",
          formValues.contactPhone  || ""
        );
      }

      setStatusMsg("Transaction submitted. Awaiting confirmation…");
      await tx.wait();

      setStatusState("ok");

      if (selected === "patient") {
        // Patients are active immediately
        setStatusMsg("Successfully registered as Patient! Redirecting…");
        setPanelOpen(false);
        setTimeout(() => navigate("/"), 2000);
      } else {
        // Providers go into pending — show the pending screen
        setPendingApproval({ role: selectedRole.label, address: userAddress });
      }

    } catch (error: any) {
      console.error(error);
      setStatusState("err");
      if (error?.code === 4001) {
        setStatusMsg("Transaction rejected by user.");
      } else if (error?.reason) {
        const reasonMap: Record<string, string> = {
          "E06": "This wallet is already registered.",
          "E16": "Your application is already pending review.",
          "E17": "This wallet has been permanently rejected by admin.",
        };
        setStatusMsg(reasonMap[error.reason] || `Contract error: ${error.reason}`);
      } else {
        setStatusMsg("Registration failed. You may already be registered or rejected.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Show pending screen after provider registration ──────────
  if (pendingApproval) {
    return <PendingScreen role={pendingApproval.role} address={pendingApproval.address} />;
  }

  const dotClass = { idle:"idle", loading:"spin", ok:"ok", warn:"warn", err:"err" }[statusState];
  const truncate = (a: string) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

  const HeartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#63b3ed" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );

  const accentColor = DOT_COLORS[selectedRole.dot];

  return (
    <>
      <div className="ac-grid-bg" />
      <div className="ac-orb ac-orb-1" />
      <div className="ac-orb ac-orb-2" />

      {/* ── Details slide-in panel ── */}
      <div className={`ac-details-overlay${panelOpen ? " open" : ""}`}>
        <div className="ac-details-backdrop" onClick={() => !loading && setPanelOpen(false)} />
        <div className="ac-details-panel">
          <button className="ac-panel-close" onClick={() => !loading && setPanelOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="ac-panel-header">
            <div className="ac-panel-eyebrow" style={{ color: accentColor }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: accentColor, boxShadow: `0 0 8px ${accentColor}`,
                display: "inline-block", flexShrink: 0,
              }} />
              Registration Details
            </div>
            <div className="ac-panel-title">{selectedRole.label} Profile</div>
            <div className="ac-panel-subtitle">
              Fields marked <span style={{ color: "var(--red)" }}>*</span> are required by the contract
            </div>

            {/* Pending approval notice for providers */}
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 8,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#f6ad55" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="15" height="15"
                style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "rgba(245,158,11,0.85)", lineHeight: 1.7,
              }}>
                {selectedRole.label} accounts require <strong>admin approval</strong> before activation.
                Your application will be reviewed after submission.
              </span>
            </div>
          </div>

          <div className="ac-panel-body">
            {selectedRole.fields.map((field) => (
              <div className="ac-field" key={field.key}>
                <label className="ac-field-label">
                  {field.label}
                  {field.required && <span className="ac-field-required">*</span>}
                </label>
                <input
                  className="ac-field-input"
                  type="text"
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ""}
                  onChange={e => setField(field.key, e.target.value)}
                  disabled={loading}
                  style={
                    field.required && (formValues[field.key] || "").trim() === "" && statusState === "err"
                      ? { borderColor: "rgba(252,129,129,0.5)" }
                      : {}
                  }
                />
              </div>
            ))}

            {statusState !== "idle" && (
              <div className={`ac-status st-${statusState}`} style={{ marginBottom: 0 }}>
                <span className={`ac-status-dot ${dotClass}`} />
                <div className="ac-status-body">
                  {statusMsg}
                  {address && <span className="ac-status-addr">{truncate(address)}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="ac-panel-footer">
            <button
              className="ac-btn ac-btn-primary"
              onClick={connectAndRegister}
              disabled={loading || !isFormValid()}
              style={isFormValid() ? {} : { opacity: 0.4 }}
            >
              {loading ? (
                <><span className="ac-spin" /> Processing…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Submit Application
                </>
              )}
            </button>
            {networkOk === false && (
              <button className="ac-btn ac-btn-ghost" onClick={switchToSepolia} disabled={loading}>
                Switch to Sepolia Testnet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="ac-root">
        <div className="ac-left">
          <div className="ac-logo">
            <div className="ac-logo-icon"><HeartIcon /></div>
            <div className="ac-logo-text">
              <span className="ac-logo-name">AROGYACHAIN</span>
              <span className="ac-logo-sub">Decentralized Health Records</span>
            </div>
          </div>
          <h1 className="ac-headline">
            JOIN THE<br />
            <span className="ac-headline-accent">NETWORK.</span>
          </h1>
          <p className="ac-sub">
            Register your wallet once on-chain. Your role is stored permanently
            in the smart contract — no backend, no passwords, no central authority.
          </p>
          <div className="ac-features">
            {[
              ["blue",  "One-time on-chain registration per wallet"],
              ["teal",  "Role enforced at the contract level — not the UI"],
              ["amber", "Providers require admin approval before activation"],
              ["green", "All actions are publicly auditable on Sepolia"],
            ].map(([color, text], i) => (
              <div className="ac-feat" key={i}>
                <span className={`ac-feat-dot ac-feat-dot-${color}`} />
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="ac-right">
          <div className="ac-card">
            <div className="ac-card-eyebrow">
              <span>Registration</span>
              <div className="ac-card-eyebrow-line" />
            </div>

            <div className="ac-card-title">Create Account</div>
            <div className="ac-card-desc">
              Patients are activated instantly. Doctors, Pharmacies, and Scan Centers require admin approval.
            </div>

            {hasError && (
              <div style={{
                padding:"14px 16px", marginBottom:"20px", borderRadius:"12px",
                border:"1px solid rgba(252,129,129,0.35)", background:"rgba(252,129,129,0.07)",
                display:"flex", alignItems:"start", gap:"12px"
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fc8181" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20"
                  style={{ flexShrink:0, marginTop:"2px" }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"13px", fontWeight:700, color:"#fc8181", marginBottom:"4px" }}>
                    Account Not Registered
                  </p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"rgba(252,129,129,0.7)", lineHeight:"1.6" }}>
                    Your wallet is not registered. Select a role below and complete registration.
                  </p>
                </div>
              </div>
            )}

            {/* Role selector */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"22px" }}>
              {ROLES.map((role) => {
                const isActive = selected === role.id;
                const color = DOT_COLORS[role.dot];
                const isProvider = role.fields.length > 0;
                return (
                  <button
                    key={role.id}
                    onClick={() => { setSelected(role.id); if (isProvider) setPanelOpen(true); }}
                    disabled={loading}
                    style={{
                      display:"flex", alignItems:"center", gap:"14px",
                      padding:"12px 16px", borderRadius:"12px",
                      border:`1px solid ${isActive ? `${color}55` : "rgba(99,179,237,0.14)"}`,
                      background: isActive ? `${color}18` : "rgba(99,179,237,0.03)",
                      cursor: loading ? "not-allowed" : "pointer",
                      textAlign:"left", transition:"all 0.18s ease",
                      opacity: loading ? 0.6 : 1,
                      boxShadow: isActive ? `0 0 16px ${color}22` : "none",
                    }}
                  >
                    <span style={{
                      width:8, height:8, borderRadius:"50%", flexShrink:0,
                      background: isActive ? color : "rgba(232,241,251,0.2)",
                      boxShadow: isActive ? `0 0 8px ${color}` : "none",
                      transition:"all 0.18s ease",
                    }} />
                    <span style={{
                      color: isActive ? color : "rgba(232,241,251,0.35)",
                      transition:"color 0.18s ease", display:"flex", alignItems:"center",
                    }}>
                      {role.icon}
                    </span>
                    <span style={{ flex:1 }}>
                      <span style={{
                        display:"block", fontFamily:"'Syne',sans-serif",
                        fontSize:13, fontWeight:700,
                        color: isActive ? "#e8f1fb" : "rgba(232,241,251,0.5)",
                        letterSpacing:"0.04em", transition:"color 0.18s ease",
                      }}>
                        {role.label}
                        {/* Approval badge for providers */}
                        {isProvider && (
                          <span style={{
                            marginLeft: 8, fontSize: 8, letterSpacing: "0.1em",
                            background: "rgba(245,158,11,0.15)",
                            border: "1px solid rgba(245,158,11,0.3)",
                            color: "#f6ad55", borderRadius: 3, padding: "1px 5px",
                            verticalAlign: "middle",
                          }}>
                            NEEDS APPROVAL
                          </span>
                        )}
                      </span>
                      <span style={{
                        display:"block", fontFamily:"'JetBrains Mono',monospace",
                        fontSize:10, letterSpacing:"0.06em",
                        color:"rgba(232,241,251,0.35)", marginTop:2,
                      }}>
                        {role.desc}
                      </span>
                    </span>

                    {isProvider ? (
                      <div style={{
                        display:"flex", alignItems:"center", gap:5, flexShrink:0,
                        fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                        color: isActive ? color : "rgba(232,241,251,0.2)",
                        letterSpacing:"0.08em", transition:"color 0.18s ease",
                      }}>
                        {isActive ? "EDIT" : "DETAILS"}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    ) : (
                      isActive && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#63b3ed"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          width="14" height="14" style={{ flexShrink:0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {(selected === "patient" || statusState !== "idle") && (
              <div className={`ac-status st-${statusState}`}>
                <span className={`ac-status-dot ${dotClass}`} />
                <div className="ac-status-body">
                  {statusMsg}
                  {address && <span className="ac-status-addr">{truncate(address)}</span>}
                </div>
              </div>
            )}

            {selected === "patient" && (
              <button
                className="ac-btn ac-btn-primary"
                onClick={connectAndRegister}
                disabled={loading}
              >
                {loading ? (
                  <><span className="ac-spin" /> Processing…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Register as Patient
                  </>
                )}
              </button>
            )}

            {selected !== "patient" && !panelOpen && (
              <button
                className="ac-btn ac-btn-primary"
                onClick={() => setPanelOpen(true)}
                disabled={loading}
                style={{ background: `linear-gradient(135deg, ${accentColor}aa, ${accentColor})`, color:"#050c14" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Fill in {selectedRole.label} Details
              </button>
            )}

            {networkOk === false && selected === "patient" && (
              <button className="ac-btn ac-btn-ghost" onClick={switchToSepolia} disabled={loading}>
                Switch to Sepolia Testnet
              </button>
            )}

            <div className="ac-info-grid">
              <div className="ac-info-row">
                <span className="ac-info-key">SELECTED ROLE</span>
                <span className="ac-info-val">{selectedRole.label}</span>
              </div>
              <div className="ac-info-row">
                <span className="ac-info-key">ACTIVATION</span>
                <span className={`ac-info-val ${selected === "patient" ? "ok" : "warn"}`}>
                  {selected === "patient" ? "Instant ✓" : "Requires Approval"}
                </span>
              </div>
              <div className="ac-info-row">
                <span className="ac-info-key">NETWORK</span>
                <span className={`ac-info-val ${networkOk === true ? "ok" : networkOk === false ? "err" : ""}`}>
                  {networkOk === true ? "Sepolia ✓" : networkOk === false ? "Wrong Network" : "—"}
                </span>
              </div>
              <div className="ac-info-row">
                <span className="ac-info-key">DETAILS</span>
                <span className={`ac-info-val ${!needsDetails ? "ok" : isFormValid() ? "ok" : "warn"}`}>
                  {!needsDetails ? "Not required" : isFormValid() ? "Complete ✓" : "Incomplete"}
                </span>
              </div>
            </div>

            <div className="ac-card-footer">
              Already registered?{" "}
              <span className="ac-link" onClick={() => navigate("/login")}>Sign in here</span>
              <br />
              One registration per wallet · Immutable on Sepolia
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
