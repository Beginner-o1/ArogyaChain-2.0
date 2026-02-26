import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useNavigate, useSearchParams } from "react-router-dom";
import contractData from "../abi/Contract.json";
import { CONTRACT_ADDRESS } from "../config";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

// Roles available on this contract
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
  },
];

const CONTRACT_METHODS = {
  patient:    "registerPatient",
  doctor:     "registerDoctor",
  pharmacy:   "registerPharmacy",
  scanCenter: "registerScanCenter",
};

export default function Signup() {
  const [selected, setSelected]       = useState("patient");
  const [address, setAddress]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [networkOk, setNetworkOk]     = useState<boolean | null>(null);
  const [statusState, setStatusState] = useState("idle");
  const [statusMsg, setStatusMsg]     = useState("Choose a role and connect your wallet.");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasError = searchParams.get("error") === "not-registered";

  // Re-use the same injected styles from Login (they share the same stylesheet id)
  useEffect(() => {
    if (document.getElementById("arogyachain-styles")) return;
    const style = document.createElement("style");
    style.id = "arogyachain-styles";
    // (same CSS block — in real project, import a shared CSS module)
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --bg:#050c14;--panel:#080f1c;--border:rgba(99,179,237,0.16);--border-h:rgba(99,179,237,0.45);
        --blue:#63b3ed;--blue-glow:rgba(99,179,237,0.35);--blue-dim:rgba(99,179,237,0.08);
        --teal:#4fd1c5;--amber:#f6ad55;--red:#fc8181;--green:#68d391;
        --text:#e8f1fb;--muted:rgba(232,241,251,0.42);--mono:'JetBrains Mono',monospace;
      }
      html,body{height:100%;background:var(--bg);}
      .ac-root{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;font-family:'Syne',sans-serif;color:var(--text);-webkit-font-smoothing:antialiased;}
      .ac-grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(99,179,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,0.04) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 20%,transparent 100%);}
      .ac-orb{position:fixed;border-radius:50%;filter:blur(100px);z-index:0;pointer-events:none;}
      .ac-orb-1{width:600px;height:600px;top:-200px;left:-200px;background:radial-gradient(circle,rgba(99,179,237,0.10) 0%,transparent 70%);animation:acBreathe 10s ease-in-out infinite;}
      .ac-orb-2{width:480px;height:480px;bottom:-160px;right:-120px;background:radial-gradient(circle,rgba(79,209,197,0.09) 0%,transparent 70%);animation:acBreathe 10s ease-in-out infinite reverse;}
      @keyframes acBreathe{0%,100%{transform:scale(1);opacity:0.7;}50%{transform:scale(1.1) translate(10px,-10px);opacity:1;}}
      .ac-left{position:relative;z-index:10;display:flex;flex-direction:column;justify-content:center;padding:72px 64px;border-right:1px solid var(--border);background:linear-gradient(135deg,rgba(99,179,237,0.03) 0%,transparent 50%);animation:acSlideLeft 0.7s cubic-bezier(.22,1,.36,1) both;}
      .ac-logo{display:flex;align-items:center;gap:14px;margin-bottom:72px;}
      .ac-logo-icon{width:48px;height:48px;border-radius:12px;border:1.5px solid var(--blue);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px var(--blue-glow),inset 0 0 14px rgba(99,179,237,0.07);}
      .ac-logo-text{display:flex;flex-direction:column;gap:2px;}
      .ac-logo-name{font-size:20px;font-weight:800;letter-spacing:0.14em;color:var(--blue);text-shadow:0 0 20px var(--blue-glow);}
      .ac-logo-sub{font-family:var(--mono);font-size:9px;letter-spacing:0.22em;color:var(--muted);text-transform:uppercase;}
      .ac-headline{font-size:clamp(48px,5.5vw,76px);font-weight:800;line-height:0.95;letter-spacing:-0.01em;color:var(--text);margin-bottom:24px;}
      .ac-headline-accent{color:var(--blue);display:block;text-shadow:0 0 40px var(--blue-glow);}
      .ac-sub{font-size:15px;font-weight:400;color:var(--muted);line-height:1.75;max-width:380px;margin-bottom:56px;}
      .ac-features{display:flex;flex-direction:column;gap:12px;}
      .ac-feat{display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;color:var(--muted);animation:acSlideLeft 0.7s cubic-bezier(.22,1,.36,1) both;}
      .ac-feat:nth-child(1){animation-delay:0.08s;}.ac-feat:nth-child(2){animation-delay:0.16s;}.ac-feat:nth-child(3){animation-delay:0.24s;}.ac-feat:nth-child(4){animation-delay:0.32s;}
      .ac-feat-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
      .ac-feat-dot-blue{background:var(--blue);box-shadow:0 0 7px var(--blue);}.ac-feat-dot-teal{background:var(--teal);box-shadow:0 0 7px var(--teal);}.ac-feat-dot-amber{background:var(--amber);box-shadow:0 0 7px var(--amber);}.ac-feat-dot-green{background:var(--green);box-shadow:0 0 7px var(--green);}
      .ac-right{position:relative;z-index:10;display:flex;align-items:center;justify-content:center;padding:72px 64px;animation:acSlideRight 0.7s cubic-bezier(.22,1,.36,1) 0.1s both;}
      .ac-card{width:100%;max-width:420px;background:var(--panel);border:1px solid var(--border);border-radius:24px;padding:44px;position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(99,179,237,0.04),0 40px 80px rgba(0,0,0,0.55),0 0 100px rgba(99,179,237,0.04);}
      .ac-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 10%,var(--blue) 50%,transparent 90%);opacity:0.5;}
      .ac-card-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:0.22em;color:var(--blue);text-transform:uppercase;display:flex;align-items:center;gap:10px;margin-bottom:20px;}
      .ac-card-eyebrow-line{flex:1;height:1px;background:var(--border);}
      .ac-card-title{font-size:32px;font-weight:800;letter-spacing:0.02em;margin-bottom:6px;}
      .ac-card-desc{font-size:13px;color:var(--muted);font-weight:400;line-height:1.65;margin-bottom:32px;}
      .ac-status{display:flex;align-items:flex-start;gap:10px;border-radius:12px;padding:14px 16px;margin-bottom:22px;font-family:var(--mono);font-size:11px;letter-spacing:0.05em;border:1px solid var(--border);background:var(--blue-dim);min-height:50px;transition:all 0.3s ease;}
      .ac-status.st-idle{background:var(--blue-dim);border-color:var(--border);}.ac-status.st-ok{background:rgba(104,211,145,0.07);border-color:rgba(104,211,145,0.35);}.ac-status.st-warn{background:rgba(246,173,85,0.07);border-color:rgba(246,173,85,0.35);}.ac-status.st-err{background:rgba(252,129,129,0.07);border-color:rgba(252,129,129,0.35);}.ac-status.st-loading{background:rgba(99,179,237,0.06);border-color:rgba(99,179,237,0.25);}
      .ac-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:1px;transition:all 0.3s ease;}
      .ac-status-dot.ok{background:var(--green);box-shadow:0 0 8px var(--green);animation:acPulse 2s ease infinite;}.ac-status-dot.warn{background:var(--amber);box-shadow:0 0 8px var(--amber);}.ac-status-dot.err{background:var(--red);box-shadow:0 0 8px var(--red);}.ac-status-dot.idle{background:var(--muted);}.ac-status-dot.spin{background:var(--blue);box-shadow:0 0 8px var(--blue);animation:acPulse 1s ease infinite;}
      @keyframes acPulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
      .ac-status-body{flex:1;color:var(--muted);line-height:1.6;}
      .ac-status-addr{color:var(--blue);display:block;margin-top:3px;word-break:break-all;}
      .ac-btn{width:100%;padding:15px 20px;border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;letter-spacing:0.05em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;position:relative;overflow:hidden;transition:all 0.2s ease;}
      .ac-btn-primary{background:linear-gradient(135deg,#4a9fd4 0%,#63b3ed 60%,#76c2f5 100%);color:#050c14;box-shadow:0 0 28px rgba(99,179,237,0.28),0 6px 20px rgba(0,0,0,0.4);}
      .ac-btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 0 44px rgba(99,179,237,0.45),0 10px 28px rgba(0,0,0,0.4);}
      .ac-btn-primary:disabled{opacity:0.45;cursor:not-allowed;box-shadow:none;transform:none;}
      .ac-btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 35%,rgba(255,255,255,0.22) 50%,transparent 65%);transform:translateX(-100%);transition:transform 0.55s ease;}
      .ac-btn-primary:hover:not(:disabled)::after{transform:translateX(100%);}
      .ac-btn-ghost{background:transparent;color:var(--blue);border:1px solid var(--border);margin-top:10px;font-size:13px;font-weight:600;}
      .ac-btn-ghost:hover:not(:disabled){border-color:var(--border-h);background:var(--blue-dim);}
      .ac-btn-ghost:disabled{opacity:0.4;cursor:not-allowed;}
      .ac-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(5,12,20,0.25);border-top-color:#050c14;animation:acSpin 0.7s linear infinite;flex-shrink:0;}
      @keyframes acSpin{to{transform:rotate(360deg);}}
      .ac-info-grid{margin-top:28px;padding-top:22px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:0;}
      .ac-info-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(99,179,237,0.06);font-family:var(--mono);font-size:10px;letter-spacing:0.08em;}
      .ac-info-row:last-child{border-bottom:none;}
      .ac-info-key{color:var(--muted);}.ac-info-val{color:var(--text);}.ac-info-val.ok{color:var(--green);}.ac-info-val.warn{color:var(--amber);}.ac-info-val.err{color:var(--red);}
      .ac-card-footer{margin-top:24px;padding-top:18px;border-top:1px solid var(--border);font-family:var(--mono);font-size:10px;letter-spacing:0.1em;color:var(--muted);text-align:center;text-transform:uppercase;line-height:1.9;}
      .ac-link{color:var(--blue);cursor:pointer;}.ac-link:hover{text-decoration:underline;}
      @keyframes acSlideLeft{from{opacity:0;transform:translateX(-24px);}to{opacity:1;transform:translateX(0);}}
      @keyframes acSlideRight{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
      @media(max-width:860px){.ac-root{grid-template-columns:1fr;}.ac-left{padding:48px 32px 36px;border-right:none;border-bottom:1px solid var(--border);}.ac-right{padding:40px 24px 56px;}.ac-headline{font-size:52px;}}
    `;
    document.head.appendChild(style);
  }, []);

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

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractData.abi,
        signer
      );

      const method = CONTRACT_METHODS[selected as keyof typeof CONTRACT_METHODS];
      setStatusMsg(`Sending registration transaction as ${ROLES.find(r => r.id === selected)?.label}…`);

      const tx = await contract[method]();
      setStatusMsg("Transaction submitted. Awaiting confirmation…");
      await tx.wait();

      setStatusState("ok");
      setStatusMsg(`Successfully registered as ${ROLES.find(r => r.id === selected)?.label}! Redirecting to login…`);

      setTimeout(() => navigate("/"), 2000);

    } catch (error: any) {
      console.error(error);
      setStatusState("err");
      if (error?.code === 4001) {
        setStatusMsg("Transaction rejected by user.");
      } else if (error?.reason) {
        setStatusMsg(`Contract error: ${error.reason}`);
      } else {
        setStatusMsg("Registration failed. You may already be registered.");
      }
    } finally {
      setLoading(false);
    }
  };

  const dotClass = { idle:"idle", loading:"spin", ok:"ok", warn:"warn", err:"err" }[statusState];
  const truncate = (a: string) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "";

  const HeartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#63b3ed" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );

  return (
    <>
      <div className="ac-grid-bg" />
      <div className="ac-orb ac-orb-1" />
      <div className="ac-orb ac-orb-2" />

      <div className="ac-root">
        {/* ── Left panel ── */}
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
              ["amber", "Admin can deactivate providers, never patients"],
              ["green", "All actions are publicly auditable on Sepolia"],
            ].map(([color, text], i) => (
              <div className="ac-feat" key={i}>
                <span className={`ac-feat-dot ac-feat-dot-${color}`} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="ac-right">
          <div className="ac-card">
            <div className="ac-card-eyebrow">
              <span>Registration</span>
              <div className="ac-card-eyebrow-line" />
            </div>

            <div className="ac-card-title">Create Account</div>
            <div className="ac-card-desc">
              Select your role, then connect your MetaMask wallet on Sepolia to register on-chain.
            </div>

            {/* Error Alert for Unregistered Users */}
            {hasError && (
              <div style={{
                padding: "14px 16px",
                marginBottom: "20px",
                borderRadius: "12px",
                border: "1px solid rgba(252,129,129,0.35)",
                background: "rgba(252,129,129,0.07)",
                display: "flex",
                alignItems: "start",
                gap: "12px"
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fc8181" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20"
                  style={{ flexShrink: 0, marginTop: "2px" }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#991b1b",
                    marginBottom: "4px"
                  }}>
                    Account Not Registered
                  </p>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px",
                    color: "#7f1d1d",
                    lineHeight: "1.6"
                  }}>
                    Your wallet is not registered on ArogyaChain. Please select a role below and complete registration to access the platform.
                  </p>
                </div>
              </div>
            )}

            {/* Role selector */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"22px" }}>
              {ROLES.map((role) => {
                const isActive = selected === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => !loading && setSelected(role.id)}
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      border: `1px solid ${isActive ? "rgba(99,179,237,0.5)" : "rgba(99,179,237,0.14)"}`,
                      background: isActive ? "rgba(99,179,237,0.10)" : "rgba(99,179,237,0.03)",
                      cursor: loading ? "not-allowed" : "pointer",
                      textAlign: "left",
                      transition: "all 0.18s ease",
                      opacity: loading ? 0.6 : 1,
                      boxShadow: isActive ? "0 0 16px rgba(99,179,237,0.12)" : "none",
                    }}
                  >
                    {/* dot indicator */}
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: isActive
                        ? { blue:"#63b3ed", teal:"#4fd1c5", amber:"#f6ad55", green:"#68d391" }[role.dot]
                        : "rgba(232,241,251,0.2)",
                      boxShadow: isActive
                        ? `0 0 8px ${{ blue:"#63b3ed", teal:"#4fd1c5", amber:"#f6ad55", green:"#68d391" }[role.dot]}`
                        : "none",
                      transition: "all 0.18s ease",
                    }} />
                    {/* icon */}
                    <span style={{
                      color: isActive ? "#63b3ed" : "rgba(232,241,251,0.35)",
                      transition: "color 0.18s ease",
                      display: "flex", alignItems: "center",
                    }}>
                      {role.icon}
                    </span>
                    {/* text */}
                    <span style={{ flex: 1 }}>
                      <span style={{
                        display: "block",
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 13, fontWeight: 700,
                        color: isActive ? "#e8f1fb" : "rgba(232,241,251,0.5)",
                        letterSpacing: "0.04em",
                        transition: "color 0.18s ease",
                      }}>
                        {role.label}
                      </span>
                      <span style={{
                        display: "block",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, letterSpacing: "0.06em",
                        color: "rgba(232,241,251,0.35)",
                        marginTop: 2,
                      }}>
                        {role.desc}
                      </span>
                    </span>
                    {/* check */}
                    {isActive && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#63b3ed"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        width="14" height="14" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status */}
            <div className={`ac-status st-${statusState}`}>
              <span className={`ac-status-dot ${dotClass}`} />
              <div className="ac-status-body">
                {statusMsg}
                {address && <span className="ac-status-addr">{truncate(address)}</span>}
              </div>
            </div>

            {/* CTA */}
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
                  Register as {ROLES.find(r => r.id === selected)?.label}
                </>
              )}
            </button>

            {networkOk === false && (
              <button className="ac-btn ac-btn-ghost" onClick={switchToSepolia} disabled={loading}>
                Switch to Sepolia Testnet
              </button>
            )}

            {/* Info */}
            <div className="ac-info-grid">
              <div className="ac-info-row">
                <span className="ac-info-key">SELECTED ROLE</span>
                <span className="ac-info-val">{ROLES.find(r => r.id === selected)?.label}</span>
              </div>
              <div className="ac-info-row">
                <span className="ac-info-key">NETWORK</span>
                <span className={`ac-info-val ${networkOk === true ? "ok" : networkOk === false ? "err" : ""}`}>
                  {networkOk === true ? "Sepolia ✓" : networkOk === false ? "Wrong Network" : "—"}
                </span>
              </div>
              <div className="ac-info-row">
                <span className="ac-info-key">CONTRACT</span>
                <span className="ac-info-val">{CONTRACT_ADDRESS.slice(0,10)}…</span>
              </div>
            </div>

            <div className="ac-card-footer">
              Already registered?{" "}
              <span className="ac-link" onClick={() => navigate("/")}>Sign in here</span>
              <br />
              One registration per wallet · Immutable on Sepolia
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
