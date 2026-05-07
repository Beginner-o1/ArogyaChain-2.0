import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const { account } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = Math.ceil(canvas.width / 60);
      const rows = Math.ceil(canvas.height / 60);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * 60;
          const y = j * 60;
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );
          const wave = Math.sin(dist / 80 - frame / 40) * 0.5 + 0.5;
          const alpha = wave * 0.12;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 170, 255, ${alpha})`;
          ctx.fill();
        }
      }
      frame++;
      animId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div style={{
      background: "#05070a",
      color: "#f1f5f9",
      fontFamily: "'DM Sans', sans-serif",
      overflowX: "hidden",
      minHeight: "100vh",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(0,170,255,0.3); box-shadow: 0 0 0 rgba(0,170,255,0); }
          50%       { border-color: rgba(0,170,255,0.7); box-shadow: 0 0 20px rgba(0,170,255,0.15); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .fade-up { animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.25s; }
        .fade-up-3 { animation-delay: 0.4s; }
        .fade-up-4 { animation-delay: 0.55s; }
        .fade-up-5 { animation-delay: 0.7s; }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(3rem, 8vw, 7rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
        }

        .shimmer-text {
          background: linear-gradient(90deg, #00aaff, #00e5ff, #ffffff, #00aaff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .mono { font-family: 'DM Mono', monospace; }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 36px;
          background: #00aaff;
          color: #000;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.2);
          transform: translateX(-100%);
          transition: transform 0.3s;
        }
        .btn-primary:hover::before { transform: translateX(0); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,170,255,0.35); }

        .btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 15px 36px;
          background: transparent;
          color: #94a3b8;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-outline:hover {
          color: #fff;
          border-color: rgba(0,170,255,0.4);
          background: rgba(0,170,255,0.05);
        }

        .feature-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 2px;
          padding: 36px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, #00aaff, transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }
        .feature-card:hover::before { transform: translateX(100%); }
        .feature-card:hover {
          background: rgba(0,170,255,0.04);
          border-color: rgba(0,170,255,0.18);
          transform: translateY(-4px);
        }

        .stat-block {
          border-left: 1px solid rgba(0,170,255,0.3);
          padding-left: 28px;
          animation: borderGlow 3s ease-in-out infinite;
        }

        .scanline {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,170,255,0.4), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 9999;
        }

        .noise {
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
          opacity: 0.4;
        }

        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #00aaff;
          opacity: 0.8;
        }

        .divider {
          width: 40px;
          height: 1px;
          background: #00aaff;
          opacity: 0.4;
        }

        .floating-card {
          animation: float 6s ease-in-out infinite;
        }

        .nav-link {
          font-size: 0.85rem;
          color: #64748b;
          text-decoration: none;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }

        .glow-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e, 0 0 20px #22c55e;
          animation: pulse 2s infinite;
        }

        .hex-badge {
          width: 48px; height: 48px;
          background: rgba(0,170,255,0.1);
          border: 1px solid rgba(0,170,255,0.25);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .contract-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 10px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s;
        }
        .contract-chip:hover {
          border-color: rgba(0,170,255,0.3);
          color: #94a3b8;
        }

        /* Nav auth buttons */
        .nav-signin,
        .nav-signup {
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 9px 20px;
          background: #00aaff;
          color: #000;
          border: 1px solid #00aaff;
          border-radius: 4px;
          font-weight: 700;
          transition: all 0.2s;
        }
        .nav-signin:hover,
        .nav-signup:hover {
          background: #22bbff;
          box-shadow: 0 4px 20px rgba(0,170,255,0.3);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .hero-title { font-size: clamp(2.5rem, 12vw, 4rem); }
          .hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-row { flex-direction: column !important; gap: 28px !important; }
          .roles-row { flex-wrap: wrap !important; }
          .nav-links { display: none !important; }
          .protocol-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="scanline" />
      <div className="noise" />

      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 0,
        opacity: mounted ? 1 : 0,
        transition: "opacity 1s"
      }} />

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100,
        padding: "20px 5%",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrollY > 40 ? "rgba(5,7,10,0.85)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(20px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.05)" : "none",
        transition: "all 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34,
            background: "linear-gradient(135deg, #00aaff, #0055ff)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(0,170,255,0.4)",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M8 5V11M5 6.5L8 5L11 6.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: "1.15rem",
            letterSpacing: "0.05em"
          }}>
            AROGYA<span style={{ color: "#00aaff" }}>CHAIN</span>
          </span>
        </div>

        {/* Center links */}
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#roles"    className="nav-link">Roles</a>
          <a href="#protocol" className="nav-link">Protocol</a>
        </div>

        {/* Auth buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {account ? (
            // If already connected show wallet address
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="glow-dot" />
              <span className="mono" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
            <>
              <Link to="/login"  className="nav-signin">Sign In</Link>
              <Link to="/signup" className="nav-signup">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        padding: "120px 5% 80px",
        position: "relative", zIndex: 2,
      }}>
        <div className={`fade-up fade-up-1`}
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div className="glow-dot" />
          <span className="section-label">Decentralized Health Infrastructure</span>
          <div style={{ flex: 1, maxWidth: 60, height: 1, background: "rgba(0,170,255,0.3)" }} />
        </div>

        <div className="hero-grid fade-up fade-up-2" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}>
          {/* Left */}
          <div>
            <h1 className="hero-title" style={{ marginBottom: 32 }}>
              <span style={{ color: "#f1f5f9" }}>YOUR HEALTH</span>
              <br />
              <span style={{ color: "#f1f5f9" }}>DATA.</span>
              <br />
              <span className="shimmer-text">YOUR CHAIN.</span>
            </h1>

            <p style={{
              fontSize: "1.1rem", lineHeight: 1.7,
              color: "#64748b", maxWidth: 460,
              marginBottom: 48,
            }}>
              ArogyaChain puts patients in sovereign control of their medical records.
              Built on Ethereum — permissioned, auditable, and unstoppable.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 48 }}>
              <Link to="/signup" className="btn-primary">
                Get Started
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Link>
              
              <a href="https://sepolia.etherscan.io/address/0x0E46E42E6eAf8Af9584AcD7A8db4c4f8B5Be738a"
                target="_blank" rel="noopener noreferrer"
                className="btn-outline"
              >
                View Contract ↗
              </a>
            </div>  

            
              <a href="https://sepolia.etherscan.io/address/0x0E46E42E6eAf8Af9584AcD7A8db4c4f8B5Be738a"
                target="_blank" rel="noopener noreferrer"
                className="contract-chip"
              >
                <span style={{ color: "#00aaff", fontSize: "0.65rem" }}>◆</span>
                Sepolia Testnet
                <span style={{ opacity: 0.3 }}>|</span>
                0x0E46...738a
                <span style={{ opacity: 0.3 }}>|</span>
                Verified ✓
              </a>
          </div>

          {/* Right — terminal card */}
          <div className="floating-card" style={{ position: "relative" }}>
            <div style={{
              position: "absolute",
              width: 300, height: 300,
              background: "radial-gradient(circle, rgba(0,170,255,0.12) 0%, transparent 70%)",
              top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }} />
            <div style={{
              background: "rgba(13,17,28,0.9)",
              border: "1px solid rgba(0,170,255,0.15)",
              borderRadius: 8,
              padding: "32px",
              backdropFilter: "blur(20px)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 24, paddingBottom: 16,
                borderBottom: "1px solid rgba(255,255,255,0.05)"
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.7 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.7 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.7 }} />
                <span className="mono" style={{ fontSize: "0.7rem", color: "#334155", marginLeft: 8 }}>
                  arogya_protocol.sol
                </span>
              </div>
              {[
                { label: "PATIENT", value: "0x7f3a...b21c", color: "#7dd3fc", status: "OWNER" },
                { label: "RECORD",  value: "ChestXRay_2026", color: "#86efac", status: "IPFS ✓" },
                { label: "ACCESS",  value: "Dr. Mehta → 48h", color: "#fcd34d", status: "ACTIVE" },
                { label: "HASH",    value: "0xd8f2...a09e", color: "#c084fc", status: "ON-CHAIN" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: "0.65rem", color: "#334155", width: 56 }}>{row.label}</span>
                    <span className="mono" style={{ fontSize: "0.78rem", color: row.color }}>{row.value}</span>
                  </div>
                  <span style={{
                    fontSize: "0.6rem", color: "#22c55e",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    padding: "3px 8px", borderRadius: 100,
                    fontFamily: "'DM Mono', monospace",
                  }}>{row.status}</span>
                </div>
              ))}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: "0.65rem", color: "#334155" }}>BLOCK CONFIRMATIONS</span>
                  <span className="mono" style={{ fontSize: "0.65rem", color: "#00aaff" }}>12 / 12</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #0055ff, #00aaff)", borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up fade-up-5 stats-row" style={{
          display: "flex", gap: 60, marginTop: 80,
          paddingTop: 48, borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {[
            { n: "10K+",  l: "Records Secured" },
            { n: "500+",  l: "Healthcare Providers" },
            { n: "99.9%", l: "Uptime" },
            { n: "1hr",   l: "Emergency Access Window" },
          ].map((s, i) => (
            <div key={i} className="stat-block">
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800, fontSize: "2rem",
                color: "#f1f5f9", lineHeight: 1, marginBottom: 6,
              }}>{s.n}</div>
              <div style={{ fontSize: "0.78rem", color: "#475569" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{
        padding: "120px 5%", position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 72, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="divider" />
                <span className="section-label">Core Protocol</span>
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800, fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "-0.02em", lineHeight: 1.1, color: "#f1f5f9",
              }}>
                Built for<br /><span style={{ color: "#00aaff" }}>Healthcare Security</span>
              </h2>
            </div>
            <p style={{ maxWidth: 380, color: "#475569", lineHeight: 1.8, fontSize: "0.95rem", paddingTop: 8 }}>
              Every component is purpose-built for the high-stakes demands of medical data management.
            </p>
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {[
              { icon: "🔐", title: "Sovereign Access Control",  tag: "Patient-Owned", desc: "Patients hold cryptographic keys to their own records. No institution can access data without explicit on-chain permission." },
              { icon: "🏥", title: "IPFS Medical Storage",      tag: "Immutable",     desc: "X-rays, MRIs, lab reports stored on distributed IPFS via Pinata. Content-addressed and immutable forever." },
              { icon: "🚨", title: "Emergency Protocol",        tag: "Time-Limited",  desc: "Doctors activate time-boxed emergency access. 1-hour window, fully logged on-chain with block timestamp." },
              { icon: "📡", title: "Multi-Role System",         tag: "Role-Based",    desc: "Five distinct roles — Patient, Doctor, Pharmacy, Scan Center, Admin — each with scoped contract-level permissions." },
              { icon: "🔍", title: "Transparent Audit Log",     tag: "On-Chain Logs", desc: "Every record view, access grant, and permission change emits a blockchain event. Complete auditability." },
              { icon: "📱", title: "QR Wallet Sharing",         tag: "Frictionless",  desc: "Share patient wallet addresses and record IDs via QR codes for instant, secure handoff between patient and provider." },
            ].map((f, i) => (
              <div key={i} className="feature-card" style={{ borderRadius: 0 }}>
                <div className="hex-badge" style={{ marginBottom: 20 }}>{f.icon}</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#00aaff", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>{f.tag}</div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#f1f5f9", marginBottom: 12 }}>{f.title}</h3>
                <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{
        padding: "120px 5%", background: "rgba(0,0,0,0.3)",
        position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
              <div className="divider" />
              <span className="section-label">Participants</span>
              <div className="divider" />
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em", color: "#f1f5f9",
            }}>One Protocol.<br />Five Roles.</h2>
          </div>

          <div className="roles-row" style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {[
              { emoji: "🧑‍⚕️", role: "Patient",    color: "#00aaff", desc: "Owns all records. Grants and revokes access. Uploads health profile." },
              { emoji: "👨‍⚕️", role: "Doctor",     color: "#22c55e", desc: "Uploads medical records. Requests emergency access when critical." },
              { emoji: "💊",   role: "Pharmacy",   color: "#f59e0b", desc: "Views prescriptions for authorized patient records only." },
              { emoji: "🔬",   role: "Scan Center", color: "#a78bfa", desc: "Uploads X-rays, MRIs, CT scans. Writes imaging records on-chain." },
              { emoji: "🛡️",  role: "Admin",       color: "#f87171", desc: "Manages provider registrations. Deactivates bad actors." },
            ].map((r, i) => (
              <div key={i} style={{
                flex: "1 1 180px", maxWidth: 220,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${r.color}22`,
                borderRadius: 4, padding: "28px 20px", textAlign: "center",
                transition: "all 0.3s", cursor: "default",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = `${r.color}08`;
                el.style.borderColor = `${r.color}44`;
                el.style.transform = "translateY(-6px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "rgba(255,255,255,0.02)";
                el.style.borderColor = `${r.color}22`;
                el.style.transform = "translateY(0)";
              }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>{r.emoji}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: r.color, marginBottom: 10 }}>{r.role}</div>
                <p style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.6 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROTOCOL ── */}
      <section id="protocol" style={{
        padding: "120px 5%", position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="protocol-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div className="divider" />
              <span className="section-label">Tech Stack</span>
            </div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)", letterSpacing: "-0.02em",
              lineHeight: 1.15, color: "#f1f5f9", marginBottom: 24,
            }}>Infrastructure Built<br />to Last Forever</h2>
            <p style={{ color: "#475569", lineHeight: 1.8, marginBottom: 40, fontSize: "0.95rem" }}>
              Deployed on Sepolia testnet. Smart contracts in Solidity, auditable by anyone.
              Medical files stored on IPFS. Frontend in React + TypeScript with MetaMask integration.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Smart Contract", value: "Solidity ^0.8.28 + OpenZeppelin" },
                { label: "Storage",        value: "IPFS via Pinata API" },
                { label: "Network",        value: "Sepolia Testnet (Ethereum)" },
                { label: "Frontend",       value: "React 19 + TypeScript + Vite" },
                { label: "Auth",           value: "MetaMask + ethers.js v6" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", gap: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span className="mono" style={{ fontSize: "0.72rem", color: "#334155", width: 120, flexShrink: 0, paddingTop: 1 }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", width: 280, height: 280,
              background: "radial-gradient(circle, rgba(0,170,255,0.08) 0%, transparent 70%)",
              top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: 260, height: 260,
              border: "1px dashed rgba(0,170,255,0.15)", borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              animation: "rotateSlow 20s linear infinite",
            }}>
              {[0, 72, 144, 216, 288].map((deg, i) => (
                <div key={i} style={{
                  position: "absolute", width: 10, height: 10,
                  background: "#00aaff", borderRadius: "50%",
                  top: "50%", left: "50%",
                  transform: `rotate(${deg}deg) translate(130px) translate(-50%, -50%)`,
                  opacity: 0.6, boxShadow: "0 0 8px #00aaff",
                }} />
              ))}
            </div>
            <div style={{
              position: "relative",
              background: "rgba(13,17,28,0.95)",
              border: "1px solid rgba(0,170,255,0.2)",
              borderRadius: 8, padding: "40px", textAlign: "center",
            }}>
              <div style={{
                width: 64, height: 64,
                background: "linear-gradient(135deg, #00aaff, #0055ff)",
                borderRadius: 16, display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 20px",
                boxShadow: "0 0 30px rgba(0,170,255,0.3)", fontSize: "1.8rem",
              }}>🔗</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "#f1f5f9", marginBottom: 8 }}>ArogyaChain Contract</div>
              <div className="mono" style={{ fontSize: "0.7rem", color: "#334155", marginBottom: 20 }}>DecentralizedEHR.sol</div>
              <a href="https://sepolia.etherscan.io/address/0x0E46E42E6eAf8Af9584AcD7A8db4c4f8B5Be738a"
                target="_blank" rel="noopener noreferrer" className="contract-chip" style={{ fontSize: "0.68rem" }}>
                0x0E46E42E6eAf8Af9584AcD7A8db4c4f8B5Be738a ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: "120px 5%", background: "rgba(0,0,0,0.4)",
        position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.04)", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", width: 600, height: 300,
          background: "radial-gradient(ellipse, rgba(0,170,255,0.07) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none",
        }} />
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
            <div className="divider" />
            <span className="section-label">Get Started</span>
            <div className="divider" />
          </div>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: "clamp(2.2rem, 5vw, 4rem)", letterSpacing: "-0.03em",
            lineHeight: 1.05, color: "#f1f5f9", marginBottom: 24,
          }}>
            Take Control of<br /><span className="shimmer-text">Your Medical Data</span>
          </h2>
          <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.8, marginBottom: 48 }}>
            Connect your MetaMask wallet and register in under 60 seconds.
            No central server. No data broker. Just you and the blockchain.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "18px 44px" }}>
              Create Account
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9H15M11 5L15 9L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Link>
            <Link to="/login" className="btn-primary" style={{ fontSize: "1rem", padding: "17px 44px" }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: "40px 5%",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        position: "relative", zIndex: 2,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 20,
      }}>
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #00aaff, #0055ff)",
              borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.05em" }}>
              AROGYA<span style={{ color: "#00aaff" }}>CHAIN</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#roles"    className="nav-link">Roles</a>
            <a href="#protocol" className="nav-link">Protocol</a>
          </div>
          <span className="mono" style={{ fontSize: "0.7rem", color: "#1e293b" }}>
            © 2026 ArogyaChain • ISC License
          </span>
        </>
      </footer>
    </div>
  );
}