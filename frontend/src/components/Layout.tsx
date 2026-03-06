import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatAddress } from "../utils/helpers";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <header style={{
        background: "#0f1623",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px" }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "40px", height: "40px",
              border: "2px solid rgba(0,170,255,0.5)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#00aaff",
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800, fontSize: "1rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#ffffff", margin: 0 }}>
                ArogyaChain
              </p>
              <p style={{ fontSize: "0.65rem", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
                {title}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", margin: 0, fontFamily: "Courier New, monospace" }}>
                {formatAddress(account || "")}
              </p>
              <p style={{ fontSize: "0.65rem", color: "#22c55e", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                ● Connected
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "rgba(239,68,68,0.1)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        {children}
      </main>

    </div>
  );
}