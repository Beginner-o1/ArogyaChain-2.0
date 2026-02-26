import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { connectWallet, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!role) return;

    switch (role) {
      case "doctor":
        navigate("/doctor-dashboard");
        break;
      case "patient":
        navigate("/patient-dashboard");
        break;
      case "pharmacy":
        navigate("/pharmacy-dashboard");
        break;
      case "scan":
        navigate("/scan-dashboard");
        break;
      case "inactive-doctor":
      case "inactive-pharmacy":
      case "inactive-scan":
        alert("Your account is inactive. Contact admin.");
        break;
      case "unregistered":
        navigate("/signup");
        break;
    }
  }, [role, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2 text-blue-700">
          Arogya Chain
        </h1>
        <p className="text-gray-600 mb-8">Decentralized Electronic Health Records</p>

        <button
          onClick={connectWallet}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {loading ? "Connecting..." : "Sign In Here"}
        </button>

        <p className="mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline font-semibold">
            Sign Up
          </a>
        </p>

        <div className="mt-8 text-xs text-gray-500">
          <p>Make sure MetaMask is installed and connected to Sepolia testnet</p>
        </div>
      </div>
    </div>
  );
};

export default Login;