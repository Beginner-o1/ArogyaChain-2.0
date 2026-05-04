import React, { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatAddress } from "../utils/helpers";
import NotificationBell from "./patient/NotificationBell";

interface LayoutProps {
  children: ReactNode;
  title: string;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
}

export default function Layout({ children, title, activeTab, setActiveTab }: LayoutProps) {
  const { account, logout, contract } = useAuth();
  const navigate = useNavigate();

  const isPatient = activeTab !== undefined && setActiveTab !== undefined;

  const menuItems = [
    { id: "records", label: "Record Ledger",    icon: "📋" },
    { id: "grant",   label: "Access Control",   icon: "🔑" },
    { id: "view",    label: "Permissions",      icon: "🛡️" },
    { id: "profile", label: "Patient Identity", icon: "👤" },
  ];

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#05070a",
      color: "#f1f5f9",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ── CSS Injection ── */}
      <style>{`
        .nav-item { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .nav-item:hover { background: rgba(255, 255, 255, 0.04) !important; color: #fff !important; }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.15) !important; border-color: #ef4444 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .content-animate { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      {/* ── Fixed Sidebar (always visible) ── */}
      <aside style={{
        width: "280px",
        background: "rgba(13, 17, 28, 0.8)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        height: "100vh",
        zIndex: 100
      }}>

        {/* Branding */}
        <div style={{ padding: "2.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #00aaff 0%, #0066ff 100%)",
              borderRadius: "8px",
              boxShadow: "0 0 15px rgba(0, 170, 255, 0.3)"
            }} />
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1.4rem",
              letterSpacing: "0.1em",
              fontWeight: 800,
              margin: 0
            }}>
              AROGYA<span style={{ color: "#00aaff" }}>CHAIN</span>
            </h1>
          </div>
          <p style={{
            fontSize: "0.6rem",
            color: "#475569",
            marginTop: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.2em"
          }}>
            Web3 Medical Protocol
          </p>
        </div>

        {/* Nav Links — Patient dashboard only */}
        {isPatient && (
          <nav style={{ flex: 1, padding: "2rem 1rem" }}>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {menuItems.map((item) => (
                <li
                  key={item.id}
                  className="nav-item"
                  onClick={() => setActiveTab!(item.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    background: activeTab === item.id
                      ? "rgba(0, 170, 255, 0.08)"
                      : "transparent",
                    border: "1px solid",
                    borderColor: activeTab === item.id
                      ? "rgba(0, 170, 255, 0.2)"
                      : "transparent",
                    color: activeTab === item.id ? "#00aaff" : "#94a3b8",
                    fontWeight: activeTab === item.id ? 600 : 400,
                    fontSize: "0.9rem",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Spacer for non-patient dashboards so logout stays at bottom */}
        {!isPatient && <div style={{ flex: 1 }} />}

        {/* User / Logout */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
          <div style={{
            padding: "1rem",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            marginBottom: "1rem"
          }}>
            <p style={{
              fontSize: "0.6rem",
              color: "#64748b",
              marginBottom: "4px",
              textTransform: "uppercase",
              fontWeight: 700
            }}>
              Active Node
            </p>
            <p style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.75rem",
              color: "#e2e8f0",
              margin: 0
            }}>
              {formatAddress(account || "")}
            </p>
          </div>

          <button
            onClick={logout}
            className="logout-btn"
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              transition: "all 0.2s"
            }}
          >
            End Session
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        marginLeft: "280px",
        flex: 1,
        display: "flex",
        flexDirection: "column"
      }}>

        {/* Header */}
        <header style={{
          padding: "1.5rem 3rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(5, 7, 10, 0.7)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 90,
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          <div>
            <h2 style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em"
            }}>
              {title}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e"
              }} />
              <span style={{
                fontSize: "0.65rem",
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.05em"
              }}>
                Network Synchronized
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <NotificationBell contract={contract} account={account ?? ""} />
            <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                  Verified User
                </p>
                <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0 }}>
                  Patient Portal v2.0
                </p>
              </div>
              <div style={{
                width: "40px", height: "40px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "1.2rem"
              }}>
                👤
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <section className="content-animate" style={{ padding: "3rem", flex: 1 }}>
          {children}
        </section>

        {/* Footer */}
        <footer style={{
          padding: "2rem 3rem",
          borderTop: "1px solid rgba(255,255,255,0.03)",
          textAlign: "center",
          fontSize: "0.7rem",
          color: "#334155",
          letterSpacing: "0.1em",
          textTransform: "uppercase"
        }}>
          ArogyaChain Infrastructure • Powered by Ethereum Smart Contracts • 2026
        </footer>

      </main>
    </div>
  );
}