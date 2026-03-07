import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styling/Login.css";

const Login = () => {
  const { connectWallet, role, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!role) return;
    if (isAdmin) { navigate("/admin"); return; }
    switch (role) {
      case "doctor":       navigate("/doctor-dashboard");   break;
      case "patient":      navigate("/patient-dashboard");  break;
      case "pharmacy":     navigate("/pharmacy-dashboard"); break;
      case "scan":         navigate("/scan-dashboard");     break;
      case "unregistered": navigate("/signup");             break;
    }
  }, [role, isAdmin, navigate]);

  return (
    <div className="login-root">
      {/* Left hero */}
      <div className="login-hero">
        <div className="login-brand">
          <div className="login-brand-icon">♥</div>
          <div>
            <span className="login-brand-name">ArogyaChain</span>
            <span className="login-brand-tagline">Decentralized Health Records</span>
          </div>
        </div>

        <h1 className="login-headline">
          SIGN IN TO<br />THE <span>NETWORK.</span>
        </h1>

        <p className="login-sub">
          Connect your MetaMask wallet to access your decentralized health
          records — no passwords, no central authority.
        </p>

        <ul className="login-features">
          <li>One-time on-chain registration per wallet</li>
          <li>Role enforced at the contract level — not the UI</li>
          <li>Admin can deactivate providers, never patients</li>
          <li>All actions are publicly auditable on Sepolia</li>
        </ul>
      </div>

      {/* Right card */}
      <div className="login-panel">
        <p className="login-label">Authentication</p>
        <h2 className="login-title">WELCOME<br />BACK.</h2>
        <p className="login-description">
          Connect your MetaMask wallet on Sepolia to sign in to your account.
        </p>

        <button
          onClick={connectWallet}
          disabled={loading}
          className="login-connect-btn"
        >
          {loading ? <span className="login-spinner" /> : "⬡"}
          {loading ? "Connecting..." : "Sign In Here"}
        </button>

        <div className="login-notice">
          <span className="login-notice-dot" />
          Make sure MetaMask is installed and connected to the Sepolia testnet.
        </div>

        <div className="login-footer">
          Not registered yet?{" "}
          <a href="/signup">Sign Up Here</a>
        </div>
      </div>
    </div>
  );
};

export default Login;