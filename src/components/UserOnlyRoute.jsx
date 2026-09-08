import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UserOnlyRoute() {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isAdmin) return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
