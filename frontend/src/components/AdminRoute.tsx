import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { account, isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!account || !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminRoute;