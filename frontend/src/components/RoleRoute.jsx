import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={user.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard"} replace />;
  return children;
}
